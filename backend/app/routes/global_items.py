"""
routes/global_items.py — REST API for the Dedicated Global Item Database.

Manages the master catalog of items stored in the dedicated global item database.
Completely separate from any user transaction or tenant databases.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List

from ..core.global_item_db import get_global_items_db
from ..models.global_item import GlobalItem
from ..schemas.global_item import (
    GlobalItemCreate,
    GlobalItemUpdate,
    GlobalItemResponse,
    GlobalItemListResponse,
    GlobalItemBulkCreate,
)

router = APIRouter(prefix="/global-items", tags=["Global Items"])


@router.get("", response_model=GlobalItemListResponse)
def list_global_items(
    search: Optional[str] = Query(None, description="Search by name, regional name, brand, or barcode"),
    category: Optional[str] = Query(None, description="Filter by category"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    unit_family: Optional[str] = Query(None, description="mass | volume | count"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("name", description="name | price | category | created_at"),
    order: str = Query("asc", description="asc | desc"),
    db: Session = Depends(get_global_items_db),
):
    """List global items with search, category filtering, and pagination."""
    query = db.query(GlobalItem)

    if category:
        query = query.filter(GlobalItem.category.ilike(f"%{category.strip()}%"))

    if brand:
        query = query.filter(GlobalItem.brand.ilike(f"%{brand.strip()}%"))

    if unit_family:
        query = query.filter(GlobalItem.unit_family == unit_family.strip().lower())

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                GlobalItem.name.ilike(term),
                GlobalItem.hindi_name.ilike(term),
                GlobalItem.bengali_name.ilike(term),
                GlobalItem.brand.ilike(term),
                GlobalItem.barcode.ilike(term),
                GlobalItem.aliases.ilike(term),
                GlobalItem.category.ilike(term),
            )
        )

    total = query.count()

    # Sorting
    sort_attr = getattr(GlobalItem, sort_by, GlobalItem.name)
    if order.lower() == "desc":
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/categories")
def get_global_categories(db: Session = Depends(get_global_items_db)):
    """Returns all unique item categories and their count in the global database."""
    results = (
        db.query(GlobalItem.category, func.count(GlobalItem.id).label("count"))
        .group_by(GlobalItem.category)
        .order_by(func.count(GlobalItem.id).desc())
        .all()
    )
    return [{"category": r[0], "count": r[1]} for r in results]


@router.get("/{item_id}", response_model=GlobalItemResponse)
def get_global_item(item_id: int, db: Session = Depends(get_global_items_db)):
    """Fetch details of a specific global item by ID."""
    item = db.query(GlobalItem).filter(GlobalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Global item not found.")
    return item


@router.post("", response_model=GlobalItemResponse, status_code=status.HTTP_201_CREATED)
def create_global_item(
    payload: GlobalItemCreate,
    db: Session = Depends(get_global_items_db),
):
    """Input a new item into the dedicated Global Item Database."""
    # Check for existing item with exact canonical name
    existing = db.query(GlobalItem).filter(GlobalItem.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An item with the name '{payload.name.strip()}' already exists in the global database (ID #{existing.id}).",
        )

    new_item = GlobalItem(**payload.model_dump())
    new_item.name = new_item.name.strip()
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def bulk_create_global_items(
    payload: GlobalItemBulkCreate,
    db: Session = Depends(get_global_items_db),
):
    """Bulk input multiple item details into the global database."""
    inserted = []
    skipped = []

    for item_data in payload.items:
        clean_name = item_data.name.strip()
        existing = db.query(GlobalItem).filter(GlobalItem.name.ilike(clean_name)).first()
        if existing:
            skipped.append(clean_name)
            continue

        item = GlobalItem(**item_data.model_dump())
        item.name = clean_name
        db.add(item)
        inserted.append(clean_name)

    db.commit()
    return {
        "message": f"Successfully added {len(inserted)} items. Skipped {len(skipped)} existing duplicates.",
        "inserted_count": len(inserted),
        "skipped_count": len(skipped),
        "inserted": inserted,
        "skipped": skipped,
    }


@router.put("/{item_id}", response_model=GlobalItemResponse)
def update_global_item(
    item_id: int,
    payload: GlobalItemUpdate,
    db: Session = Depends(get_global_items_db),
):
    """Update details of an existing global item."""
    item = db.query(GlobalItem).filter(GlobalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Global item not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    if "name" in update_dict and update_dict["name"]:
        clean_name = update_dict["name"].strip()
        conflict = (
            db.query(GlobalItem)
            .filter(GlobalItem.name.ilike(clean_name), GlobalItem.id != item_id)
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=400,
                detail=f"Another item named '{clean_name}' already exists (ID #{conflict.id}).",
            )
        update_dict["name"] = clean_name

    for key, value in update_dict.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_global_item(item_id: int, db: Session = Depends(get_global_items_db)):
    """Delete an item from the global database."""
    item = db.query(GlobalItem).filter(GlobalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Global item not found.")

    name = item.name
    db.delete(item)
    db.commit()
    return {"message": f"Global item '{name}' (ID #{item_id}) deleted successfully."}

"""
routes/profile.py — User profile analytics.

GET /users/me/stats — returns spending DNA + active price alert count for current user.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_user_db
from ..models.user import User
from ..services.analytics_service import get_spending_dna, _active_price_alerts

router = APIRouter(prefix="/users", tags=["Profile"])


@router.get("/me/stats")
def profile_stats(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns:
      - spending_dna: list of {label, pct, color} by category for current_user
      - price_alerts_active: int count of items with rising prices for current_user
    """
    return {
        "spending_dna":         get_spending_dna(db, user_id=current_user.id),
        "price_alerts_active":  _active_price_alerts(db, user_id=current_user.id),
        "share_pricing_data":   bool(current_user.share_pricing_data),
    }


@router.patch("/me/share-pricing")
def update_share_pricing(
    req: dict,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    share = bool(req.get("share", False))
    current_user.share_pricing_data = share
    db.commit()
    db.refresh(current_user)
    return {"share_pricing_data": current_user.share_pricing_data}


# ── Friends & Tag System ──────────────────────────────────────────────────────

@router.get("/me/tag")
def get_my_tag(
    current_user: User = Depends(get_current_user),
):
    """Returns current user's unique 8-character Bazaar tag."""
    return {
        "tag": current_user.tag,
        "username": current_user.username,
        "email": current_user.email,
    }


@router.get("/search-tag")
def search_user_by_tag(
    tag: str,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Searches for another user by their 8-character tag (case-insensitive, trims #)."""
    clean_tag = tag.strip().upper().lstrip("#")
    if not clean_tag:
        from fastapi import HTTPException
        raise HTTPException(400, "Tag cannot be empty")

    user = db.query(User).filter(User.tag == clean_tag).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(404, f"No user found with tag #{clean_tag}")

    from ..models.friendship import Friendship
    is_friend = False
    if user.id != current_user.id:
        existing = db.query(Friendship).filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == user.id,
        ).first()
        is_friend = existing is not None

    return {
        "id": user.id,
        "username": user.username,
        "tag": user.tag,
        "is_self": user.id == current_user.id,
        "is_friend": is_friend,
    }


@router.get("/me/friends")
def list_friends(
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all confirmed friends for the current user."""
    from ..models.friendship import Friendship
    friendships = db.query(Friendship).filter(Friendship.user_id == current_user.id).all()
    results = []
    for f in friendships:
        if f.friend:
            results.append({
                "id": f.friend.id,
                "username": f.friend.username,
                "email": f.friend.email,
                "tag": f.friend.tag,
                "since": f.created_at,
            })
    return results


@router.post("/me/friends")
def add_friend(
    body: dict,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Adds a friend by tag or friend_id. Automatically creates bidirectional connection."""
    from fastapi import HTTPException
    from ..models.friendship import Friendship

    target_user: User | None = None
    if "tag" in body and body["tag"]:
        clean_tag = str(body["tag"]).strip().upper().lstrip("#")
        target_user = db.query(User).filter(User.tag == clean_tag).first()
    elif "friend_id" in body and body["friend_id"]:
        target_user = db.query(User).filter(User.id == int(body["friend_id"])).first()

    if not target_user:
        raise HTTPException(404, "User not found with the provided tag or ID")

    if target_user.id == current_user.id:
        raise HTTPException(400, "You cannot add yourself as a friend")

    # Check if already friends
    existing = db.query(Friendship).filter(
        Friendship.user_id == current_user.id,
        Friendship.friend_id == target_user.id,
    ).first()
    if existing:
        return {
            "message": f"Already friends with {target_user.username}",
            "friend": {
                "id": target_user.id,
                "username": target_user.username,
                "tag": target_user.tag,
            },
        }

    # Create mutual connection
    f1 = Friendship(user_id=current_user.id, friend_id=target_user.id, status="accepted")
    f2 = Friendship(user_id=target_user.id, friend_id=current_user.id, status="accepted")
    db.add(f1)
    db.add(f2)
    db.commit()

    return {
        "message": f"Successfully connected with {target_user.username}!",
        "friend": {
            "id": target_user.id,
            "username": target_user.username,
            "email": target_user.email,
            "tag": target_user.tag,
        },
    }


@router.delete("/me/friends/{friend_id}")
def remove_friend(
    friend_id: int,
    db: Session = Depends(get_user_db),
    current_user: User = Depends(get_current_user),
):
    """Removes a friend connection."""
    from ..models.friendship import Friendship
    db.query(Friendship).filter(
        (Friendship.user_id == current_user.id) & (Friendship.friend_id == friend_id)
        | (Friendship.user_id == friend_id) & (Friendship.friend_id == current_user.id)
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Friend removed successfully"}



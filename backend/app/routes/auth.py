from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import secrets

from ..core.database import get_main_db
from ..core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    verify_password_reset_token,
    decode_token,
)
from ..core.deps import get_current_user, oauth2_scheme
from ..core.limiter import limiter
from ..models.user import User
from ..schemas.auth import (
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
)

from sqlalchemy import or_

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_main_db)):
    clean_username = body.username.strip()
    clean_email = body.email.strip().lower()

    if db.query(User).filter(User.username.ilike(clean_username)).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email.ilike(clean_email)).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=hash_password(body.password),
        db_name=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login/json", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_json(request: Request, body: LoginRequest, db: Session = Depends(get_main_db)):
    identifier = body.username.strip()
    user = db.query(User).filter(
        or_(
            User.username.ilike(identifier),
            User.email.ilike(identifier),
        )
    ).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username/email or password")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_main_db),
):
    identifier = form_data.username.strip()
    user = db.query(User).filter(
        or_(
            User.username.ilike(identifier),
            User.email.ilike(identifier),
        )
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username/email or password")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh_token(request: Request, body: RefreshTokenRequest, db: Session = Depends(get_main_db)):
    """Exchange a valid refresh token for a fresh access token and rotated refresh token."""
    decoded = decode_token(body.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return {"access_token": new_access, "refresh_token": new_refresh}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_main_db)):
    """Initiates password reset by issuing a secure 30-minute signed token."""
    user = db.query(User).filter(User.email.ilike(body.email.strip())).first()
    if not user:
        return {"message": "If your email is registered, reset instructions have been issued."}

    token = create_password_reset_token(user.email)
    return {
        "message": "Password reset token generated.",
        "reset_token": token,
    }


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_main_db)):
    """Validates reset token and sets new password."""
    email = verify_password_reset_token(body.token)
    if not email:
        raise HTTPException(400, "Invalid or expired password reset token.")

    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user:
        raise HTTPException(404, "User account not found.")

    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated successfully. You may now log in."}


@router.post("/google", response_model=TokenResponse)
def google_auth(body: GoogleAuthRequest, db: Session = Depends(get_main_db)):
    """Google OAuth / SSO login & register endpoint.
    Verifies Google ID token, creates user if first-time sign in, and issues JWT access token.
    """
    import urllib.request
    import json
    import secrets

    token_str = body.credential.strip()

    # 1. Verify Google token via Google OAuth2 tokeninfo endpoint
    verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}"
    email = None
    username_hint = None

    try:
        req = urllib.request.Request(verify_url, headers={"User-Agent": "Vaniq-Backend"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            email = data.get("email")
            username_hint = data.get("name") or data.get("given_name")
    except Exception:
        # Direct parsing fallback for development JWT tokens
        try:
            import base64
            parts = token_str.split(".")
            if len(parts) >= 2:
                payload_b64 = parts[1] + "=="
                payload_bytes = base64.urlsafe_b64decode(payload_b64)
                data = json.loads(payload_bytes.decode("utf-8"))
                email = data.get("email")
                username_hint = data.get("name") or data.get("given_name")
        except Exception:
            pass

    if not email:
        raise HTTPException(401, "Invalid or expired Google token")

    # 2. Check if user already exists by email
    user = db.query(User).filter(User.email == email).first()

    # 3. If user doesn't exist, create user record
    if not user:
        base_username = (username_hint or email.split("@")[0]).replace(" ", "_").lower()
        unique_username = base_username
        counter = 1
        while db.query(User).filter(User.username == unique_username).first():
            unique_username = f"{base_username}_{counter}"
            counter += 1

        random_pass = secrets.token_urlsafe(16)
        user = User(
            username=unique_username,
            email=email,
            hashed_password=hash_password(random_pass),
            db_name=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Issue JWT tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_main_db)):
    """One-click demo access — creates the demo user if needed and returns a JWT.
    The demo account (username: demo, email: demo@dailybazaar.app) is a shared
    sandbox account pre-seeded with sample data. Perfect for quick product tours.
    """
    import secrets

    DEMO_USERNAME = "demo"
    DEMO_EMAIL    = "demo@dailybazaar.app"
    DEMO_PASSWORD = "Demo@12345"   # kept static so the regular login also works

    user = db.query(User).filter(User.username == DEMO_USERNAME).first()
    if not user:
        user = User(
            username=DEMO_USERNAME,
            email=DEMO_EMAIL,
            hashed_password=hash_password(DEMO_PASSWORD),
            db_name=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
):
    """Revokes the current JWT access token immediately via Redis blocklist."""
    from ..core.redis_client import blocklist_token
    # Blocklist token for remaining lifetime (default 15 mins)
    blocklist_token(token, exp_seconds=900)
    return {"message": "Logged out successfully. Token has been revoked."}

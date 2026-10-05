import re
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be between 3 and 30 characters.")
        if not re.match(r"^[a-zA-Z0-9_.-]+$", v):
            raise ValueError("Username may only contain letters, numbers, hyphens, dots, and underscores.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one numeric digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token or token string


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one numeric digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    db_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

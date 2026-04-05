"""Shared Pydantic schemas and validators used across routers."""
import re
from pydantic import BaseModel

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email_str(v: str) -> str:
    v = v.strip().lower()
    if not _EMAIL_RE.match(v):
        raise ValueError("Invalid email address")
    if len(v) > 254:
        raise ValueError("Email too long")
    return v


def validate_password_str(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(v) > 128:
        raise ValueError("Password too long")
    return v


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str | None
    is_admin: bool = False

    model_config = {"from_attributes": True}


class UserDetailOut(UserOut):
    """Extended user info for admin views."""
    created_at: str

    @classmethod
    def from_user(cls, user) -> "UserDetailOut":
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            is_admin=user.is_admin,
            created_at=user.created_at.isoformat() if user.created_at else "",
        )

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt as _bcrypt

from db.database import get_db
from db.crud import list_users, create_user, get_user_by_email, delete_user
from db.models import User
from auth.deps import get_current_user
from routers.schemas import validate_email_str, validate_password_str, UserDetailOut

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


class CreateUserRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return validate_email_str(v)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password_str(v)


@router.get("/users", response_model=list[UserDetailOut])
async def get_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    users = await list_users(db)
    return [UserDetailOut.from_user(u) for u in users]


@router.post("/users", response_model=UserDetailOut, status_code=status.HTTP_201_CREATED)
async def add_user(
    body: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    if await get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = _bcrypt.hashpw(body.password.encode(), _bcrypt.gensalt()).decode()
    user = await create_user(db, body.email, hashed, body.display_name)
    return UserDetailOut.from_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(_require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    if not await delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")

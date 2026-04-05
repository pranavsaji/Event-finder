import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import EventRow, User
from fetchers.models import Event

CACHE_TTL_MINUTES = int(os.getenv("CACHE_TTL_MINUTES", "30"))


# ---------------------------------------------------------------------------
# Events cache
# ---------------------------------------------------------------------------

async def get_cached_events(db: AsyncSession, cache_key: str) -> list[Event] | None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=CACHE_TTL_MINUTES)
    result = await db.execute(
        select(EventRow)
        .where(EventRow.cache_key == cache_key)
        .where(EventRow.fetched_at >= cutoff)
        .order_by(EventRow.start_date)
    )
    rows = result.scalars().all()
    if not rows:
        return None
    return [_row_to_event(row) for row in rows]


async def upsert_events(db: AsyncSession, events: list[Event], cache_key: str) -> None:
    await db.execute(delete(EventRow).where(EventRow.cache_key == cache_key))
    now = datetime.now(timezone.utc)
    for ev in events:
        row = EventRow(
            **{k: v for k, v in ev.model_dump().items()},
            cache_key=cache_key,
            fetched_at=now,
        )
        db.add(row)
    await db.commit()


def _row_to_event(row: EventRow) -> Event:
    return Event(
        id=row.id,
        title=row.title,
        description=row.description,
        start_date=row.start_date,
        end_date=row.end_date,
        venue_name=row.venue_name,
        venue_address=row.venue_address,
        city=row.city,
        url=row.url,
        image_url=row.image_url,
        category=row.category,
        price=row.price,
        is_free=row.is_free,
        source=row.source,
        lat=row.lat,
        lng=row.lng,
    )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    email: str,
    hashed_password: str,
    display_name: str | None,
    is_admin: bool = False,
) -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=email.lower(),
        hashed_password=hashed_password,
        display_name=display_name or email.split("@")[0],
        is_admin=is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())


async def delete_user(db: AsyncSession, user_id: str) -> bool:
    result = await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    return result.rowcount > 0

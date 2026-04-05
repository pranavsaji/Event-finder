from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, DateTime, Text
from db.database import Base


class EventRow(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True)
    cache_key = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_date = Column(String)
    end_date = Column(String)
    venue_name = Column(String)
    venue_address = Column(String)
    city = Column(String)
    url = Column(String)
    image_url = Column(String)
    category = Column(String)
    price = Column(String)
    is_free = Column(Boolean)
    source = Column(String, nullable=False)
    lat = Column(Float)
    lng = Column(Float)
    fetched_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

from pydantic import BaseModel
from typing import Optional


class Event(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    city: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    price: Optional[str] = None
    is_free: Optional[bool] = None
    source: str
    lat: Optional[float] = None
    lng: Optional[float] = None

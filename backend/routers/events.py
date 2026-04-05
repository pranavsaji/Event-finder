import asyncio
import re
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from fetchers import (
    fetch_eventbrite,
    fetch_ticketmaster,
    fetch_yelp,
    fetch_meetup,
    fetch_sfgov,
    fetch_dosf,
    fetch_allevents,
    fetch_luma,
)
from fetchers.models import Event
from db.database import get_db
from db.crud import get_cached_events, upsert_events

router = APIRouter()

_SAFE_PARAM = re.compile(r"^[\w\s\-&',.]{0,100}$")

ALLOWED_SOURCES = {
    "eventbrite", "ticketmaster", "yelp", "meetup",
    "sfgate", "funcheap sf", "sf chronicle",
    "allevents.in", "10times", "luma",
}

ALLOWED_CATEGORIES = {
    "", "music", "food & drink", "arts", "sports", "tech",
    "community", "nightlife", "film", "family", "business",
}


def _validate_param(value: str, name: str) -> str:
    if not _SAFE_PARAM.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid characters in '{name}'")
    return value.strip()


@router.get("/events", response_model=list[Event])
async def get_events(
    q: str = Query("", max_length=100, description="Search query"),
    category: str = Query("", max_length=50, description="Category filter"),
    source: str = Query("", max_length=50, description="Filter by source"),
    db: AsyncSession = Depends(get_db),
):
    q = _validate_param(q, "q")
    category = _validate_param(category, "category")
    source = _validate_param(source, "source")

    if category.lower() not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Unknown category '{category}'")
    if source and source.lower() not in ALLOWED_SOURCES:
        raise HTTPException(status_code=400, detail=f"Unknown source '{source}'")

    # Cache key is query-only; category/source are cheap in-memory filters applied after
    cache_key = f"q={q.lower()}"
    cached = await get_cached_events(db, cache_key)
    if cached is not None:
        return _apply_filters(cached, category, source)

    # Cache miss — scrape all sources in parallel
    tasks = [
        fetch_eventbrite(query=q, category=category),
        fetch_ticketmaster(query=q, category=category),
        fetch_yelp(query=q, category=category),
        fetch_meetup(query=q),
        fetch_sfgov(),
        fetch_dosf(),
        fetch_allevents(),
        fetch_luma(),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_events: list[Event] = []
    for result in results:
        if isinstance(result, list):
            all_events.extend(result)

    # Deduplicate by title + date
    seen: set[str] = set()
    unique: list[Event] = []
    for ev in all_events:
        key = f"{ev.title.lower().strip()}_{ev.start_date or ''}"
        if key not in seen:
            seen.add(key)
            unique.append(ev)

    await upsert_events(db, unique, cache_key)
    return _apply_filters(unique, category, source)


def _apply_filters(events: list[Event], category: str, source: str) -> list[Event]:
    if category:
        events = [e for e in events if (e.category or "").lower() == category.lower()]
    if source:
        events = [e for e in events if e.source.lower() == source.lower()]
    return events


@router.get("/sources")
async def get_sources():
    return {
        "sources": [
            {"name": "Eventbrite", "requires_key": True, "env": "EVENTBRITE_TOKEN"},
            {"name": "Ticketmaster", "requires_key": True, "env": "TICKETMASTER_API_KEY"},
            {"name": "Yelp", "requires_key": True, "env": "YELP_API_KEY"},
            {"name": "Meetup", "requires_key": False, "env": None},
            {"name": "SFGate", "requires_key": False, "env": None},
            {"name": "FunCheap SF", "requires_key": False, "env": None},
            {"name": "SF Chronicle", "requires_key": False, "env": None},
            {"name": "AllEvents.in", "requires_key": False, "env": None},
            {"name": "10Times", "requires_key": False, "env": None},
            {"name": "Luma", "requires_key": False, "env": None},
        ]
    }

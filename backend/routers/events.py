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


ALLOWED_DATE_RANGES = {"", "today", "tomorrow", "weekend", "week", "month"}


@router.get("/events", response_model=list[Event])
async def get_events(
    q: str = Query("", max_length=100),
    category: str = Query("", max_length=50),
    source: str = Query("", max_length=50),
    date_range: str = Query("", max_length=20),
    free_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    q = _validate_param(q, "q")
    category = _validate_param(category, "category")
    source = _validate_param(source, "source")

    if source and source.lower() not in ALLOWED_SOURCES:
        raise HTTPException(status_code=400, detail=f"Unknown source '{source}'")
    if date_range not in ALLOWED_DATE_RANGES:
        raise HTTPException(status_code=400, detail=f"Unknown date_range '{date_range}'")

    # Cache key is query-only; all other filters applied in-memory
    cache_key = f"q={q.lower()}"
    cached = await get_cached_events(db, cache_key)
    if cached is not None:
        return _apply_filters(cached, category, source, date_range, free_only)

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
    return _apply_filters(unique, category, source, date_range, free_only)


def _parse_date(s: str | None):
    if not s:
        return None
    from datetime import date as _date
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            from datetime import datetime as _dt
            return _dt.strptime(s, fmt).date()
        except ValueError:
            continue
    try:
        return _date.fromisoformat(s[:10])
    except Exception:
        return None


# Keyword map for smart category inference when category field is null/vague
_CAT_KEYWORDS: dict[str, list[str]] = {
    "tech": ["tech", "technology", "ai", "artificial intelligence", "machine learning",
             "software", "developer", "coding", "startup", "hackathon", "engineering",
             "data science", "cybersecurity", "blockchain", "crypto", "saas", "devops",
             "cloud", "product management", "ux", "design thinking", "demo day", "pitch"],
    "music": ["music", "concert", "live music", "jazz", "rock", "hip hop", "classical",
              "band", "dj", "festival", "indie", "pop", "r&b", "blues", "electronic",
              "edm", "rapper", "singer", "orchestra", "choir"],
    "food & drink": ["food", "drink", "dining", "restaurant", "culinary", "wine", "beer",
                     "cocktail", "tasting", "chef", "brunch", "dinner", "cooking",
                     "bartender", "mixology", "brewery", "winery", "spirits", "foodie"],
    "arts": ["art", "gallery", "museum", "theatre", "theater", "exhibition", "painting",
             "sculpture", "poetry", "literary", "dance", "ballet", "opera", "comedy",
             "improv", "standup", "performance", "film", "movie", "cinema", "screening"],
    "sports": ["sport", "fitness", "workout", "yoga", "marathon", "run", "cycling",
               "basketball", "football", "soccer", "baseball", "tennis", "golf",
               "swim", "crossfit", "gym", "athletic"],
    "community": ["community", "networking", "meetup", "social", "volunteer", "nonprofit",
                  "charity", "fundraiser", "civic", "neighborhood", "forum"],
    "nightlife": ["nightlife", "club", "party", "rave", "dj set", "lounge", "rooftop",
                  "happy hour", "after party", "bar hop"],
    "family": ["family", "kids", "children", "child", "youth", "teen", "parent",
               "toddler", "baby", "school"],
    "business": ["business", "entrepreneur", "venture", "investment", "finance",
                 "leadership", "marketing", "sales", "career", "professional",
                 "conference", "summit", "workshop", "seminar"],
}

# Map source category values → our category labels
_CAT_MAP = {
    "arts & theatre": "arts", "arts & entertainment": "arts",
    "music": "music", "sports": "sports", "community": "community",
    "technology": "tech", "science & tech": "tech",
    "food & drink": "food & drink", "food": "food & drink",
    "film": "arts", "comedy": "arts", "nightlife": "nightlife",
    "family": "family", "business": "business",
}


def _infer_category(event: Event) -> str:
    """Return our normalised category label for an event."""
    raw = (event.category or "").lower().strip()
    if raw and raw not in ("undefined", "none", "other", ""):
        mapped = _CAT_MAP.get(raw)
        if mapped:
            return mapped
        # Check if raw category contains any of our known labels
        for label in _CAT_KEYWORDS:
            if label in raw:
                return label

    # Fall back to keyword search in title + description
    text = f"{event.title or ''} {event.description or ''}".lower()
    for label, keywords in _CAT_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return label
    return raw  # keep original if nothing matched


def _apply_filters(events: list[Event], category: str, source: str,
                   date_range: str = "", free_only: bool = False) -> list[Event]:
    from datetime import date, timedelta
    today = date.today()

    # Always exclude past events
    filtered = []
    for e in events:
        d = _parse_date(e.start_date)
        if d is None or d >= today:
            filtered.append(e)
    events = filtered

    # Date range
    if date_range == "today":
        events = [e for e in events if _parse_date(e.start_date) == today]
    elif date_range == "tomorrow":
        tomorrow = today + timedelta(days=1)
        events = [e for e in events if _parse_date(e.start_date) == tomorrow]
    elif date_range == "weekend":
        # Next Sat/Sun
        days_to_sat = (5 - today.weekday()) % 7
        sat = today + timedelta(days=days_to_sat or 7)
        sun = sat + timedelta(days=1)
        events = [e for e in events if _parse_date(e.start_date) in (sat, sun)]
    elif date_range == "week":
        week_end = today + timedelta(days=7)
        events = [e for e in events if today <= (_parse_date(e.start_date) or today) <= week_end]
    elif date_range == "month":
        month_end = today + timedelta(days=30)
        events = [e for e in events if today <= (_parse_date(e.start_date) or today) <= month_end]

    # Category with smart inference
    if category:
        events = [e for e in events if _infer_category(e) == category.lower()]

    if source:
        events = [e for e in events if e.source.lower() == source.lower()]

    if free_only:
        events = [e for e in events if e.is_free]

    # Sort by date ascending
    events.sort(key=lambda e: (_parse_date(e.start_date) or date.max).isoformat())
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

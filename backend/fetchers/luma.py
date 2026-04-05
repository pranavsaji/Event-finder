"""Luma (lu.ma) SF Bay Area events — NEXT_DATA scrape + API fallback."""
import httpx
import json
import hashlib
from bs4 import BeautifulSoup
from .models import Event

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
}

_LUMA_URLS = ["https://lu.ma/sf", "https://lu.ma/bayarea"]


async def fetch_luma() -> list[Event]:
    events = await _scrape_next_data()
    if not events:
        events = await _try_public_api()
    return events


async def _scrape_next_data() -> list[Event]:
    """Primary: parse __NEXT_DATA__ JSON embedded in lu.ma pages.
    Real structure: pageProps.initialData.data.events[]
      each entry: { api_id, start_at, end_at, cover_image, event: {name, ...}, calendar: {...} }
    """
    events: list[Event] = []
    seen: set[str] = set()

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=_HEADERS) as client:
        for url in _LUMA_URLS:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except Exception:
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            nd = soup.find("script", id="__NEXT_DATA__")
            if not nd or not nd.string:
                continue

            try:
                data = json.loads(nd.string)
            except Exception:
                continue

            page_data = (
                data.get("props", {})
                    .get("pageProps", {})
                    .get("initialData", {})
                    .get("data", {})
            )

            # Combine regular + featured events
            entries = page_data.get("events", []) + page_data.get("featured_events", [])

            for entry in entries:
                ev = entry.get("event") or {}
                title = ev.get("name", "")
                if not title or title in seen:
                    continue
                seen.add(title)

                cover = (entry.get("cover_image") or {}).get("url") or ev.get("cover_url")
                cal = entry.get("calendar") or {}
                uid = entry.get("api_id") or hashlib.md5(title.encode()).hexdigest()[:8]

                ticket = ev.get("ticket_info") or {}
                is_free = ticket.get("is_free", True)
                price = "Free" if is_free else f"From ${ticket.get('price', '')}"

                events.append(Event(
                    id=f"luma_{uid}",
                    title=title,
                    description=(ev.get("description") or "")[:400] or None,
                    start_date=entry.get("start_at") or ev.get("start_at"),
                    end_date=entry.get("end_at") or ev.get("end_at"),
                    venue_name=cal.get("name") or ev.get("location_address"),
                    venue_address=ev.get("location_address"),
                    city="San Francisco",
                    url=f"https://lu.ma/{ev.get('url') or uid}",
                    image_url=cover,
                    category="Community",
                    price=price,
                    is_free=is_free,
                    source="Luma",
                ))

    return events


async def _try_public_api() -> list[Event]:
    """Fallback: Luma public discovery API endpoints."""
    endpoints = [
        "https://api.lu.ma/public/v1/calendar/list-events?pagination_limit=50&geo_latitude=37.7749&geo_longitude=-122.4194&geo_radius_km=80",
    ]
    async with httpx.AsyncClient(timeout=12, headers=_HEADERS) as client:
        for url in endpoints:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                data = resp.json()
            except Exception:
                continue

            events = []
            for entry in data.get("entries", []):
                ev = entry.get("event") or entry
                title = ev.get("name", "")
                if not title:
                    continue
                uid = ev.get("api_id") or hashlib.md5(title.encode()).hexdigest()[:8]
                venue = entry.get("venue") or {}
                geo = venue.get("geo") or {}
                cover = (entry.get("cover_image") or {}).get("url") or ev.get("cover_url")
                ticket = ev.get("ticket_info") or {}
                is_free = ticket.get("is_free", True)

                events.append(Event(
                    id=f"luma_{uid}",
                    title=title,
                    description=(ev.get("description") or "")[:400] or None,
                    start_date=entry.get("start_at") or ev.get("start_at"),
                    end_date=entry.get("end_at") or ev.get("end_at"),
                    venue_name=venue.get("name"),
                    venue_address=venue.get("full_address"),
                    city=venue.get("city", "San Francisco"),
                    url=f"https://lu.ma/{ev.get('url', uid)}",
                    image_url=cover,
                    price="Free" if is_free else "Paid",
                    is_free=is_free,
                    source="Luma",
                    lat=geo.get("latitude"),
                    lng=geo.get("longitude"),
                ))
            if events:
                return events
    return []

import httpx
import os
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
    "Accept-Language": "en-US,en;q=0.9",
}


async def fetch_eventbrite(query: str = "", category: str = "") -> list[Event]:
    token = os.getenv("EVENTBRITE_TOKEN", "")
    if token:
        events = await _fetch_via_api(token, query, category)
        if events:
            return events
    return await _fetch_via_scrape(query)


async def _fetch_via_api(token: str, query: str, category: str) -> list[Event]:
    params = {
        "location.address": "San Francisco, CA",
        "location.within": "50mi",
        "expand": "venue,category",
        "sort_by": "date",
        "page_size": 50,
    }
    if query:
        params["q"] = query
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://www.eventbriteapi.com/v3/events/search/",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    events = []
    for ev in data.get("events", []):
        venue = ev.get("venue") or {}
        addr = venue.get("address") or {}
        cost = ev.get("ticket_availability") or {}
        price = "Free" if cost.get("is_free") else "Paid"
        if cost.get("minimum_ticket_price"):
            min_p = cost["minimum_ticket_price"]
            price = f"${min_p.get('major_value', '')}+"
        events.append(Event(
            id=f"eb_{ev['id']}",
            title=ev.get("name", {}).get("text", ""),
            description=ev.get("description", {}).get("text", ""),
            start_date=ev.get("start", {}).get("local"),
            end_date=ev.get("end", {}).get("local"),
            venue_name=venue.get("name"),
            venue_address=addr.get("localized_address_display"),
            city=addr.get("city"),
            url=ev.get("url"),
            image_url=(ev.get("logo") or {}).get("url"),
            category=(ev.get("category") or {}).get("name"),
            price=price,
            is_free=cost.get("is_free", False),
            source="Eventbrite",
            lat=float(addr["latitude"]) if addr.get("latitude") else None,
            lng=float(addr["longitude"]) if addr.get("longitude") else None,
        ))
    return events


async def _fetch_via_scrape(query: str = "") -> list[Event]:
    slug = query.replace(" ", "-").lower() if query else "events"
    urls = [
        f"https://www.eventbrite.com/d/ca--san-francisco/{slug}/",
        "https://www.eventbrite.com/d/ca--bay-area/events/",
    ]
    events: list[Event] = []
    seen: set[str] = set()

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=_HEADERS) as client:
        for url in urls:
            if len(events) >= 40:
                break
            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except Exception:
                continue
            soup = BeautifulSoup(resp.text, "lxml")
            events.extend(_parse_item_list(soup, seen))

    return events


def _parse_item_list(soup: BeautifulSoup, seen: set) -> list[Event]:
    """Parse Eventbrite's ItemList JSON-LD (confirmed structure)."""
    events = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except Exception:
            continue

        if not isinstance(data, dict) or data.get("@type") != "ItemList":
            continue

        for list_item in data.get("itemListElement", []):
            item = list_item.get("item") if isinstance(list_item, dict) else list_item
            if not item or not isinstance(item, dict):
                continue

            title = item.get("name", "")
            if not title or title in seen:
                continue
            seen.add(title)

            loc = item.get("location") or {}
            addr = loc.get("address") or {}
            if isinstance(addr, str):
                addr = {"streetAddress": addr}

            uid = hashlib.md5(title.encode()).hexdigest()[:8]
            events.append(Event(
                id=f"eb_scrape_{uid}",
                title=title,
                description=(item.get("description") or "")[:400] or None,
                start_date=item.get("startDate"),
                end_date=item.get("endDate"),
                venue_name=loc.get("name"),
                venue_address=addr.get("streetAddress"),
                city=addr.get("addressLocality"),
                url=item.get("url"),
                image_url=item.get("image"),
                source="Eventbrite",
            ))
    return events

import httpx
import os
from .models import Event


async def fetch_ticketmaster(query: str = "", category: str = "") -> list[Event]:
    api_key = os.getenv("TICKETMASTER_API_KEY", "")
    if not api_key:
        return []

    params = {
        "apikey": api_key,
        "city": "San Francisco",
        "stateCode": "CA",
        "countryCode": "US",
        "radius": "50",
        "unit": "miles",
        "sort": "date,asc",
        "size": 50,
    }
    if query:
        params["keyword"] = query
    if category:
        params["classificationName"] = category

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://app.ticketmaster.com/discovery/v2/events.json",
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    raw = (data.get("_embedded") or {}).get("events", [])
    events = []
    for ev in raw:
        venue_list = (ev.get("_embedded") or {}).get("venues", [{}])
        venue = venue_list[0] if venue_list else {}
        loc = venue.get("location") or {}
        addr = venue.get("address") or {}
        city_obj = venue.get("city") or {}

        dates = ev.get("dates", {}).get("start", {})
        price_ranges = ev.get("priceRanges", [])
        if price_ranges:
            pr = price_ranges[0]
            price = f"${pr.get('min', '')} - ${pr.get('max', '')}"
            is_free = pr.get("min", 1) == 0
        else:
            price = "See site"
            is_free = None

        images = ev.get("images", [])
        img = max(images, key=lambda x: x.get("width", 0), default={}).get("url")

        classifications = ev.get("classifications", [{}])
        cat = (classifications[0].get("segment") or {}).get("name", "")

        events.append(
            Event(
                id=f"tm_{ev['id']}",
                title=ev.get("name", ""),
                description=None,
                start_date=f"{dates.get('localDate', '')} {dates.get('localTime', '')}".strip(),
                venue_name=venue.get("name"),
                venue_address=addr.get("line1"),
                city=city_obj.get("name"),
                url=ev.get("url"),
                image_url=img,
                category=cat,
                price=price,
                is_free=is_free,
                source="Ticketmaster",
                lat=float(loc["latitude"]) if loc.get("latitude") else None,
                lng=float(loc["longitude"]) if loc.get("longitude") else None,
            )
        )
    return events

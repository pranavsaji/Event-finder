import httpx
import os
import re
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

_BROWSE_URLS = [
    "https://www.yelp.com/events/sf/browse",
    "https://www.yelp.com/events/sf/browse?c=1",   # Nightlife
    "https://www.yelp.com/events/sf/browse?c=2",   # Food & Drink
    "https://www.yelp.com/events/sf/browse?c=4",   # Music
]


async def fetch_yelp(query: str = "", category: str = "") -> list[Event]:
    api_key = os.getenv("YELP_API_KEY", "")
    if api_key:
        events = await _fetch_via_api(api_key, query, category)
        if events:
            return events
    return await _fetch_via_scrape()


async def _fetch_via_api(api_key: str, query: str, category: str) -> list[Event]:
    params = {
        "location": "San Francisco Bay Area, CA",
        "radius": 80000,
        "limit": 50,
        "sort_on": "time_start",
        "sort_by": "asc",
    }
    if query:
        params["q"] = query

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.yelp.com/v3/events",
                params=params,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    events = []
    for ev in data.get("events", []):
        loc = ev.get("location") or {}
        events.append(Event(
            id=f"yelp_{ev['id']}",
            title=ev.get("name", ""),
            description=ev.get("description"),
            start_date=ev.get("time_start"),
            end_date=ev.get("time_end"),
            venue_name=ev.get("business_id"),
            venue_address=loc.get("display_address", [""])[0] if loc.get("display_address") else None,
            city=loc.get("city"),
            url=ev.get("event_site_url"),
            image_url=ev.get("image_url"),
            category=ev.get("category"),
            price="Free" if ev.get("is_free") else "Paid",
            is_free=ev.get("is_free"),
            source="Yelp",
            lat=ev.get("latitude"),
            lng=ev.get("longitude"),
        ))
    return events


async def _fetch_via_scrape() -> list[Event]:
    """Scrape yelp.com/events/sf/browse — uses microdata (itemprop) for clean extraction."""
    events: list[Event] = []
    seen: set[str] = set()

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=_HEADERS) as client:
        for url in _BROWSE_URLS:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except Exception:
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            events.extend(_parse_yelp_cards(soup, seen))

    return events


def _parse_yelp_cards(soup: BeautifulSoup, seen: set) -> list[Event]:
    """
    Yelp embeds microdata in div.card_content:
      <h3><a itemprop="url"><span itemprop="name">…</span></a></h3>
      <meta itemprop="startDate" content="2026-04-19T13:00:00-07:00"/>
      <div> date string </div>
      <div> venue name </div>
    Image is in sibling div.photo-box img.
    """
    events = []
    cards = soup.select("div.card_content")

    for card in cards:
        name_el = card.find(itemprop="name")
        if not name_el:
            continue
        title = name_el.get_text(strip=True)
        if not title or title in seen:
            continue
        seen.add(title)

        link_el = card.find("a", itemprop="url")
        href = link_el["href"] if link_el else None
        if href and not href.startswith("http"):
            href = f"https://www.yelp.com{href}"

        start_meta = card.find("meta", itemprop="startDate")
        start_date = start_meta["content"] if start_meta else None

        # Date text (first non-empty div after the title)
        date_div = card.find("div", class_="u-text-truncate")
        date_text = date_div.get_text(strip=True) if date_div else None

        # Venue: second u-text-truncate div
        venue_divs = card.find_all("div", class_="u-text-truncate")
        venue_name = None
        if len(venue_divs) > 1:
            venue_name = venue_divs[1].get_text(strip=True)

        # Description (if present)
        desc_el = card.find("p") or card.find("div", class_=re.compile("description|summary"))
        desc = desc_el.get_text(strip=True)[:300] if desc_el else None

        # Image is two levels up: card_content → card_body → card.arrange_unit
        img = None
        try:
            card_wrap = card.parent.parent  # card_body → card.arrange_unit
            img_el = card_wrap.find("img")
            if img_el:
                img = img_el.get("src") or img_el.get("data-src")
                if img and "default_avatars" in img:
                    img = None
        except Exception:
            pass

        uid = hashlib.md5(title.encode()).hexdigest()[:8]
        events.append(Event(
            id=f"yelp_scrape_{uid}",
            title=title,
            description=desc,
            start_date=start_date or date_text,
            venue_name=venue_name,
            url=href,
            image_url=img,
            city="San Francisco",
            source="Yelp",
        ))

    return events

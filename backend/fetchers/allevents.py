"""Scrapes AllEvents.in and Eventful-style sources for SF Bay Area."""
import httpx
from bs4 import BeautifulSoup
from .models import Event
import hashlib


async def fetch_allevents() -> list[Event]:
    events: list[Event] = []
    urls = [
        ("https://allevents.in/san%20francisco", "AllEvents.in"),
        ("https://10times.com/san-francisco", "10Times"),
    ]

    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
        for url, source in urls:
            try:
                resp = await client.get(
                    url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                )
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "lxml")

                # Generic scrape: look for event cards
                cards = (
                    soup.select("[class*='event-item']")
                    or soup.select("[class*='event-card']")
                    or soup.select("[class*='event_item']")
                    or soup.select("article")
                )

                for card in cards[:20]:
                    title_el = card.find(["h2", "h3", "h4", "h5"])
                    link_el = card.find("a", href=True)
                    img_el = card.find("img")
                    date_el = card.find(["time", "[class*='date']"])

                    if not title_el:
                        continue

                    title = title_el.get_text(strip=True)
                    if not title:
                        continue

                    href = link_el["href"] if link_el else None
                    if href and not href.startswith("http"):
                        base = "/".join(url.split("/")[:3])
                        href = base + href

                    img_src = None
                    if img_el:
                        img_src = img_el.get("data-src") or img_el.get("src")

                    date_str = date_el.get_text(strip=True) if date_el else None

                    uid = hashlib.md5(title.encode()).hexdigest()[:8]
                    events.append(
                        Event(
                            id=f"{source.lower().replace('.', '').replace(' ', '_')}_{uid}",
                            title=title,
                            start_date=date_str,
                            url=href,
                            image_url=img_src,
                            city="San Francisco",
                            source=source,
                        )
                    )
            except Exception:
                continue

    return events

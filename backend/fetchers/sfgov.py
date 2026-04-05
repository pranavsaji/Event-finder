"""Scrapes SF Gov events and Do SF / SFGate RSS feeds."""
import httpx
import feedparser
from bs4 import BeautifulSoup
from .models import Event
import hashlib


async def fetch_sfgov() -> list[Event]:
    """SF City-hosted events from datasf and sfgate RSS."""
    events: list[Event] = []

    # SF Gate events RSS
    feeds = [
        ("https://www.sfgate.com/rss/feed/things-to-do-events-17430816.php", "SFGate"),
        ("https://sf.funcheap.com/feed/", "FunCheap SF"),
    ]

    async with httpx.AsyncClient(timeout=10) as client:
        for url, source_name in feeds:
            try:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                resp.raise_for_status()
                feed = feedparser.parse(resp.text)
                for entry in feed.entries[:30]:
                    uid = hashlib.md5(entry.get("link", entry.get("title", "")).encode()).hexdigest()
                    events.append(
                        Event(
                            id=f"{source_name.lower().replace(' ', '_')}_{uid[:8]}",
                            title=entry.get("title", ""),
                            description=_strip_html(entry.get("summary", "")),
                            start_date=entry.get("published"),
                            url=entry.get("link"),
                            image_url=_extract_image(entry),
                            city="San Francisco",
                            source=source_name,
                        )
                    )
            except Exception:
                continue

    return events


async def fetch_dosf() -> list[Event]:
    """Scrape Do SF (SF Chronicle things-to-do)."""
    events: list[Event] = []
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                "https://www.sfchronicle.com/things-to-do/",
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                },
            )
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            # Generic article cards
            cards = soup.select("article") or soup.select("[class*='story']") or soup.select("[class*='card']")
            for card in cards[:20]:
                title_el = card.find(["h2", "h3", "h4"])
                link_el = card.find("a", href=True)
                img_el = card.find("img")
                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                url = link_el["href"] if link_el else None
                if url and url.startswith("/"):
                    url = f"https://www.sfchronicle.com{url}"
                img = img_el.get("src") or img_el.get("data-src") if img_el else None

                uid = hashlib.md5(title.encode()).hexdigest()[:8]
                events.append(
                    Event(
                        id=f"sfchron_{uid}",
                        title=title,
                        url=url,
                        image_url=img,
                        city="San Francisco",
                        source="SF Chronicle",
                    )
                )
    except Exception:
        pass
    return events


def _strip_html(text: str) -> str:
    return BeautifulSoup(text, "lxml").get_text(strip=True)


def _extract_image(entry) -> str | None:
    # Check media_content
    media = entry.get("media_content", [])
    if media:
        return media[0].get("url")
    # Check enclosures
    enc = entry.get("enclosures", [])
    if enc:
        return enc[0].get("url")
    # Parse from summary
    soup = BeautifulSoup(entry.get("summary", ""), "lxml")
    img = soup.find("img")
    return img["src"] if img and img.get("src") else None

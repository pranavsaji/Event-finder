"""Meetup GraphQL API - public events near SF."""
import httpx
from .models import Event
import hashlib


MEETUP_GRAPHQL = "https://www.meetup.com/gql"

QUERY = """
query searchEvents($query: String, $lat: Float!, $lon: Float!, $radius: Int!) {
  results: keywordSearch(
    filter: {
      query: $query
      lat: $lat
      lon: $lon
      radius: $radius
      source: EVENTS
    }
    input: { first: 50 }
  ) {
    edges {
      node {
        result {
          ... on Event {
            id
            title
            description
            dateTime
            endTime
            eventUrl
            isOnline
            venue {
              name
              address
              city
              lat
              lng
            }
            group {
              name
            }
            images {
              baseUrl
            }
            feeSettings {
              accepts
              amount
              currency
            }
          }
        }
      }
    }
  }
}
"""


async def fetch_meetup(query: str = "") -> list[Event]:
    variables = {
        "query": query or "events",
        "lat": 37.7749,
        "lon": -122.4194,
        "radius": 80,
    }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.post(
                MEETUP_GRAPHQL,
                json={"query": QUERY, "variables": variables},
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    events = []
    edges = (data.get("data") or {}).get("results", {}).get("edges", [])
    for edge in edges:
        result = (edge.get("node") or {}).get("result") or {}
        if not result.get("title"):
            continue

        venue = result.get("venue") or {}
        images = result.get("images") or []
        img = f"{images[0]['baseUrl']}676x380.webp" if images else None
        fee = result.get("feeSettings") or {}

        if fee.get("amount") == 0 or fee.get("amount") is None:
            price = "Free"
            is_free = True
        else:
            price = f"{fee.get('currency', '$')}{fee.get('amount', '')}"
            is_free = False

        uid = result.get("id") or hashlib.md5(result["title"].encode()).hexdigest()[:8]
        events.append(
            Event(
                id=f"meetup_{uid}",
                title=result["title"],
                description=result.get("description", "")[:500] if result.get("description") else None,
                start_date=result.get("dateTime"),
                end_date=result.get("endTime"),
                venue_name=venue.get("name") or result.get("group", {}).get("name"),
                venue_address=venue.get("address"),
                city=venue.get("city", "San Francisco"),
                url=result.get("eventUrl"),
                image_url=img,
                category="Community",
                price=price,
                is_free=is_free,
                source="Meetup",
                lat=venue.get("lat"),
                lng=venue.get("lng"),
            )
        )
    return events

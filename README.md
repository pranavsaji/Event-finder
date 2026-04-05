# 🌉 SF Bay Area Event Finder

A full-stack web app that aggregates events happening in and around the San Francisco Bay Area from **10 sources** in real time — no single API key required to get started.

![SF Bay Events](https://img.shields.io/badge/sources-10-orange) ![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688) ![React](https://img.shields.io/badge/frontend-React-61DAFB) ![Tailwind](https://img.shields.io/badge/style-Tailwind_v4-38BDF8)

---

## Features

- **10 event sources** scraped and aggregated in parallel
- **No API keys needed** to run — scraping fallbacks work out of the box
- Category filters (Music, Food, Arts, Sports, Tech, Nightlife…)
- Filter by source (Eventbrite, Luma, Yelp, Ticketmaster…)
- Grid and list view toggle
- Free / paid badge, venue, date, and image per event
- Deduplication across sources by title + date
- Rate limiting, security headers, and input validation on the backend

---

## Event Sources

| Source | Method | API Key? |
|--------|--------|----------|
| Eventbrite | Web scrape (JSON-LD) + API | Optional |
| Ticketmaster | REST API | Optional (recommended) |
| Yelp Events | Web scrape + API | Optional |
| Luma (lu.ma) | `__NEXT_DATA__` scrape + API | No |
| Meetup | GraphQL API | No |
| SFGate | RSS feed | No |
| FunCheap SF | RSS feed | No |
| SF Chronicle | Web scrape | No |
| AllEvents.in | Web scrape | No |
| 10Times | Web scrape | No |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11 · FastAPI · httpx · BeautifulSoup4 · feedparser |
| Frontend | React 19 · Vite · Tailwind CSS v4 · lucide-react · date-fns |
| Security | CORS allowlist · rate limiting · security headers · input validation |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone the repo

```bash
git clone git@github.com:pranavsaji/Event-finder.git
cd Event-finder
```

### 2. Set up the backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # Add optional API keys (see .env.example)
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

### 4. Run everything

From the project root:

```bash
./start.sh
```

Or start them individually:

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## API Keys (Optional)

The app works without any keys. Adding keys gives you more events and richer data.

Copy `backend/.env.example` to `backend/.env` and fill in what you have:

| Key | Where to get it | What it unlocks |
|-----|----------------|-----------------|
| `TICKETMASTER_API_KEY` | [developer.ticketmaster.com](https://developer.ticketmaster.com) → Consumer Key | Concerts, sports, shows |
| `EVENTBRITE_TOKEN` | [eventbrite.com/platform/api](https://www.eventbrite.com/platform/api) → Private Token | Higher limits + full event detail |
| `YELP_API_KEY` | [yelp.com/developers](https://www.yelp.com/developers/v3/manage_app) → API Key | Pagination + category filters |

---

## Project Structure

```
sf-events/
├── backend/
│   ├── fetchers/
│   │   ├── eventbrite.py     # Eventbrite scrape + API
│   │   ├── ticketmaster.py   # Ticketmaster Discovery API
│   │   ├── yelp.py           # Yelp scrape + API
│   │   ├── luma.py           # Luma NEXT_DATA scrape + API
│   │   ├── meetup.py         # Meetup GraphQL
│   │   ├── sfgov.py          # SFGate + FunCheap RSS, SF Chronicle scrape
│   │   ├── allevents.py      # AllEvents.in + 10Times scrape
│   │   └── models.py         # Pydantic Event model
│   ├── routers/
│   │   └── events.py         # /api/events + /api/sources endpoints
│   ├── main.py               # FastAPI app, CORS, rate limiting, security headers
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── SearchBar.jsx   # Category pills + source dropdown
│   │   │   ├── EventCard.jsx   # Grid card with image, date, venue, price
│   │   │   ├── SourceStats.jsx # Per-source event count badges
│   │   │   └── EmptyState.jsx  # Loading, error, and empty states
│   │   ├── hooks/
│   │   │   └── useEvents.js    # Fetch hook with loading/error state
│   │   ├── App.jsx
│   │   └── index.css
│   ├── vite.config.js          # Proxy /api → localhost:8000
│   └── package.json
├── start.sh                    # One-command startup script
└── .gitignore
```

---

## API Reference

### `GET /api/events`

Returns a deduplicated list of events from all sources.

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search keyword (max 100 chars) |
| `category` | string | One of: `Music`, `Food & Drink`, `Arts`, `Sports`, `Tech`, `Community`, `Nightlife`, `Film`, `Family`, `Business` |
| `source` | string | Filter by source name e.g. `Eventbrite` |

**Example:**
```
GET /api/events?q=jazz&category=Music
```

### `GET /api/sources`

Returns the list of all sources and whether they require an API key.

### `GET /health`

Health check — returns `{"status": "ok"}`.

---

## Security

- **CORS** locked to `localhost:5173` by default (set `ALLOWED_ORIGINS` in `.env` for production)
- **Rate limiting**: 30 requests / 60 seconds per IP (configurable)
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- **Input validation**: regex allowlist + max-length on all query params
- **Secrets**: `.env` is gitignored; only `.env.example` is committed

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/new-source`
3. Add your fetcher in `backend/fetchers/`, wire it into `__init__.py` and `routers/events.py`
4. Open a PR

---

## License

MIT

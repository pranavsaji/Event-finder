#!/bin/bash
set -e

echo "🌉 Starting SF Bay Area Events App..."

# Backend
echo "→ Setting up Python backend..."
cd backend
/opt/homebrew/bin/python3.11 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r requirements.txt -q

# Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ⚠️  Created backend/.env — add API keys for more sources"
fi

echo "→ Starting FastAPI on http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
echo "→ Installing frontend deps..."
cd ../frontend
npm install --silent

echo "→ Starting React on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ App running!"
echo "   Frontend: http://localhost:5173"
echo "   API:      http://localhost:8000/api/events"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait

#!/bin/bash
set -e

# TrustRAG Development Launcher
# Starts the local injection classifier (laya-serve, when port 8077 is free),
# the FastAPI backend and the Vite frontend dev server.

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=8000
FRONTEND_PORT=5173
# Local injection classifier (laya-serve). An instance already listening on this
# port is reused and left running; scanning (uploads/secure queries) needs it.
LAYA_PORT="${LAYA_PORT:-8077}"
LAYA_BIN="${LAYA_BIN:-/home/pavan/AI-Models/laya/.venv/bin/laya-serve}"
LAYA_LOG="/tmp/trustrag-laya-serve.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down TrustRAG...${NC}"
    if [ -n "$LAYA_PID" ] && kill -0 "$LAYA_PID" 2>/dev/null; then
        kill "$LAYA_PID" 2>/dev/null
        echo -e "  ${RED}Stopped injection classifier (PID $LAYA_PID)${NC}"
    fi
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        echo -e "  ${RED}Stopped backend (PID $BACKEND_PID)${NC}"
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        echo -e "  ${RED}Stopped frontend (PID $FRONTEND_PID)${NC}"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         TrustRAG Launcher            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# --- Local injection classifier (laya-serve) ---
if ss -ltn 2>/dev/null | grep -q ":$LAYA_PORT "; then
    echo -e "${BLUE}[1/3] Injection classifier already running on port $LAYA_PORT (reused, left running on exit)${NC}"
elif [ ! -x "$LAYA_BIN" ]; then
    echo -e "${BLUE}[1/3] Injection classifier${NC}"
    echo -e "  ${YELLOW}Not found: $LAYA_BIN${NC}"
    echo -e "  ${YELLOW}Uploads and secure queries will fail closed until it is started manually.${NC}"
else
    echo -e "${BLUE}[1/3] Starting local injection classifier (laya-serve, CPU)...${NC}"
    LAYA_HOST=127.0.0.1 LAYA_PORT="$LAYA_PORT" LAYA_DEVICE=cpu LAYA_PRELOAD=1 \
        LAYA_MODELS=english LAYA_DEFAULT_MODEL=english \
        "$LAYA_BIN" > "$LAYA_LOG" 2>&1 &
    LAYA_PID=$!
    echo -e "  ${GREEN}Classifier PID: $LAYA_PID${NC}  (log: $LAYA_LOG)"
    echo -n "  Waiting for classifier"
    for i in $(seq 1 60); do
        if curl -s --max-time 1 "http://127.0.0.1:$LAYA_PORT/" > /dev/null 2>&1; then
            echo -e " ${GREEN}ready${NC}"
            break
        fi
        if [ "$i" -eq 60 ]; then
            echo -e " ${YELLOW}still loading (log: $LAYA_LOG)${NC}"
            echo -e "  ${YELLOW}Uploads and secure queries fail closed until it answers.${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
fi

# --- Backend ---
echo -e "${BLUE}[2/3] Starting FastAPI backend...${NC}"
cd "$PROJECT_DIR"
source .venv/bin/activate
python -c "
import uvicorn
from backend.main import app
uvicorn.run(app, host='0.0.0.0', port=$BACKEND_PORT)
" &
BACKEND_PID=$!
echo -e "  ${GREEN}Backend PID: $BACKEND_PID${NC}"

# Wait for backend to be ready
echo -n "  Waiting for backend"
for i in $(seq 1 30); do
    if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e " ${RED}failed${NC}"
        echo -e "${RED}Backend failed to start. Check the output above.${NC}"
        cleanup
        exit 1
    fi
    echo -n "."
    sleep 1
done

# --- Frontend ---
echo -e "${BLUE}[3/3] Starting Vite frontend...${NC}"
cd "$PROJECT_DIR/frontend"
if command -v npm >/dev/null 2>&1; then
    npm run dev -- --port "$FRONTEND_PORT" --host 0.0.0.0 &
    FRONTEND_PID=$!
elif [ -f "./node_modules/.bin/vite" ]; then
    NODE_BIN="$(command -v node 2>/dev/null || echo /home/pavan/qwen3_4b/venv/lib/python3.12/site-packages/playwright/driver/node)"
    "$NODE_BIN" ./node_modules/.bin/vite --port "$FRONTEND_PORT" --host 0.0.0.0 &
    FRONTEND_PID=$!
else
    echo -e "${RED}Neither npm nor node/vite binary was found to launch the frontend.${NC}"
    cleanup
    exit 1
fi
echo -e "  ${GREEN}Frontend PID: $FRONTEND_PID${NC}"

# Wait for frontend to be ready
echo -n "  Waiting for frontend"
for i in $(seq 1 20); do
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    if [ "$i" -eq 20 ]; then
        echo -e " ${YELLOW}still starting (may take a moment)${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  TrustRAG is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:  ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo -e "  API Docs:  ${BLUE}http://localhost:$BACKEND_PORT/docs${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop the services started here."
echo ""

wait

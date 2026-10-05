#!/usr/bin/env bash

# Gracefully terminate all child background processes on exit (Ctrl+C)
trap 'echo -e "\nShutting down DailyBazaar..."; kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM EXIT

echo "============================================="
echo "  Starting DailyBazaar (Backend + Frontend)  "
echo "============================================="

# Detect Python in virtualenv
cd backend
if [ -f "env/Scripts/python" ] || [ -f "env/Scripts/python.exe" ]; then
    PYTHON="./env/Scripts/python"
elif [ -f "env/bin/python" ]; then
    PYTHON="./env/bin/python"
elif [ -f "venv/bin/python" ]; then
    PYTHON="./venv/bin/python"
else
    PYTHON="python"
fi

# Pre-flight credentials & connections status check
$PYTHON check_services.py

# 1. Start Backend
$PYTHON -m uvicorn app.main:app --reload --port 8000 &
cd ..

# 2. Start Frontend
(cd frontend && npm run dev) &

# Keep script running and wait for processes
wait

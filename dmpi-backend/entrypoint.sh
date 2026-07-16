#!/bin/sh
set -e

python migrer.py

exec uvicorn app.main:app --host 0.0.0.0 --port 8000

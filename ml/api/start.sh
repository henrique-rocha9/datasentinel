#!/usr/bin/env bash
# Run from the project root: bash ml/api/start.sh
cd "$(dirname "$0")/../.."

source ml/venv/Scripts/activate 2>/dev/null || source ml/venv/bin/activate

pip install -q -r ml/api/requirements.txt

uvicorn ml.api.server:app --host 0.0.0.0 --port 8000 --reload

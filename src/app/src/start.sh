#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR

export DB_USER="##DB_USER##"
export DB_PASSWORD="##DB_PASSWORD##"
export DB_URL="##DB_URL##"
export TAVILY_API_KEY="##TAVILY_API_KEY##"

source myenv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8080 2>&1 | tee app.log
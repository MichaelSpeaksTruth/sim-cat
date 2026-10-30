#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Building frontend application..."
if command -v npm &> /dev/null; then
    npm install
    npm run build
fi

echo "Build complete."

#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "Installing Python backend dependencies on Render..."
pip install -r requirements.txt

echo "Render Python build complete."

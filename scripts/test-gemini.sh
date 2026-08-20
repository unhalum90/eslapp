#!/bin/bash

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

GOOGLE_IMAGE_API_KEY="${GOOGLE_API_KEY:-$GEMINI_API_KEY}"

if [ -z "$GOOGLE_IMAGE_API_KEY" ]; then
  echo "Error: GOOGLE_API_KEY not found in .env.local"
  exit 1
fi

echo "Checking access to Nano Banana 2: gemini-3.1-flash-image..."

curl -s \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image?key=${GOOGLE_IMAGE_API_KEY}"

#!/bin/bash

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

if [ -z "$GOOGLE_API_KEY" ]; then
  echo "Error: GOOGLE_API_KEY not found in .env.local"
  exit 1
fi

echo "Testing connection to model: gemini-3-flash-preview..."

curl -s -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello, are you there?"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GOOGLE_API_KEY}"

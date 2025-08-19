#!/bin/bash

# Start ComfyUI Server for husk-bank image generation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMFYUI_DIR="$PROJECT_ROOT/../ComfyUI"

if [ ! -d "$COMFYUI_DIR" ]; then
    echo "❌ ComfyUI not found at $COMFYUI_DIR"
    echo "Run ./scripts/setup-comfyui.sh first"
    exit 1
fi

cd "$COMFYUI_DIR"

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found"
    echo "Run ./scripts/setup-comfyui.sh first"
    exit 1
fi

echo "🚀 Starting ComfyUI server..."
echo "Server will be available at http://127.0.0.1:8188"
echo "Press Ctrl+C to stop"

source venv/bin/activate
python main.py --listen 127.0.0.1 --port 8188
#!/bin/bash

# ComfyUI Setup Script for husk-bank project
# Sets up ComfyUI with the workflow for story b-roll image generation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMFYUI_DIR="$PROJECT_ROOT/../ComfyUI"

echo "🔧 Setting up ComfyUI for b-roll image generation..."
echo "Project root: $PROJECT_ROOT"
echo "ComfyUI will be installed at: $COMFYUI_DIR"

# Check if ComfyUI directory exists
if [ ! -d "$COMFYUI_DIR" ]; then
    echo "📥 Cloning ComfyUI..."
    cd "$(dirname "$PROJECT_ROOT")"
    git clone https://github.com/comfyanonymous/ComfyUI.git
else
    echo "✅ ComfyUI already exists at $COMFYUI_DIR"
fi

cd "$COMFYUI_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🚀 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📦 Installing ComfyUI requirements..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Installing basic ComfyUI dependencies..."
    pip install torch torchvision torchaudio xformers
fi

# Install PyTorch with appropriate support
echo "🔥 Installing PyTorch..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - install with MPS support
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
else
    # Linux/Windows - install with CUDA support
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
fi

# Install additional dependencies for API
echo "📦 Installing API dependencies..."
pip install websocket-client requests pillow

# Install custom nodes that might be needed for the workflow
echo "📦 Installing custom nodes..."
cd custom_nodes

# Install ComfyUI-Manager if not present
if [ ! -d "ComfyUI-Manager" ]; then
    echo "Installing ComfyUI Manager..."
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git
fi

cd ..

echo ""
echo "✅ ComfyUI setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your models to the appropriate directories in ComfyUI"
echo "2. Start the ComfyUI server:"
echo "   $COMFYUI_DIR/venv/bin/python main.py --listen 127.0.0.1 --port 8188"
echo ""
echo "3. Then you can generate images with:"
echo "   npm run generate -- \"your concept\" --no-images"
echo "   npm run generate-images ./output/your-story-folder"
echo ""
echo "Or generate story with images in one go:"
echo "   npm run generate -- \"your concept\""
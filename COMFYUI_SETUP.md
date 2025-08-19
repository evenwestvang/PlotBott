# ComfyUI Integration Setup Guide

This guide walks through setting up ComfyUI for automatic b-roll image generation with PlotBott.

## Quick Start

```bash
# 1. Setup ComfyUI (one time)
npm run setup-comfyui

# 2. Start ComfyUI server (in separate terminal)
npm run start-comfyui

# 3. Generate story with images
npm run generate "A cyberpunk story about digital identity"
```

## Detailed Setup

### 1. Install ComfyUI

The setup script will clone ComfyUI to `../ComfyUI` (next to your project) and install dependencies:

```bash
npm run setup-comfyui
```

This script will:
- Clone ComfyUI from GitHub
- Create a Python virtual environment 
- Install PyTorch with CUDA/MPS support
- Install required Python packages
- Setup custom nodes directory

### 2. Install Required Models

You'll need to download and place models in the ComfyUI models directory. The included workflow (`image_gen/comfyui_workflow.json`) expects:

**UNET Model:** (place in `ComfyUI/models/unet/`)
- `qwen-image-Q6_K.gguf`

**CLIP Model:** (place in `ComfyUI/models/clip/`)  
- `qwen_2.5_vl_7b_fp8_scaled.safetensors`

**VAE Model:** (place in `ComfyUI/models/vae/`)
- `qwen_image_vae.safetensors` 

**LoRA Models:** (place in `ComfyUI/models/loras/qwen/`)
- `adorablegirls.safetensors`
- `lenovo.safetensors`

### 3. Start ComfyUI Server

```bash
# Start ComfyUI in headless mode
npm run start-comfyui

# Or manually:
cd ../ComfyUI
source venv/bin/activate  
python main.py --listen 127.0.0.1 --port 8188
```

The server will be available at http://127.0.0.1:8188

### 4. Generate Images

#### With Story Generation
```bash
# Generate complete story with images
npm run generate "A noir detective story in neo-Tokyo"

# Skip images during generation
npm run generate "A space opera" --no-images
```

#### Standalone Image Generation
```bash
# Generate images for existing story
npm run generate-images ./output/2025-08-19-your-story-folder

# Use custom ComfyUI server
npm run generate-images ./output/story --comfyui-server http://localhost:8189
```

## Workflow Configuration

The ComfyUI workflow is located at `image_gen/comfyui_workflow.json`. Key nodes:

- **CLIPTextEncode (Positive):** Receives the b-roll prompt
- **CLIPTextEncode (Negative):** Fixed negative prompt for quality
- **UnetLoaderGGUF:** Loads the Qwen image model
- **LoraLoaderModelOnly:** Applies style LoRAs
- **SaveImage:** Outputs generated images

### Customizing the Workflow

You can modify the workflow by:
1. Loading `image_gen/comfyui_workflow.json` in ComfyUI web interface
2. Making changes (models, settings, etc.)
3. Exporting the updated workflow
4. Replacing the JSON file

Or specify a custom workflow path:
```bash
npm run generate "concept" --comfyui-workflow ./my-custom-workflow.json
```

## Prompt Format

B-roll prompts are automatically generated from story data with this structure:

```
[Character descriptions], [activity], at [location description], [framing], [setting details], [time/weather], candid, amateur
```

Example:
```
Maya Chen, early 30s, Sleek black bob with data-tracking clips, Clear polymer blazer, analyzing floating data displays, at The Central Trust Exchange, Vast circular atrium with spiraling glass levels, through glass, transparent workstation with holographic data, day clear, candid, amateur
```

## Troubleshooting

### ComfyUI Server Won't Start
- Check Python installation: `python3 --version`
- Verify virtual environment: `ls ../ComfyUI/venv/`
- Check for model compatibility issues in ComfyUI console

### No Images Generated
- Verify ComfyUI server is running: http://127.0.0.1:8188
- Check that all required models are installed
- Review ComfyUI console for workflow errors
- Ensure sufficient disk space and memory

### Workflow Errors
- Missing models: Download required model files
- Node errors: Update ComfyUI and custom nodes
- Memory issues: Reduce batch size or image dimensions

### Custom Models
To use different models, update the workflow nodes:
- **UnetLoaderGGUF:** Change `widgets_values[0]` to your UNET filename
- **CLIPLoader:** Change `widgets_values[0]` to your CLIP filename  
- **VAELoader:** Change `widgets_values[0]` to your VAE filename

## Performance Notes

- Image generation time varies by model size and hardware
- Expect 30-120 seconds per image depending on settings
- GPU acceleration significantly improves performance
- Generation runs in series to avoid overwhelming the server

## Integration Architecture

```
PlotBott → Generates broll_image_brief for each scene
         ↓
ComfyUI Generator → Converts prompts and executes workflow  
         ↓
ComfyUI Server → Generates images using local models
         ↓
File Output → Saves images and metadata to output/images/
```

The integration preserves all the McKee dramatic structure while adding visual generation that respects scene context and character consistency.
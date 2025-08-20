#!/usr/bin/env python3
"""
ComfyUI Image Generator - Working version using direct API calls
"""

import sys
import re
import json
import os
import requests
import time
from pathlib import Path

def parse_broll_prompts(markdown_file):
    """Parse broll prompts from markdown file"""
    with open(markdown_file, 'r') as f:
        content = f.read()
    
    prompts = []
    # Find all diffusion prompts in code blocks
    pattern = r'## Scene (\d+).*?```\n(.*?)\n```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for scene_num, prompt in matches:
        # Get episode number from the content before this scene
        episode_pattern = r'# Episode (\d+) B-roll Prompts'
        episode_matches = re.findall(episode_pattern, content)
        episode_num = episode_matches[-1] if episode_matches else "1"
        
        prompts.append({
            'episode': int(episode_num),
            'scene': int(scene_num),
            'prompt': prompt.strip()
        })
    
    return prompts

def generate_image(prompt_text, output_path, workflow_path):
    """Generate single image using ComfyUI direct API"""
    try:
        # Load and modify workflow
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        # Simple prompt injection - find positive CLIPTextEncode node and update it
        if 'nodes' in workflow:
            for node in workflow['nodes']:
                if node.get('type') == 'CLIPTextEncode' and 'widgets_values' in node:
                    # Update positive prompts only (skip negative)
                    title = node.get('title', '').lower()
                    if 'negative' not in title:
                        node['widgets_values'] = [prompt_text]
                        print(f"🔧 Updated prompt in node: {title}")
                        break
        
        # Submit workflow directly to ComfyUI
        print("🚀 Submitting to ComfyUI...")
        response = requests.post(
            "http://127.0.0.1:8188/prompt",
            json={"prompt": workflow}
        )
        
        if response.status_code == 200:
            result = response.json()
            prompt_id = result.get('prompt_id')
            print(f"✅ Submitted! Prompt ID: {prompt_id}")
            
            # Wait for completion
            for i in range(60):  # Wait up to 60 seconds
                history_response = requests.get(f"http://127.0.0.1:8188/history/{prompt_id}")
                if history_response.status_code == 200:
                    history = history_response.json()
                    if prompt_id in history:
                        outputs = history[prompt_id].get('outputs', {})
                        if outputs:
                            print(f"🎉 Generation complete!")
                            # Look for saved images
                            for node_id, output in outputs.items():
                                if 'images' in output:
                                    for img in output['images']:
                                        # Copy from ComfyUI output to our desired location
                                        source_path = f"/Users/even/projects/personal/ComfyUI/output/{img['filename']}"
                                        if os.path.exists(source_path):
                                            import shutil
                                            shutil.copy2(source_path, output_path)
                                            print(f"📸 Generated: {output_path}")
                                            return True
                            break
                time.sleep(1)
            
            print("⏰ Timeout waiting for image generation")
            return False
            
        else:
            print(f"❌ Failed to submit: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error generating image: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-images-working.py <story-output-dir>")
        sys.exit(1)
    
    story_dir = Path(sys.argv[1])
    broll_file = story_dir / "broll-prompts.md"
    images_dir = story_dir / "images"
    
    if not broll_file.exists():
        print(f"❌ Broll prompts not found: {broll_file}")
        sys.exit(1)
    
    # Create images directory
    images_dir.mkdir(exist_ok=True)
    
    # Use mall-deths workflow that works with Qwen-Image
    workflow_path = "/Users/even/projects/personal/mall-deths/comfyui_workflow.json"
    if not Path(workflow_path).exists():
        print(f"❌ Workflow not found: {workflow_path}")
        sys.exit(1)
    
    # Parse prompts
    print("📝 Parsing broll prompts...")
    prompts = parse_broll_prompts(broll_file)
    print(f"Found {len(prompts)} prompts")
    
    # Generate images - just try first one for now
    prompt_data = prompts[0]  # Test with first prompt
    episode = prompt_data['episode']
    scene = prompt_data['scene']
    prompt_text = prompt_data['prompt']
    
    output_file = images_dir / f"episode-{episode}-scene-{scene}.png"
    
    print(f"\n🎨 Generating Episode {episode}, Scene {scene}")
    print(f"📝 Prompt: {prompt_text[:100]}...")
    
    if generate_image(prompt_text, output_file, workflow_path):
        print("✅ SUCCESS! Generated first image")
    else:
        print("❌ Failed to generate image")

if __name__ == "__main__":
    main()
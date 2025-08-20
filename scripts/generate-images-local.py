#!/usr/bin/env python3
"""
Simple ComfyUI image generator - just parse markdown and generate images
"""

import sys
import re
import json
import os
from pathlib import Path
from comfy_api_simplified import ComfyApiWrapper, ComfyWorkflowWrapper

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
    """Generate single image using ComfyUI"""
    try:
        # Initialize ComfyUI API
        api = ComfyApiWrapper("http://127.0.0.1:8188")
        
        # Load workflow as ComfyWorkflowWrapper then convert to dict
        workflow = ComfyWorkflowWrapper(workflow_path)
        workflow_dict = dict(workflow)
        
        # Simple prompt injection - find positive CLIPTextEncode node and update it
        if 'nodes' in workflow_dict:
            for node in workflow_dict['nodes']:
                if node.get('type') == 'CLIPTextEncode' and 'widgets_values' in node:
                    # Update positive prompts only (skip negative)
                    title = node.get('title', '').lower()
                    if 'negative' not in title:
                        node['widgets_values'] = [prompt_text]
        
        # Generate image - use the exact same call as mall-deths
        results = api.queue_and_wait_images(workflow_dict, save_previews=True)
        
        if results and len(results) > 0:
            # Save the first image (get first result from dictionary)
            first_result = next(iter(results.values()))
            with open(output_path, 'wb') as f:
                f.write(first_result)
            print(f"✅ Generated: {output_path}")
            return True
        else:
            print(f"❌ No images generated for prompt: {prompt_text[:50]}...")
            return False
            
    except Exception as e:
        print(f"❌ Error generating image: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-images.py <story-output-dir>")
        sys.exit(1)
    
    story_dir = Path(sys.argv[1])
    broll_file = story_dir / "broll-prompts.md"
    images_dir = story_dir / "images"
    
    if not broll_file.exists():
        print(f"❌ Broll prompts not found: {broll_file}")
        sys.exit(1)
    
    # Create images directory
    images_dir.mkdir(exist_ok=True)
    
    # Use mall-deths workflow that we know works
    workflow_path = "/Users/even/projects/personal/mall-deths/comfyui_workflow.json"
    if not Path(workflow_path).exists():
        print(f"❌ Workflow not found: {workflow_path}")
        sys.exit(1)
    
    # Parse prompts
    print("📝 Parsing broll prompts...")
    prompts = parse_broll_prompts(broll_file)
    print(f"Found {len(prompts)} prompts")
    
    # Generate images
    generated = 0
    for i, prompt_data in enumerate(prompts):
        episode = prompt_data['episode']
        scene = prompt_data['scene']
        prompt_text = prompt_data['prompt']
        
        output_file = images_dir / f"episode-{episode}-scene-{scene}.png"
        
        print(f"\n🎨 [{i+1}/{len(prompts)}] Generating Episode {episode}, Scene {scene}")
        print(f"📝 Prompt: {prompt_text[:100]}...")
        
        if generate_image(prompt_text, output_file, workflow_path):
            generated += 1
        
        # Small delay between generations
        import time
        time.sleep(1)
    
    print(f"\n🎉 Complete! Generated {generated}/{len(prompts)} images")

if __name__ == "__main__":
    main()
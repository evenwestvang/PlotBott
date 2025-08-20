#!/usr/bin/env python3
import json
import requests

# Test submitting the exact mall-deths workflow
workflow_path = "/Users/even/projects/personal/mall-deths/comfyui_workflow.json"

with open(workflow_path, 'r') as f:
    workflow = json.load(f)

print("📄 Loaded workflow with keys:", list(workflow.keys())[:10])

# Try to find and update a positive prompt
if 'nodes' in workflow:
    for i, node in enumerate(workflow['nodes']):
        if node.get('type') == 'CLIPTextEncode':
            title = node.get('title', '').lower()
            print(f"Found CLIPTextEncode node {i}: {title}")
            if 'negative' not in title:
                print(f"Updating positive prompt node {i}")
                node['widgets_values'] = ["a beautiful landscape"]
                break

print("🚀 Submitting workflow to ComfyUI...")

try:
    response = requests.post(
        "http://127.0.0.1:8188/prompt",
        json={"prompt": workflow}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Success! Prompt ID: {result.get('prompt_id')}")
    else:
        print(f"❌ Failed with status {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {e}")
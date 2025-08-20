#!/usr/bin/env python3
import json

# Convert ComfyUI Web UI workflow format to API format
def convert_workflow_to_api(workflow):
    """Convert ComfyUI Web UI workflow to API format"""
    api_workflow = {}
    
    if 'nodes' in workflow:
        for node in workflow['nodes']:
            node_id = str(node['id'])
            
            # Convert to API format
            api_node = {
                "class_type": node['type'],
                "inputs": {}
            }
            
            # Add meta information
            if 'title' in node:
                api_node["_meta"] = {"title": node['title']}
            
            # Convert widgets_values to inputs
            if 'widgets_values' in node:
                # For CLIPTextEncode, the first widget_value is the text
                if node['type'] == 'CLIPTextEncode':
                    api_node["inputs"]["text"] = node['widgets_values'][0]
                # Add other widget conversions as needed
            
            # Convert input connections
            if 'inputs' in node:
                for input_info in node['inputs']:
                    input_name = input_info['name']
                    if 'link' in input_info:
                        # Find the source node for this link
                        link_id = input_info['link']
                        # Find the link in the links array
                        if 'links' in workflow:
                            for link in workflow['links']:
                                if link[0] == link_id:
                                    source_node_id = str(link[1])
                                    source_output_index = link[2]
                                    api_node["inputs"][input_name] = [source_node_id, source_output_index]
                                    break
            
            api_workflow[node_id] = api_node
    
    return api_workflow

# Test conversion
workflow_path = "/Users/even/projects/personal/mall-deths/comfyui_workflow.json"

with open(workflow_path, 'r') as f:
    web_workflow = json.load(f)

print("🔄 Converting workflow format...")
api_workflow = convert_workflow_to_api(web_workflow)

print(f"✅ Converted {len(api_workflow)} nodes")

# Update the positive prompt
for node_id, node in api_workflow.items():
    if node.get("class_type") == "CLIPTextEncode":
        title = node.get("_meta", {}).get("title", "").lower()
        if "negative" not in title:
            print(f"📝 Updating positive prompt in node {node_id}")
            node["inputs"]["text"] = "a beautiful test landscape"
            break

print("🚀 Testing converted workflow...")

import requests
try:
    response = requests.post(
        "http://127.0.0.1:8188/prompt",
        json={"prompt": api_workflow}
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Success! Prompt ID: {result.get('prompt_id')}")
    else:
        print(f"❌ Failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
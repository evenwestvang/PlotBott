#!/usr/bin/env python3
from comfy_api_simplified import ComfyWorkflowWrapper

workflow_path = "/Users/even/projects/personal/mall-deths/comfyui_workflow.json"
workflow = ComfyWorkflowWrapper(workflow_path)

print("Available nodes:")
for node in workflow.list_nodes():
    print(f"  - {node}")

print("\nLooking for CLIPTextEncode nodes...")
# Try to get specific info about nodes
import json
with open(workflow_path, 'r') as f:
    data = json.load(f)

for node_id, node_data in data.items():
    if isinstance(node_data, dict) and node_data.get('class_type') == 'CLIPTextEncode':
        print(f"Found CLIPTextEncode node {node_id}: {node_data}")
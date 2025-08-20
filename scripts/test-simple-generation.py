#!/usr/bin/env python3
import json
import requests
import time

# Simple working workflow for testing
simple_workflow = {
    "3": {
        "inputs": {
            "seed": 123456,
            "steps": 20,
            "cfg": 8.0,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1.0,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
        },
        "class_type": "KSampler",
        "_meta": {"title": "KSampler"}
    },
    "4": {
        "inputs": {
            "ckpt_name": "flux1-dev-fp8.safetensors"
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {"title": "Load Checkpoint"}
    },
    "5": {
        "inputs": {
            "width": 1024,
            "height": 1024,
            "batch_size": 1
        },
        "class_type": "EmptyLatentImage",
        "_meta": {"title": "Empty Latent Image"}
    },
    "6": {
        "inputs": {
            "text": "Elena Martinez, 40s, Latina food critic, examining a dish",
            "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {"title": "CLIP Text Encode (Positive)"}
    },
    "7": {
        "inputs": {
            "text": "blurry, low quality, text, watermark",
            "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {"title": "CLIP Text Encode (Negative)"}
    },
    "8": {
        "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
        },
        "class_type": "VAEDecode",
        "_meta": {"title": "VAE Decode"}
    },
    "9": {
        "inputs": {
            "filename_prefix": "husk-bank-test",
            "images": ["8", 0]
        },
        "class_type": "SaveImage",
        "_meta": {"title": "Save Image"}
    }
}

print("🚀 Testing simple image generation...")

try:
    response = requests.post(
        "http://127.0.0.1:8188/prompt",
        json={"prompt": simple_workflow}
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        prompt_id = result.get('prompt_id')
        print(f"✅ Success! Prompt ID: {prompt_id}")
        
        # Wait for completion and check results
        print("⏳ Waiting for generation to complete...")
        
        for i in range(30):  # Wait up to 30 seconds
            history_response = requests.get(f"http://127.0.0.1:8188/history/{prompt_id}")
            if history_response.status_code == 200:
                history = history_response.json()
                if prompt_id in history:
                    outputs = history[prompt_id].get('outputs', {})
                    if outputs:
                        print(f"🎉 Generation complete! Outputs: {list(outputs.keys())}")
                        # Check if images were saved
                        for node_id, output in outputs.items():
                            if 'images' in output:
                                for img in output['images']:
                                    print(f"📸 Generated image: {img['filename']}")
                        break
            time.sleep(1)
        else:
            print("⏰ Timeout waiting for results")
            
    else:
        print(f"❌ Failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
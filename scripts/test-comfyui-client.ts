#!/usr/bin/env node
/**
 * Test ComfyUI client connection and basic functionality
 */

import { ComfyUIApiClient } from '@stable-canvas/comfyui-client';

async function testComfyUIClient() {
  try {
    console.log('🔌 Testing ComfyUI client connection...');
    
    // Initialize ComfyUI client
    const client = new ComfyUIApiClient({
      api_host: 'http://127.0.0.1:8188',
    });
    
    // Test basic connection
    console.log('📡 Testing connection to ComfyUI server...');
    
    // Get system info
    const systemStats = await client.getSystemStats();
    console.log('✅ Connected to ComfyUI server');
    console.log('📊 System stats:', systemStats);
    
    // Get available models 
    const objectInfo = await client.getNodeDefs();
    console.log('📦 Available nodes:', Object.keys(objectInfo).length);
    
    // Check for checkpoint models
    const checkpointLoader = objectInfo.CheckpointLoaderSimple;
    if (checkpointLoader && checkpointLoader.input.required.ckpt_name) {
      const availableModels = checkpointLoader.input.required.ckpt_name[0];
      console.log('🤖 Available models:', availableModels.length > 0 ? availableModels : 'None');
    }
    
    console.log('🎉 ComfyUI client test completed successfully!');
    
  } catch (error) {
    console.error('❌ ComfyUI client test failed:', error);
    process.exit(1);
  }
}

// Run the test
testComfyUIClient();
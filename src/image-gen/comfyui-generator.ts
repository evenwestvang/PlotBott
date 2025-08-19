import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { StoryGenerator } from '../generators/index.js';
import type { GenerationContext, SceneUnit } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ComfyUIWorkflow {
  nodes: Array<{
    id: number;
    type: string;
    title?: string;
    widgets_values?: any[];
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface ComfyUIResponse {
  prompt_id: string;
  number: number;
  node_errors?: any;
}

interface ComfyUIHistoryEntry {
  status?: {
    completed?: boolean;
  };
  outputs?: {
    [nodeId: string]: {
      images?: Array<{
        filename: string;
        subfolder?: string;
        type?: string;
      }>;
    };
  };
}

export class ComfyUIGenerator {
  private serverUrl: string = 'http://127.0.0.1:8188';
  private workflow: ComfyUIWorkflow | null = null;
  private workflowPath: string;

  constructor(serverUrl?: string, workflowPath?: string) {
    this.serverUrl = serverUrl || 'http://127.0.0.1:8188';
    this.workflowPath = workflowPath || join(__dirname, '../../image_gen/comfyui_workflow.json');
  }

  async initialize(): Promise<boolean> {
    try {
      await this.loadWorkflow();
      return await this.checkServerStatus();
    } catch (error) {
      console.error('Failed to initialize ComfyUI Generator:', error);
      return false;
    }
  }

  private async loadWorkflow(): Promise<void> {
    try {
      const workflowData = await fs.readFile(this.workflowPath, 'utf8');
      this.workflow = JSON.parse(workflowData);
      console.log('✅ ComfyUI workflow loaded');
    } catch (error) {
      throw new Error(`Failed to load workflow from ${this.workflowPath}: ${error}`);
    }
  }

  private async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/system_stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.warn('⚠️ ComfyUI server not available. Start it with: ./bin/start-comfyui-server.sh');
      return false;
    }
  }

  private updateWorkflowPrompt(workflow: ComfyUIWorkflow, prompt: string): void {
    // Find the positive prompt node (CLIPTextEncode with title containing "Positive")
    const positivePromptNode = workflow.nodes.find(
      node => node.type === 'CLIPTextEncode' && 
               (node.title?.toLowerCase().includes('positive') || !node.title?.toLowerCase().includes('negative'))
    );

    if (positivePromptNode && positivePromptNode.widgets_values) {
      positivePromptNode.widgets_values[0] = prompt;
    } else {
      console.warn('Could not find positive prompt node in workflow');
    }
  }

  private async queuePrompt(workflow: ComfyUIWorkflow): Promise<string> {
    const promptData = { prompt: workflow };
    
    const response = await fetch(`${this.serverUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptData)
    });

    if (!response.ok) {
      throw new Error(`Failed to queue prompt: ${response.statusText}`);
    }

    const result = await response.json() as ComfyUIResponse;
    
    if (result.node_errors && Object.keys(result.node_errors).length > 0) {
      throw new Error(`Workflow errors: ${JSON.stringify(result.node_errors)}`);
    }

    return result.prompt_id;
  }

  private async waitForCompletion(promptId: string, timeoutMs: number = 120000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.serverUrl}/history/${promptId}`);
        if (response.ok) {
          const history = await response.json() as { [key: string]: ComfyUIHistoryEntry };
          if (history[promptId] && history[promptId].status?.completed) {
            return;
          }
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn('Error checking completion status:', error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error(`Timeout waiting for image generation (${timeoutMs}ms)`);
  }

  private async getGeneratedImages(promptId: string): Promise<Buffer[]> {
    const response = await fetch(`${this.serverUrl}/history/${promptId}`);
    if (!response.ok) {
      throw new Error('Failed to get generation history');
    }

    const history = await response.json() as { [key: string]: ComfyUIHistoryEntry };
    const outputs = history[promptId]?.outputs;
    
    if (!outputs) {
      throw new Error('No outputs found in generation history');
    }

    const images: Buffer[] = [];
    
    // Find SaveImage node outputs
    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput.images) {
        for (const imageInfo of nodeOutput.images) {
          const imageResponse = await fetch(`${this.serverUrl}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type || 'output'}`);
          if (imageResponse.ok) {
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            images.push(imageBuffer);
          }
        }
      }
    }

    return images;
  }

  async generateSceneImage(scene: SceneUnit, context: GenerationContext, episodeNum: number, outputDir: string): Promise<string | null> {
    try {
      // Build the prompt from scene's broll data
      const prompt = await this.buildPromptFromScene(scene, context, outputDir, episodeNum);
      console.log(`🎨 Generating image for Episode ${episodeNum}, Scene ${scene.scene_no}`);
      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

      // Use local ComfyUI installation
      const projectRoot = join(__dirname, '../../');
      const comfyUIPath = join(projectRoot, 'bin/ComfyUI');
      const imagesDir = join(outputDir, 'images');
      await fs.mkdir(imagesDir, { recursive: true });

      // Call the Python ComfyUI generator
      const pythonResult = await this.runPythonComfyUI(comfyUIPath, prompt, imagesDir, `ep${episodeNum}-sc${scene.scene_no}`);

      if (pythonResult) {
        console.log(`✅ Image saved: ${pythonResult}`);
        
        // Save prompt metadata
        const metadataPath = pythonResult.replace('.png', '.txt');
        const metadata = `Episode ${episodeNum}, Scene ${scene.scene_no}
Generated: ${new Date().toISOString()}
Prompt: ${prompt}

Scene Context:
- Location: ${scene.setting.loc_id}
- Characters: ${scene.characters_present.join(', ')}
- Objective: ${scene.objective}
- Value Shift: ${scene.scene_value_shift.from} → ${scene.scene_value_shift.to}
`;
        
        await fs.writeFile(metadataPath, metadata, 'utf8');
        return pythonResult;
      }

      return null;

    } catch (error) {
      console.error(`Failed to generate image for Scene ${scene.scene_no}:`, error);
      return null;
    }
  }

  private async runPythonComfyUI(comfyUIPath: string, prompt: string, outputDir: string, filename: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      // Create a direct ComfyUI API script using the workflow from mall-deths
      const mallDeathsWorkflow = '/Users/even/projects/personal/mall-deths/comfyui_workflow.json';
      const pythonScript = `
import sys
import os
import json
import requests
import time
import random
from datetime import datetime

# Add mall-deths to path to access the workflow
workflow_path = '${mallDeathsWorkflow}'

try:
    # Load the workflow - use it as-is, just update the prompt text
    with open(workflow_path, 'r') as f:
        workflow = json.load(f)
    
    prompt_text = '''${prompt.replace(/'/g, "\\'")}'''
    
    # Find and update the positive prompt node
    for node in workflow.get('nodes', []):
        if node.get('type') == 'CLIPTextEncode':
            # Update the first CLIPTextEncode node's text (positive prompt)
            if 'widgets_values' in node and len(node['widgets_values']) > 0:
                node['widgets_values'][0] = prompt_text
                break
    
    # Queue the workflow directly (web format should work)
    server_url = 'http://127.0.0.1:8188'
    prompt_data = {'prompt': workflow}
    
    response = requests.post(f'{server_url}/prompt', 
                           headers={'Content-Type': 'application/json'},
                           json=prompt_data)
    
    if response.status_code == 200:
        result = response.json()
        prompt_id = result.get('prompt_id')
        
        if prompt_id:
            # Wait for completion
            max_wait = 120  # 2 minutes
            wait_time = 0
            
            while wait_time < max_wait:
                time.sleep(2)
                wait_time += 2
                
                history_response = requests.get(f'{server_url}/history/{prompt_id}')
                if history_response.status_code == 200:
                    history = history_response.json()
                    if prompt_id in history and history[prompt_id].get('status', {}).get('completed'):
                        # Get generated images
                        outputs = history[prompt_id].get('outputs', {})
                        
                        for node_id, node_output in outputs.items():
                            if 'images' in node_output:
                                for img_info in node_output['images']:
                                    img_filename = img_info['filename']
                                    img_subfolder = img_info.get('subfolder', '')
                                    img_type = img_info.get('type', 'output')
                                    
                                    # Download the image
                                    img_url = f'{server_url}/view?filename={img_filename}&subfolder={img_subfolder}&type={img_type}'
                                    img_response = requests.get(img_url)
                                    
                                    if img_response.status_code == 200:
                                        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                                        new_filename = f'{filename}-{timestamp}.png'
                                        new_path = os.path.join('${outputDir}', new_filename)
                                        
                                        with open(new_path, 'wb') as f:
                                            f.write(img_response.content)
                                        
                                        print(f"SUCCESS:{new_path}")
                                        exit(0)
                        
                        print("ERROR:No images found in output")
                        exit(1)
            
            print("ERROR:Timeout waiting for generation")
            exit(1)
        else:
            print("ERROR:No prompt_id returned")
            exit(1)
    else:
        print(f"ERROR:Failed to queue prompt: {response.status_code} {response.text}")
        exit(1)
        
except Exception as e:
    print(f"ERROR:{str(e)}")
    exit(1)
`;

      const python = spawn('python', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS:')) {
          const imagePath = output.split('SUCCESS:')[1].trim();
          resolve(imagePath);
        } else {
          console.error('Python ComfyUI error:', error);
          console.error('Python ComfyUI output:', output);
          resolve(null);
        }
      });

      // Set timeout
      setTimeout(() => {
        python.kill();
        reject(new Error('ComfyUI generation timeout'));
      }, 120000); // 2 minute timeout
    });
  }

  private async buildPromptFromScene(scene: SceneUnit, context: GenerationContext, outputDir: string, episodeNum: number): Promise<string> {
    // Try to read the generated broll-prompts.md file and extract the prompt
    const brollPromptsPath = join(outputDir, 'broll-prompts.md');
    
    try {
      const brollContent = await fs.readFile(brollPromptsPath, 'utf8');
      
      // Look for the specific scene prompt using regex
      const scenePattern = new RegExp(`# Episode ${episodeNum} B-roll Prompts[\\s\\S]*?## Scene ${scene.scene_no}[\\s\\S]*?\`\`\`([\\s\\S]*?)\`\`\``, 'i');
      const match = brollContent.match(scenePattern);
      
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (error) {
      console.warn(`Could not read broll-prompts.md: ${error}`);
    }
    
    // Fallback: build a simple prompt from available data
    const broll = scene.broll_image_brief;
    const chars = scene.characters_present.slice(0, 2); // Max 2 for diffusion
    
    const charNames: string[] = [];
    for (const charId of chars) {
      const char = context.characters?.characters.find(c => c.id === charId);
      if (char) {
        charNames.push(`${char.name}, ${char.visual_bible.age_range}`);
      }
    }
    
    const location = context.locations?.locations.find(l => l.id === scene.setting.loc_id);
    const locationName = location ? location.name : scene.setting.loc_id;
    
    const parts = [
      charNames.join(' and '),
      broll.activity_suggestion || 'interacting',
      `at ${locationName}`,
      broll.framing?.replace(/_/g, ' ') || 'medium shot',
      `${scene.setting.time} ${scene.setting.weather}`.trim() || 'day clear',
      'candid, amateur'
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  async generateBrollImages(context: GenerationContext, outputDir: string): Promise<void> {
    if (!context.scenes) {
      console.log('No scenes found for image generation');
      return;
    }

    console.log('🎬 Starting b-roll image generation with ComfyUI...');
    
    let totalGenerated = 0;
    let totalFailed = 0;

    for (const scenePlan of context.scenes) {
      console.log(`\n📺 Generating images for Episode ${scenePlan.episode_no}...`);
      
      for (const scene of scenePlan.scenes) {
        const imagePath = await this.generateSceneImage(scene, context, scenePlan.episode_no, outputDir);
        
        if (imagePath) {
          totalGenerated++;
        } else {
          totalFailed++;
        }
        
        // Small delay between generations to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Image generation complete!`);
    console.log(`✅ Generated: ${totalGenerated} images`);
    if (totalFailed > 0) {
      console.log(`❌ Failed: ${totalFailed} images`);
    }
  }
}
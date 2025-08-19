import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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

  async generateSceneImage(scene: SceneUnit, context: GenerationContext, episodeNum: number): Promise<string | null> {
    if (!this.workflow) {
      console.error('Workflow not loaded');
      return null;
    }

    if (!await this.checkServerStatus()) {
      console.error('ComfyUI server not available');
      return null;
    }

    try {
      // Build the prompt from scene's broll data
      const prompt = this.buildPromptFromScene(scene, context);
      console.log(`🎨 Generating image for Episode ${episodeNum}, Scene ${scene.scene_no}`);
      console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

      // Create a copy of the workflow and update the prompt
      const workflowCopy = JSON.parse(JSON.stringify(this.workflow));
      this.updateWorkflowPrompt(workflowCopy, prompt);

      // Queue the prompt and wait for completion
      const promptId = await this.queuePrompt(workflowCopy);
      await this.waitForCompletion(promptId);

      // Get the generated images
      const images = await this.getGeneratedImages(promptId);
      
      if (images.length === 0) {
        console.error('No images generated');
        return null;
      }

      // Save the first image
      const outputDir = join(process.cwd(), 'output', 'images');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `episode-${episodeNum}-scene-${scene.scene_no}-${timestamp}.png`;
      const imagePath = join(outputDir, filename);

      await fs.writeFile(imagePath, images[0]);
      console.log(`✅ Image saved: ${imagePath}`);

      // Save prompt metadata
      const metadataPath = imagePath.replace('.png', '.txt');
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

      return imagePath;

    } catch (error) {
      console.error(`Failed to generate image for Scene ${scene.scene_no}:`, error);
      return null;
    }
  }

  private buildPromptFromScene(scene: SceneUnit, context: GenerationContext): string {
    const broll = scene.broll_image_brief;
    
    // Build character descriptions using frame-specific recasts
    const charDescriptions: string[] = [];
    for (const recast of broll.subject_recasts) {
      const char = context.characters?.characters.find(c => c.id === recast.char_id);
      
      if (char) {
        const parts = [
          char.name,
          char.visual_bible.age_range,
          recast.ethnicity,
          recast.skin_tone,
          recast.eye_color,
          char.visual_bible.hair,
          ...recast.frame_specific_traits,
          ...recast.frame_clothing_details,
          recast.expression_state
        ].filter(Boolean);
        
        charDescriptions.push(parts.join(', '));
      }
    }
    
    // Build location description from frame-specific setting
    const location = context.locations?.locations.find(l => l.id === scene.setting.loc_id);
    const baseLoc = location ? location.name : scene.setting.loc_id;
    
    const settingParts = [
      baseLoc,
      ...broll.frame_specific_setting.visible_objects,
      ...broll.frame_specific_setting.atmospheric_elements,
      ...broll.frame_specific_setting.composition_elements
    ].filter(Boolean);
    
    // Combine elements
    const parts = [
      charDescriptions.join(' and '),
      broll.activity_suggestion,
      `at ${settingParts.join(', ')}`,
      broll.framing.replace(/_/g, ' '),
      broll.frame_specific_setting.lighting_quality,
      `${scene.setting.time} ${scene.setting.weather}`.trim(),
      broll.keywords.join(', ')
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
        const imagePath = await this.generateSceneImage(scene, context, scenePlan.episode_no);
        
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
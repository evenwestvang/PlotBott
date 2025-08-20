#!/usr/bin/env node
/**
 * ComfyUI Image Generator - TypeScript version using @stable-canvas/comfyui-client
 */

import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { ComfyApi } from '@stable-canvas/comfyui-client';

interface BrollPrompt {
  episode: number;
  scene: number;
  prompt: string;
}

/**
 * Parse broll prompts from markdown file
 */
async function parseBrollPrompts(markdownFile: string): Promise<BrollPrompt[]> {
  const content = await readFile(markdownFile, 'utf8');
  const prompts: BrollPrompt[] = [];
  
  // Find all diffusion prompts in code blocks
  const pattern = /## Scene (\d+).*?```\n(.*?)\n```/gs;
  const matches = content.matchAll(pattern);
  
  for (const match of matches) {
    const sceneNum = parseInt(match[1]);
    const prompt = match[2].trim();
    
    // Get episode number from the content before this scene
    const episodePattern = /# Episode (\d+) B-roll Prompts/g;
    const episodeMatches = content.matchAll(episodePattern);
    const episodeNumbers = Array.from(episodeMatches).map(m => parseInt(m[1]));
    const episodeNum = episodeNumbers[episodeNumbers.length - 1] || 1;
    
    prompts.push({
      episode: episodeNum,
      scene: sceneNum,
      prompt
    });
  }
  
  return prompts;
}

/**
 * Generate single image using ComfyUI
 */
async function generateImage(
  promptText: string, 
  outputPath: string, 
  workflowPath: string
): Promise<boolean> {
  try {
    console.log(`🎨 Generating: ${outputPath}`);
    console.log(`📝 Prompt: ${promptText.slice(0, 100)}...`);
    
    // Initialize ComfyUI client
    const client = new ComfyApi({
      endpoint: 'http://127.0.0.1:8188',
    });
    
    // Load workflow
    const workflowContent = await readFile(workflowPath, 'utf8');
    const workflow = JSON.parse(workflowContent);
    
    // Simple prompt injection - find positive CLIPTextEncode node and update it
    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        if (node.type === 'CLIPTextEncode' && node.widgets_values) {
          // Update positive prompts only (skip negative)
          const title = (node.title || '').toLowerCase();
          if (!title.includes('negative')) {
            node.widgets_values = [promptText];
            break;
          }
        }
      }
    }
    
    // Submit workflow for processing and get results
    const result = await client.queuePrompt(workflow);
    const images = await client.getImages(result.prompt_id);
    
    if (images && images.length > 0) {
      // Save the first image
      const imageBuffer = images[0].buffer;
      await writeFile(outputPath, imageBuffer);
      console.log(`✅ Generated: ${outputPath}`);
      return true;
    } else {
      console.log(`❌ No images generated`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error generating image: ${error}`);
    return false;
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: npx tsx generate-images.ts <story-output-dir>');
    process.exit(1);
  }
  
  const storyDir = resolve(process.argv[2]);
  const brollFile = join(storyDir, 'broll-prompts.md');
  const imagesDir = join(storyDir, 'images');
  
  try {
    await readFile(brollFile, 'utf8');
  } catch {
    console.log(`❌ Broll prompts not found: ${brollFile}`);
    process.exit(1);
  }
  
  // Create images directory
  await mkdir(imagesDir, { recursive: true });
  
  // Use mall-deths workflow
  const workflowPath = '/Users/even/projects/personal/mall-deths/comfyui_workflow.json';
  try {
    await readFile(workflowPath, 'utf8');
  } catch {
    console.log(`❌ Workflow not found: ${workflowPath}`);
    process.exit(1);
  }
  
  // Parse prompts
  console.log('📝 Parsing broll prompts...');
  const prompts = await parseBrollPrompts(brollFile);
  console.log(`Found ${prompts.length} prompts`);
  
  // Generate images
  let generated = 0;
  for (let i = 0; i < prompts.length; i++) {
    const promptData = prompts[i];
    const outputFile = join(imagesDir, `episode-${promptData.episode}-scene-${promptData.scene}.png`);
    
    console.log(`\n🎨 [${i + 1}/${prompts.length}] Generating Episode ${promptData.episode}, Scene ${promptData.scene}`);
    
    if (await generateImage(promptData.prompt, outputFile, workflowPath)) {
      generated++;
    }
    
    // Small delay between generations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n🎉 Complete! Generated ${generated}/${prompts.length} images`);
}

if (require.main === module) {
  main().catch(console.error);
}
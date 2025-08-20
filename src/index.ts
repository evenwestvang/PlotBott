#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { join } from 'path';
import { StoryGenerator } from './generators/index.js';
import { ComfyUIGenerator } from './image-gen/comfyui-generator.js';
import type { GenerationContext } from './types/index.js';

const program = new Command();

program
  .name('plotbott')
  .description('AI-powered story generation with comprehensive narrative structure')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a complete story from concept to scenes')
  .argument('[concept]', 'Core story concept', 'A world where trust is currency')
  .option('-e, --episodes <number>', 'Number of episodes to generate', '6')
  .option('-o, --output <directory>', 'Output directory (auto-generated if not specified)')
  .option('--json-only', 'Only output raw JSON files')
  .option('--no-broll-prompts', 'Skip generating b-roll diffusion prompts')
  .option('--images', 'Generate b-roll images with ComfyUI (requires setup)')
  .option('--comfyui-server <url>', 'ComfyUI server URL', 'http://127.0.0.1:8188')
  .option('--comfyui-workflow <path>', 'Path to ComfyUI workflow JSON file')
  .action(async (concept, options) => {
    try {
      const episodeCount = parseInt(options.episodes, 10);
      if (isNaN(episodeCount) || episodeCount < 1) {
        console.error('❌ Episode count must be a positive integer');
        process.exit(1);
      }

      // Auto-generate output directory if not specified, ensure it's never root
      const outputDir = options.output 
        ? ensureOutputDirectory(options.output)
        : generateOutputDir(concept);

      const generator = new StoryGenerator();
      const context = await generator.generateCompleteStory(concept, episodeCount, outputDir);
      
      await saveOutput(context, outputDir, {
        jsonOnly: options.jsonOnly,
        includeBrollPrompts: !options.noBrollPrompts,
        generator
      });
      
      // Generate images if requested
      if (options.images && !options.jsonOnly) {
        console.log('\n🎨 Starting b-roll image generation...');
        const comfyGenerator = new ComfyUIGenerator(
          options.comfyuiServer,
          options.comfyuiWorkflow
        );
        
        const initialized = await comfyGenerator.initialize();
        if (initialized) {
          await comfyGenerator.generateBrollImages(context, outputDir);
        } else {
          console.log('⚠️ ComfyUI not available - skipping image generation');
          console.log('   To generate images, start ComfyUI server and run with --images flag');
        }
      }
      
      console.log(`\n🎬 Story generation complete! Output saved to: ${outputDir}`);
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate existing story files')
  .argument('<directory>', 'Directory containing story JSON files')
  .action(async (directory) => {
    try {
      await validateExistingStory(directory);
      console.log('✅ Story files are valid!');
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

program
  .command('extract-broll')
  .description('Extract b-roll prompts from existing story files')
  .argument('<directory>', 'Directory containing story JSON files')
  .option('-o, --output <file>', 'Output file for b-roll prompts', './broll-prompts.txt')
  .action(async (directory, options) => {
    try {
      await extractBrollPrompts(directory, options.output);
      console.log(`🎨 B-roll prompts extracted to: ${options.output}`);
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      process.exit(1);
    }
  });

program
  .command('generate-images')
  .description('Generate b-roll images from existing story files using ComfyUI')
  .argument('<directory>', 'Directory containing story JSON files (complete-story.json)')
  .option('--comfyui-server <url>', 'ComfyUI server URL', 'http://127.0.0.1:8188')
  .option('--comfyui-workflow <path>', 'Path to ComfyUI workflow JSON file')
  .action(async (directory, options) => {
    try {
      // Load existing story context
      const contextPath = join(directory, 'complete-story.json');
      const contextData = await fs.readFile(contextPath, 'utf8');
      const context: GenerationContext = JSON.parse(contextData);
      
      console.log('🎨 Generating images from existing story data...');
      const comfyGenerator = new ComfyUIGenerator(
        options.comfyuiServer,
        options.comfyuiWorkflow
      );
      
      const initialized = await comfyGenerator.initialize();
      if (initialized) {
        await comfyGenerator.generateBrollImages(context, directory);
        console.log('✅ Image generation complete!');
      } else {
        console.error('❌ ComfyUI server not available');
        console.log('Make sure ComfyUI is running on', options.comfyuiServer);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      process.exit(1);
    }
  });

async function saveOutput(
  context: GenerationContext, 
  outputDir: string,
  options: { 
    jsonOnly: boolean;
    includeBrollPrompts: boolean;
    generator: StoryGenerator;
  }
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  
  // Individual JSON files, episodes, and scenes are already written during streaming generation
  // Only save complete context and non-JSON files here
  
  // Save complete context
  await fs.writeFile(
    join(outputDir, 'complete-story.json'),
    JSON.stringify(context, null, 2),
    'utf8'
  );
  
  if (options.jsonOnly) {
    return;
  }
  
  // Generate human-readable summary
  await generateSummary(context, outputDir);
  
  // Generate b-roll prompts if requested
  if (options.includeBrollPrompts && context.scenes && context.characters && context.locations) {
    await generateBrollPrompts(context.scenes, context.characters, context.locations, options.generator, outputDir);
  }
  
  // Generate HTML treatment
  await generateHTMLTreatment(context, outputDir);
  
  // Save performance report
  if (options.generator) {
    const performanceReport = options.generator.getPerformanceReport();
    await fs.writeFile(
      join(outputDir, 'performance-report.txt'),
      performanceReport,
      'utf8'
    );
  }
}

async function generateSummary(context: GenerationContext, outputDir: string): Promise<void> {
  const lines: string[] = [];
  
  lines.push(`# ${context.universe?.title || 'Generated Story'}\n`);
  
  if (context.universe) {
    lines.push('## Universe');
    lines.push(`**Genre:** ${context.universe.genre.join(', ')}`);
    lines.push(`**Tone:** ${context.universe.tone.join(', ')}`);
    lines.push('');
    
    lines.push('### Value Spectrums');
    for (const spectrum of context.universe.value_spectrums) {
      lines.push(`- **${spectrum.axis}:** ${spectrum.definition}`);
    }
    lines.push('');
  }
  
  if (context.controllingIdea) {
    lines.push('## Controlling Idea');
    lines.push(`**Assertion:** ${context.controllingIdea.controlling_idea.assertion}`);
    lines.push(`**Counterassertion:** ${context.controllingIdea.controlling_idea.counterassertion}`);
    lines.push('');
  }
  
  if (context.characters) {
    lines.push('## Characters');
    for (const char of context.characters.characters) {
      lines.push(`### ${char.name} (${char.role_archetype})`);
      lines.push(`- **Wants:** ${char.wants}`);
      lines.push(`- **Needs:** ${char.needs}`);
      lines.push(`- **Public Mask:** ${char.public_mask}`);
      lines.push(`- **Private Truth:** ${char.private_truth}`);
      lines.push('');
    }
  }
  
  if (context.episodes) {
    lines.push('## Episodes');
    for (const ep of context.episodes) {
      lines.push(`### Episode ${ep.episode_no}: ${ep.episode_title}`);
      lines.push(`**Question:** ${ep.dramatic_question}`);
      lines.push(`**Value Turn:** ${ep.value_turn.axis} from ${ep.value_turn.from} to ${ep.value_turn.to}`);
      lines.push('');
    }
  }
  
  if (context.scenes) {
    lines.push('## Scene Breakdown');
    for (const scenePlan of context.scenes) {
      lines.push(`### Episode ${scenePlan.episode_no} Scenes`);
      for (const scene of scenePlan.scenes) {
        lines.push(`**Scene ${scene.scene_no}** - ${scene.objective}`);
        lines.push(`- Location: ${scene.setting.loc_id}`);
        lines.push(`- Characters: ${scene.characters_present.join(', ')}`);
        lines.push(`- Value shift: ${scene.scene_value_shift.from} → ${scene.scene_value_shift.to}`);
        lines.push('');
      }
    }
  }
  
  await fs.writeFile(
    join(outputDir, 'story-summary.md'),
    lines.join('\n'),
    'utf8'
  );
}

async function generateBrollPrompts(
  scenes: GenerationContext['scenes'],
  characters: GenerationContext['characters'],
  locations: GenerationContext['locations'],
  generator: StoryGenerator,
  outputDir: string
): Promise<void> {
  if (!scenes || !characters || !locations) return;
  
  const prompts: string[] = [];
  
  for (const scenePlan of scenes) {
    prompts.push(`# Episode ${scenePlan.episode_no} B-roll Prompts\n`);
    
    for (const scene of scenePlan.scenes) {
      const prompt = generator.buildBrollPrompt(scene, characters, locations);
      prompts.push(`## Scene ${scene.scene_no}`);
      prompts.push(`**Timing:** ${scene.broll_image_brief.time_offset}`);
      prompts.push(`**Diffusion Prompt:**`);
      prompts.push(`\`\`\`\n${prompt}\n\`\`\``);
      prompts.push('');
    }
  }
  
  await fs.writeFile(
    join(outputDir, 'broll-prompts.md'),
    prompts.join('\n'),
    'utf8'
  );
}

async function generateHTMLTreatment(context: GenerationContext, outputDir: string): Promise<void> {
  const html: string[] = [];
  
  // HTML structure with styling
  html.push(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${context.universe?.title || 'Generated Story'} - Complete Treatment</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.2rem;
            font-style: italic;
        }
        
        .navigation {
            background-color: #e8e8e8;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 5px;
        }
        
        .navigation h2 {
            margin-top: 0;
            text-align: center;
        }
        
        .nav-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        
        .nav-item {
            background-color: #fff;
            padding: 10px;
            border-radius: 3px;
            text-align: center;
        }
        
        .nav-item a {
            color: #333;
            text-decoration: none;
            font-weight: bold;
        }
        
        .nav-item a:hover {
            text-decoration: underline;
        }
        
        .section {
            margin-bottom: 40px;
            padding: 25px 0;
        }
        
        .section-title {
            font-size: 1.8rem;
            font-weight: bold;
            text-decoration: underline;
            margin: 30px 0 20px 0;
        }
        
        .subsection-title {
            font-size: 1.4rem;
            font-weight: bold;
            margin: 25px 0 15px 0;
            text-decoration: underline;
        }
        
        .character-name {
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 15px;
        }
        
        .scene-header {
            background-color: #000;
            color: #fff;
            padding: 10px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
        }
        
        .beat {
            margin-left: 20px;
            margin-bottom: 10px;
        }
        
        .dialogue {
            margin-left: 40px;
            margin-right: 40px;
        }
        
        .action {
            margin: 15px 0;
        }
        
        .value-turn {
            background-color: #ffffcc;
            padding: 10px;
            border-left: 4px solid #ffcc00;
            margin: 15px 0;
            font-style: italic;
        }
        
        .broll-prompt {
            background-color: #e6f3ff;
            padding: 10px;
            border-left: 4px solid #0066cc;
            margin: 15px 0;
            font-family: Arial, sans-serif;
            font-size: 0.9rem;
        }
        
        pre {
            background-color: #f0f0f0;
            padding: 15px;
            border-radius: 3px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        
        ul, ol {
            margin: 10px 0;
        }
        
        li {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>`);

  // Header
  html.push(`    <div class="header">
        <div class="title">${context.universe?.title?.toUpperCase() || 'GENERATED STORY'}</div>
        <div class="subtitle">Complete Treatment & Script</div>
        <div style="margin-top: 10px; font-size: 1rem;">
            Generated by McKee Story Pipeline<br>
            ${new Date().toLocaleDateString()}
        </div>
    </div>`);

  // Navigation
  html.push(`    <div class="navigation">
        <h2>STORY SECTIONS</h2>
        <div class="nav-grid">
            <div class="nav-item"><a href="#universe">Universe</a></div>
            <div class="nav-item"><a href="#theme">Controlling Idea</a></div>
            <div class="nav-item"><a href="#factions">Factions</a></div>
            <div class="nav-item"><a href="#characters">Characters</a></div>
            <div class="nav-item"><a href="#locations">Locations</a></div>
            <div class="nav-item"><a href="#conflicts">Conflict Matrix</a></div>
            <div class="nav-item"><a href="#season-arc">Season Arc</a></div>
            <div class="nav-item"><a href="#episodes">Episodes</a></div>
            <div class="nav-item"><a href="#scenes">Scene Breakdown</a></div>
            <div class="nav-item"><a href="#broll">B-roll Prompts</a></div>
        </div>
    </div>`);

  // Universe section
  if (context.universe) {
    html.push(`    <div class="section" id="universe">
        <h2 class="section-title">UNIVERSE</h2>
        <div class="subsection-title">TITLE</div>
        <p>${context.universe.title}</p>
        
        <div class="subsection-title">GENRE</div>
        <p>${context.universe.genre.join(', ').toUpperCase()}</p>
        
        <div class="subsection-title">TONE</div>
        <p>${context.universe.tone.join(', ').toUpperCase()}</p>
        
        <div class="subsection-title">WORLD RULES</div>
        <p><strong>TECHNOLOGY:</strong></p>
        <ul>${context.universe.world_rules.tech.map(rule => `<li>${rule}</li>`).join('')}</ul>
        <p><strong>CONSTRAINTS:</strong></p>
        <ul>${context.universe.world_rules.constraints.map(rule => `<li>${rule}</li>`).join('')}</ul>
        ${context.universe.world_rules.magic_or_meta ? `<p><strong>META-RULES:</strong> ${context.universe.world_rules.magic_or_meta}</p>` : ''}
        
        <div class="subsection-title">VALUE SPECTRUMS</div>
        ${context.universe.value_spectrums.map(vs => `
        <p><strong>${vs.axis.replace(/_/g, ' ').toUpperCase()}:</strong><br>
        ${vs.definition}</p>`).join('')}
        
        <div class="subsection-title">MOTIFS & SYMBOLS</div>
        <ul>${context.universe.motifs_symbols.map(motif => `<li>${motif}</li>`).join('')}</ul>
        
        <div class="subsection-title">LEXICON</div>
        ${context.universe.lexicon.slang ? `<p><strong>SLANG:</strong></p><ul>${context.universe.lexicon.slang.map(term => `<li>${term}</li>`).join('')}</ul>` : ''}
        ${context.universe.lexicon.gestures ? `<p><strong>GESTURES:</strong></p><ul>${context.universe.lexicon.gestures.map(gesture => `<li>${gesture}</li>`).join('')}</ul>` : ''}
        ${context.universe.notes ? `<p><strong>NOTES:</strong> ${context.universe.notes}</p>` : ''}
    </div>`);
  }

  // Controlling Idea section
  if (context.controllingIdea) {
    html.push(`    <div class="section" id="theme">
        <h2 class="section-title">CONTROLLING IDEA (THEME)</h2>
        <div class="subsection-title">ASSERTION</div>
        <p>${context.controllingIdea.controlling_idea.assertion}</p>
        
        <div class="subsection-title">COUNTERASSERTION</div>
        <p>${context.controllingIdea.controlling_idea.counterassertion}</p>
        
        <div class="subsection-title">VALUE AXES IN PLAY</div>
        <ul>${context.controllingIdea.controlling_idea.value_axes_in_play.map(axis => `<li>${axis.replace(/_/g, ' ').toUpperCase()}</li>`).join('')}</ul>
        
        <div class="subsection-title">TEST VECTORS</div>
        <ol>${context.controllingIdea.controlling_idea.test_vectors.map(test => `<li>${test}</li>`).join('')}</ol>
    </div>`);
  }

  // Factions section
  if (context.factions) {
    html.push(`    <div class="section" id="factions">
        <h2 class="section-title">FACTIONS</h2>`);
    
    for (const faction of context.factions.factions) {
      html.push(`        <div class="subsection-title">${faction.name.toUpperCase()}</div>
        <p><strong>MISSION:</strong> ${faction.mission}</p>
        <p><strong>METHODS:</strong></p>
        <ul>${faction.methods.map(method => `<li>${method}</li>`).join('')}</ul>
        <p><strong>RESOURCES:</strong></p>
        <ul>${faction.resources.map(resource => `<li>${resource}</li>`).join('')}</ul>
        <p><strong>SIGNATURE TACTICS:</strong></p>
        <ul>${faction.signature_tactics.map(tactic => `<li>${tactic}</li>`).join('')}</ul>
        <p><strong>VISUAL CUES:</strong></p>
        <ul>${faction.visual_cues.map(cue => `<li>${cue}</li>`).join('')}</ul>
        <p><strong>POSITION ON VALUE AXES:</strong></p>
        <ul>${Object.entries(faction.position_on_axes).map(([axis, value]) => 
          `<li>${axis.replace(/_/g, ' ').toUpperCase()}: ${value > 0 ? '+' : ''}${value}</li>`).join('')}</ul>`);
    }
    
    html.push(`    </div>`);
  }

  // Characters section  
  if (context.characters) {
    html.push(`    <div class="section" id="characters">
        <h2 class="section-title">CHARACTER ROSTER</h2>`);
    
    for (const char of context.characters.characters) {
      html.push(`        <div class="character-name">${char.name} (${char.role_archetype})</div>
        <p><strong>PUBLIC MASK:</strong> ${char.public_mask}</p>
        <p><strong>PRIVATE TRUTH:</strong> ${char.private_truth}</p>
        <p><strong>WANTS:</strong> ${char.wants}</p>
        <p><strong>NEEDS:</strong> ${char.needs}</p>
        <p><strong>SKILLS/STRENGTHS:</strong></p>
        <ul>${char.skills_strengths.map(skill => `<li>${skill}</li>`).join('')}</ul>
        <p><strong>FLAWS/CONTRADICTIONS:</strong></p>
        <ul>${char.flaws_contradictions.map(flaw => `<li>${flaw}</li>`).join('')}</ul>
        
        <p><strong>RELATIONSHIPS:</strong></p>
        <ul>${char.relationships.map(rel => {
          const otherChar = context.characters!.characters.find(c => c.id === rel.other_id);
          return `<li>${otherChar?.name || rel.other_id} - ${rel.type} (${rel.tension_axis}: ${rel.current_value})</li>`;
        }).join('')}</ul>
        
        <p><strong>VISUAL BIBLE:</strong></p>
        <ul>
            <li><strong>Age:</strong> ${char.visual_bible.age_range}</li>
            <li><strong>Ethnicity:</strong> ${char.visual_bible.ethnicity}, ${char.visual_bible.skin_tone}</li>
            <li><strong>Face:</strong> ${char.visual_bible.face_description}</li>
            <li><strong>Eyes:</strong> ${char.visual_bible.eye_description}</li>
            <li><strong>Hair:</strong> ${char.visual_bible.hair_description}</li>
            <li><strong>Build:</strong> ${char.visual_bible.build_description}</li>
            <li><strong>Apparel:</strong> ${char.visual_bible.apparel_core.join(', ')}</li>
            <li><strong>Props:</strong> ${char.visual_bible.props.join(', ')}</li>
            <li><strong>Palette:</strong> ${char.visual_bible.palette.join(', ')}</li>
            <li><strong>Textures:</strong> ${char.visual_bible.surface_textures.join(', ')}</li>
            <li><strong>Silhouette:</strong> ${char.visual_bible.iconic_silhouette}</li>
        </ul>`);
    }
    
    html.push(`    </div>`);
  }

  // Locations section
  if (context.locations) {
    html.push(`    <div class="section" id="locations">
        <h2 class="section-title">LOCATIONS</h2>`);
    
    for (const loc of context.locations.locations) {
      html.push(`        <div class="subsection-title">${loc.name.toUpperCase()}</div>
        <p><strong>FUNCTION:</strong> ${loc.function_in_story}</p>
        <p><strong>SENSORY PALETTE:</strong></p>
        <ul>${loc.sensory_palette.map(sense => `<li>${sense}</li>`).join('')}</ul>
        <p><strong>BLOCKING AFFORDANCES:</strong></p>
        <ul>${loc.blocking_affordances.map(afford => `<li>${afford}</li>`).join('')}</ul>
        <p><strong>ICONIC COMPOSITION:</strong> ${loc.iconic_composition}</p>`);
    }
    
    html.push(`    </div>`);
  }

  // Conflict Matrix section
  if (context.conflicts) {
    html.push(`    <div class="section" id="conflicts">
        <h2 class="section-title">CONFLICT MATRIX</h2>
        
        <div class="subsection-title">PRIMARY CONFLICT AXES</div>
        <ul>${context.conflicts.conflict_axes.map(axis => `<li><strong>${axis.replace(/_/g, ' ').toUpperCase()}</strong></li>`).join('')}</ul>
        
        <div class="subsection-title">PAIRWISE PRESSURES</div>`);
    
    for (const pressure of context.conflicts.pairwise_pressures) {
      const char1 = context.characters?.characters.find(c => c.id === pressure.between[0]);
      const char2 = context.characters?.characters.find(c => c.id === pressure.between[1]);
      
      html.push(`        <p><strong>${char1?.name || pressure.between[0]} vs ${char2?.name || pressure.between[1]}</strong></p>
        <ul>
            <li><strong>Primary Axis:</strong> ${pressure.primary_axis.replace(/_/g, ' ').toUpperCase()}</li>
            <li><strong>Stakes:</strong> ${pressure.stakes}</li>
            <li><strong>Pressure Points:</strong></li>
            <ul>${pressure.pressure_points.map(point => `<li>${point}</li>`).join('')}</ul>
            <li><strong>Likely Reversals:</strong></li>
            <ul>${pressure.likely_reversals.map(rev => `<li>${rev}</li>`).join('')}</ul>
        </ul>`);
    }
    
    html.push(`        <div class="subsection-title">ESCALATION LADDER</div>`);
    for (const tier of context.conflicts.escalation_ladder) {
      html.push(`        <p><strong>TIER ${tier.tier}: ${tier.scope.toUpperCase()}</strong></p>
        <ul>${tier.events.map(event => `<li>${event}</li>`).join('')}</ul>`);
    }
    
    html.push(`    </div>`);
  }

  // Season Arc section
  if (context.seasonArc) {
    html.push(`    <div class="section" id="season-arc">
        <h2 class="section-title">SEASON ARC: ${context.seasonArc.arc_title.toUpperCase()}</h2>
        
        <div class="subsection-title">INCITING INCIDENT</div>
        <p><strong>Event:</strong> ${context.seasonArc.inciting_incident.event}</p>
        <div class="value-turn">
            <strong>VALUE SHIFT:</strong> ${context.seasonArc.inciting_incident.value_shift.axis.replace(/_/g, ' ').toUpperCase()}<br>
            FROM: ${context.seasonArc.inciting_incident.value_shift.from} → TO: ${context.seasonArc.inciting_incident.value_shift.to}
        </div>
        
        <div class="subsection-title">THREE-ACT STRUCTURE</div>`);
    
    for (const act of context.seasonArc.act_structure) {
      html.push(`        <p><strong>ACT ${act.act}</strong></p>
        <ul>`);
      
      // Only Acts 1 and 2 have "promise of the premise"
      if (act.promise_of_the_premise && act.promise_of_the_premise !== 'undefined') {
        html.push(`            <li><strong>Promise:</strong> ${act.promise_of_the_premise}</li>`);
      }
      
      if (act.turning_point) {
        html.push(`            <li><strong>Turning Point:</strong> ${act.turning_point.event}</li>
            <li><strong>Reversal:</strong> ${act.turning_point.reversal}</li>`);
      }
      if (act.midpoint_reversal) {
        html.push(`            <li><strong>Midpoint Reversal:</strong> ${act.midpoint_reversal.event}</li>
            <li><strong>Impact:</strong> ${act.midpoint_reversal.reversal}</li>`);
      }
      if (act.crisis) {
        html.push(`            <li><strong>Crisis:</strong> ${act.crisis.dilemma}</li>
            <li><strong>Values at Stake:</strong> ${act.crisis.values.join(' vs ')}</li>`);
      }
      if (act.climax) {
        html.push(`            <li><strong>Climax:</strong> ${act.climax.event}</li>`);
      }
      if (act.resolution) {
        html.push(`            <li><strong>Resolution:</strong> ${act.resolution.new_equilibrium}</li>`);
      }
      if (act.complications) {
        html.push(`            <li><strong>Complications:</strong></li>
            <ul>${act.complications.map(comp => `<li>${comp}</li>`).join('')}</ul>`);
      }
      if (act.rising_stakes) {
        html.push(`            <li><strong>Rising Stakes:</strong></li>
            <ul>${act.rising_stakes.map(stake => `<li>${stake}</li>`).join('')}</ul>`);
      }
      
      html.push(`        </ul>`);
    }
    
    html.push(`        <div class="subsection-title">EPISODE PROMISES</div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Episode</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Act</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Value Axis</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Turn</th>
            </tr>`);
    
    for (const promise of context.seasonArc.episode_promises) {
      html.push(`            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${promise.ep}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${promise.act}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${promise.value_axis.replace(/_/g, ' ').toUpperCase()}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${promise.turn}</td>
            </tr>`);
    }
    
    html.push(`        </table>
    </div>`);
  }

  // Episodes section
  if (context.episodes) {
    html.push(`    <div class="section" id="episodes">
        <h2 class="section-title">EPISODES</h2>`);
    
    for (const episode of context.episodes) {
      const protChar = context.characters?.characters.find(c => c.id === episode.A_plot.protagonist);
      
      html.push(`        <div class="subsection-title">EPISODE ${episode.episode_no}: ${episode.episode_title.toUpperCase()}</div>
        <p><strong>DRAMATIC QUESTION:</strong> ${episode.dramatic_question}</p>
        
        <div class="value-turn">
            <strong>VALUE TURN:</strong> ${episode.value_turn.axis.replace(/_/g, ' ').toUpperCase()}<br>
            FROM: ${episode.value_turn.from} → TO: ${episode.value_turn.to}
        </div>
        
        <p><strong>A-PLOT:</strong></p>
        <ul>
            <li><strong>Protagonist:</strong> ${protChar?.name || episode.A_plot.protagonist}</li>
            <li><strong>Goal:</strong> ${episode.A_plot.goal}</li>
            <li><strong>Opposition:</strong> ${episode.A_plot.opposition}</li>
            <li><strong>Stakes:</strong> ${episode.A_plot.stakes}</li>
        </ul>
        
        <p><strong>B-PLOT:</strong></p>
        <ul>
            <li><strong>Focus:</strong> ${episode.B_plot.focus}</li>
            <li><strong>Goal:</strong> ${episode.B_plot.goal}</li>
            <li><strong>Cross-Pressure:</strong> ${episode.B_plot.cross_pressure}</li>
        </ul>
        
        <p><strong>REVERSALS:</strong></p>
        <ol>${episode.reversals.map(rev => `<li>${rev}</li>`).join('')}</ol>
        
        <p><strong>BEATS:</strong></p>
        <ol>${episode.beats.map(beat => `<li>${beat}</li>`).join('')}</ol>`);
    }
    
    html.push(`    </div>`);
  }

  // Scenes section
  if (context.scenes) {
    html.push(`    <div class="section" id="scenes">
        <h2 class="section-title">SCENE BREAKDOWN</h2>`);
    
    for (const scenePlan of context.scenes) {
      html.push(`        <div class="subsection-title">EPISODE ${scenePlan.episode_no} SCENES</div>`);
      
      for (const scene of scenePlan.scenes) {
        const location = context.locations?.locations.find(l => l.id === scene.setting.loc_id);
        const presentChars = scene.characters_present.map(id => 
          context.characters?.characters.find(c => c.id === id)?.name || id
        );
        
        html.push(`        
        <div class="scene-header">SCENE ${scene.scene_no}</div>
        
        <div class="action">
            <strong>LOCATION:</strong> ${location?.name || scene.setting.loc_id} (${scene.setting.time}, ${scene.setting.weather})<br>
            <strong>CHARACTERS PRESENT:</strong> ${presentChars.join(', ')}<br>
            <strong>OBJECTIVE:</strong> ${scene.objective}
        </div>
        
        <div class="value-turn">
            <strong>SCENE VALUE TURN:</strong> ${scene.scene_value_shift.axis.replace(/_/g, ' ').toUpperCase()}<br>
            FROM: ${scene.scene_value_shift.from} → TO: ${scene.scene_value_shift.to}
        </div>
        
        <p><strong>OBSTACLES:</strong></p>
        <ul>${scene.obstacles.map(obs => `<li>${obs}</li>`).join('')}</ul>
        
        <p><strong>BEATS:</strong></p>`);
        
        for (const beat of scene.beat_list) {
          html.push(`        <div class="beat">
            <strong>BEAT ${beat.beat_no}:</strong> ${beat.action}<br>
            <em>Micro-turn: ${beat.micro_turn}</em>
        </div>`);
        }
        
        html.push(`        <div class="action"><strong>BUTTON:</strong> ${scene.button}</div>
        
        <p><strong>B-ROLL CHARACTER DETAILS:</strong></p>
        <ul>${scene.broll_image_brief.subject_recasts.map(recast => {
          const char = context.characters?.characters.find(c => c.id === recast.char_id);
          return `<li><strong>${char?.name || recast.char_id}:</strong> ${recast.ethnicity}, ${recast.skin_tone}, ${recast.eye_color} - ${recast.frame_specific_traits.join(', ')}</li>`;
        }).join('')}</ul>`);
      }
    }
    
    html.push(`    </div>`);
  }

  // B-roll prompts section
  if (context.scenes && context.characters && context.locations) {
    html.push(`    <div class="section" id="broll">
        <h2 class="section-title">B-ROLL IMAGE PROMPTS</h2>`);
    
    for (const scenePlan of context.scenes) {
      html.push(`        <div class="subsection-title">EPISODE ${scenePlan.episode_no} B-ROLL</div>`);
      
      for (const scene of scenePlan.scenes) {
        const generator = new (await import('./generators/index.js')).StoryGenerator();
        const prompt = generator.buildBrollPrompt(scene, context.characters, context.locations);
        
        html.push(`        <div class="broll-prompt">
            <strong>SCENE ${scene.scene_no} (${scene.broll_image_brief.time_offset}):</strong><br>
            <code>${prompt}</code>
        </div>`);
      }
    }
    
    html.push(`    </div>`);
  }

  // Close HTML
  html.push(`</body>
</html>`);

  // Write HTML file
  await fs.writeFile(
    join(outputDir, 'complete-treatment.html'),
    html.join('\n'),
    'utf8'
  );
}

async function validateExistingStory(directory: string): Promise<void> {
  // Implementation for validation would go here
  console.log(`Validating story files in ${directory}...`);
  throw new Error('Validation not yet implemented');
}

async function extractBrollPrompts(directory: string, outputFile: string): Promise<void> {
  // Implementation for extraction would go here
  console.log(`Extracting b-roll prompts from ${directory} to ${outputFile}...`);
  throw new Error('B-roll extraction not yet implemented');
}

function generateOutputDir(concept: string): string {
  const slug = concept
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .substring(0, 25)              // Shorter length to accommodate timestamp
    .replace(/^-+|-+$/g, '');      // Trim leading/trailing hyphens
  
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/T/, '-').replace(/:/g, ''); // YYYY-MM-DD-HHMMSS
  return `./output/${timestamp}-${slug}`;
}

function ensureOutputDirectory(userOutputDir?: string): string {
  // Always default to ./output if no directory specified or if it would write to root
  if (!userOutputDir || userOutputDir === '.' || userOutputDir === './') {
    return './output';
  }
  
  // If user specified a directory, ensure it's not root and prefix with ./output if needed
  if (!userOutputDir.startsWith('./') && !userOutputDir.startsWith('/')) {
    return `./output/${userOutputDir}`;
  }
  
  return userOutputDir;
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
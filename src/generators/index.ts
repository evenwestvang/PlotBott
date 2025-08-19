import { ClaudeClient } from '../api/claude.js';
import { validateSchema, validateReferentialIntegrity, generateId, hashSeed } from '../utils/validation.js';
import { 
  UNIVERSE_PROMPT, CONTROLLING_IDEA_PROMPT, FACTIONS_PROMPT, 
  CHARACTERS_PROMPT, LOCATIONS_PROMPT, CONFLICT_MATRIX_PROMPT,
  SEASON_ARC_PROMPT, EPISODE_PLAN_PROMPT, SCENE_PLAN_PROMPT
} from '../prompts/index.js';
import type {
  Universe, ControllingIdea, FactionsBundle, CharacterRoster,
  LocationsBundle, ConflictMatrix, SeasonArc, EpisodePlan, ScenePlan,
  GenerationContext, BrollImageBrief, SceneUnit
} from '../types/index.js';


export class StoryGenerator {
  private claude: ClaudeClient;
  
  constructor() {
    this.claude = new ClaudeClient();
  }
  
  public getPerformanceReport(): string {
    return this.claude.getPerformanceReport();
  }
  
  
  async generateUniverse(concept?: string): Promise<Universe> {
    const prompt = concept 
      ? `${UNIVERSE_PROMPT}\n\nCore concept: "${concept}"`
      : UNIVERSE_PROMPT;
      
    const result = await this.claude.generateWithRetry<Universe>(prompt);
    
    // Generate universe_id if not provided
    if (!result.universe_id) {
      result.universe_id = generateId(result.title || 'universe');
    }
    
    // Add the original concept to the universe for downstream use
    if (concept) {
      (result as any).original_concept = concept;
    }
    
    return validateSchema<Universe>('Universe', result);
  }
  
  async generateControllingIdea(universe: Universe): Promise<ControllingIdea> {
    const result = await this.claude.generateWithRetry<ControllingIdea>(
      CONTROLLING_IDEA_PROMPT,
      universe
    );
    
    result.universe_id = universe.universe_id;
    return validateSchema<ControllingIdea>('ControllingIdea', result);
  }
  
  async generateFactions(universe: Universe, controllingIdea: ControllingIdea): Promise<FactionsBundle> {
    const result = await this.claude.generateWithRetry<FactionsBundle>(
      FACTIONS_PROMPT,
      { universe, controllingIdea }
    );
    
    result.universe_id = universe.universe_id;
    
    // Generate faction IDs and populate universe catalog
    for (const faction of result.factions) {
      if (!faction.id) {
        faction.id = generateId(faction.name);
      }
    }
    
    // Update universe catalog
    universe.factions_catalog = result.factions.map(f => f.id);
    
    return validateSchema<FactionsBundle>('FactionsBundle', result);
  }
  
  async generateCharacters(
    universe: Universe, 
    controllingIdea: ControllingIdea, 
    factions: FactionsBundle
  ): Promise<CharacterRoster> {
    let enhancedPrompt = CHARACTERS_PROMPT;
    
    // Add original concept context if available
    if ((universe as any).original_concept) {
      enhancedPrompt += `\n\nORIGINAL CONCEPT CONTEXT:\n"${(universe as any).original_concept}"\n\nPay special attention to any named characters, relationships, or specific roles mentioned in the concept above.`;
    }
    
    // Retry character generation with validation
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await this.claude.generateWithRetry<CharacterRoster>(
          enhancedPrompt,
          { universe, controllingIdea, factions },
          1, // Single attempt per validation attempt
          6000 // Increased token limit for detailed character generation
        );
        
        result.universe_id = universe.universe_id;
        
        // Validate result structure
        if (!result.characters || !Array.isArray(result.characters)) {
          throw new Error('Generated characters is not a valid array.');
        }
        
        // Ensure minimum character count
        if (result.characters.length < 4) {
          throw new Error(`Generated only ${result.characters.length} characters, need at least 4.`);
        }
        
        // Generate character IDs and seeds
        for (const character of result.characters) {
          if (!character.id) {
            character.id = generateId(character.name);
          }
          
          // Generate deterministic seed for consistent character visuals
          if (!character.diffusion_control || !character.diffusion_control.seed) {
            if (!character.diffusion_control) {
              character.diffusion_control = {
                prompt_core: '',
                negative_prompt: '',
                seed: 0,
                aspect_ratio: '1:1',
                consistency_tags: []
              };
            }
            character.diffusion_control.seed = hashSeed(universe.universe_id, character.id);
          }
          
          // Fix consistency_tags if it's a string
          if (character.diffusion_control) {
            const dc = character.diffusion_control as any;
            if (typeof dc.consistency_tags === 'string') {
              dc.consistency_tags = dc.consistency_tags.split(',').map((tag: string) => tag.trim());
            }
          }
          
          // Fix relationship types to valid enum values
          for (const rel of character.relationships || []) {
            const validTypes = ['ally', 'rival', 'mentor', 'love', 'family', 'betrayer', 'confidante'];
            if (!validTypes.includes(rel.type)) {
              // Map common invalid types to valid ones
              if (rel.type.includes('mentor')) rel.type = 'mentor';
              else if (rel.type.includes('ally')) rel.type = 'ally';
              else if (rel.type.includes('confidante')) rel.type = 'confidante';
              else if (rel.type.includes('rival') || rel.type.includes('adversary')) rel.type = 'rival';
              else rel.type = 'rival'; // default fallback
            }
          }
          
          // Fix visual_bible fields that should be arrays
          if (character.visual_bible) {
            const vb = character.visual_bible as any;
            // Convert string fields to arrays by splitting on commas
            if (typeof vb.apparel_core === 'string') {
              vb.apparel_core = vb.apparel_core.split(',').map((item: string) => item.trim());
            }
            if (typeof vb.props === 'string') {
              vb.props = vb.props.split(',').map((item: string) => item.trim());
            }
            if (typeof vb.palette === 'string') {
              vb.palette = vb.palette.split(',').map((item: string) => item.trim());
            }
            if (typeof vb.surface_textures === 'string') {
              vb.surface_textures = vb.surface_textures.split(',').map((item: string) => item.trim());
            }
            if (typeof vb.style_notes === 'string') {
              vb.style_notes = vb.style_notes.split(',').map((item: string) => item.trim());
            }
            if (typeof vb.negatives === 'string') {
              vb.negatives = vb.negatives.split(',').map((item: string) => item.trim());
            }
          }
        }
        
        // Try validation - if it fails, we'll retry
        return validateSchema<CharacterRoster>('CharacterRoster', result);
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Character generation attempt ${attempt} failed:`, error);
        
        if (attempt === 3) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw lastError || new Error('Character generation failed after 3 attempts');
  }
  
  async generateLocations(universe: Universe): Promise<LocationsBundle> {
    let enhancedPrompt = LOCATIONS_PROMPT;
    
    // Add original concept context if available
    if ((universe as any).original_concept) {
      enhancedPrompt += `\n\nORIGINAL CONCEPT CONTEXT:\n"${(universe as any).original_concept}"\n\nPay special attention to any specific locations, settings, or time period mentioned in the concept above.`;
    }
    
    const result = await this.claude.generateWithRetry<LocationsBundle>(
      enhancedPrompt,
      universe
    );
    
    result.universe_id = universe.universe_id;
    
    // Ensure locations is an array
    if (!result.locations || !Array.isArray(result.locations)) {
      console.error('Invalid locations structure:', result);
      throw new Error('Generated locations is not an array');
    }
    
    // Generate location IDs and populate universe catalog
    for (const location of result.locations) {
      if (!location.id) {
        location.id = generateId(location.name);
      }
      
      // Fix location fields that should be arrays of strings
      const loc = location as any;
      if (typeof loc.sensory_palette === 'object' && !Array.isArray(loc.sensory_palette)) {
        loc.sensory_palette = Object.values(loc.sensory_palette);
      }
      if (Array.isArray(loc.sensory_palette)) {
        loc.sensory_palette = loc.sensory_palette.flat().filter((item: any) => typeof item === 'string');
      }
      
      if (typeof loc.blocking_affordances === 'object' && !Array.isArray(loc.blocking_affordances)) {
        loc.blocking_affordances = Object.values(loc.blocking_affordances);
      }
      if (Array.isArray(loc.blocking_affordances)) {
        loc.blocking_affordances = loc.blocking_affordances.flat().filter((item: any) => typeof item === 'string');
      }
      
      // Fix diffusion_guide that should be an object
      if (typeof loc.diffusion_guide === 'string') {
        loc.diffusion_guide = {
          prompt_core: loc.diffusion_guide,
          negative_prompt: '',
          aspect_ratio: '16:9',
          consistency_tags: []
        };
      }
    }
    
    // Update universe catalog
    universe.locations_catalog = result.locations.map(l => l.id);
    
    return validateSchema<LocationsBundle>('LocationsBundle', result);
  }
  
  async generateConflictMatrix(
    characters: CharacterRoster,
    factions: FactionsBundle,
    controllingIdea: ControllingIdea
  ): Promise<ConflictMatrix> {
    const result = await this.claude.generateWithRetry<ConflictMatrix>(
      CONFLICT_MATRIX_PROMPT,
      { characters, factions, controllingIdea }
    );
    
    result.universe_id = characters.universe_id;
    return validateSchema<ConflictMatrix>('ConflictMatrix', result);
  }
  
  async generateSeasonArc(
    conflicts: ConflictMatrix,
    controllingIdea: ControllingIdea
  ): Promise<SeasonArc> {
    const result = await this.claude.generateWithRetry<SeasonArc>(
      SEASON_ARC_PROMPT,
      { conflicts, controllingIdea }
    );
    
    result.universe_id = conflicts.universe_id;
    
    // Fix Act 3 - should not have promise_of_the_premise field
    for (const act of result.act_structure) {
      if (act.act === 3 && (act as any).promise_of_the_premise !== undefined) {
        delete (act as any).promise_of_the_premise;
      }
    }
    
    return validateSchema<SeasonArc>('SeasonArc', result);
  }
  
  async generateEpisodePlan(
    seasonArc: SeasonArc,
    conflicts: ConflictMatrix,
    locations: LocationsBundle,
    characters: CharacterRoster,
    episodeNumber: number
  ): Promise<EpisodePlan> {
    // Create minimal context to avoid token overload
    const episodePromise = seasonArc.episode_promises.find(p => p.ep === episodeNumber);
    const minimalContext = {
      seasonArc: {
        ...seasonArc,
        episodes: undefined // Remove full episode array
      },
      episodePromise,
      conflicts: {
        ...conflicts,
        pairwise_pressures: conflicts.pairwise_pressures.slice(0, 5) // Limit to key conflicts
      },
      locations: {
        ...locations,
        locations: locations.locations.slice(0, 6) // Limit to key locations
      },
      characters: {
        ...characters,
        characters: characters.characters.slice(0, 6) // Limit to main characters
      },
      episode_no: episodeNumber
    };
    
    const result = await this.claude.generateWithRetry<EpisodePlan>(
      EPISODE_PLAN_PROMPT,
      minimalContext
    );
    
    result.universe_id = seasonArc.universe_id;
    result.season_arc_id = generateId(seasonArc.arc_title);
    result.episode_no = episodeNumber;
    
    return validateSchema<EpisodePlan>('EpisodePlan', result);
  }
  
  async generateScenePlan(
    episode: EpisodePlan,
    locations: LocationsBundle,
    characters: CharacterRoster
  ): Promise<ScenePlan> {
    // Filter to only relevant locations and characters for this episode
    const relevantLocations = {
      ...locations,
      locations: locations.locations.filter(l => 
        episode.locations?.includes(l.id) || 
        locations.locations.slice(0, 6).includes(l) // Keep top 6 as fallback
      )
    };
    
    const relevantCharacters = {
      ...characters,
      characters: characters.characters.filter(c => 
        c.id === episode.A_plot.protagonist ||
        characters.characters.slice(0, 6).includes(c) // Keep main characters
      )
    };
    
    const result = await this.claude.generateWithRetry<ScenePlan>(
      SCENE_PLAN_PROMPT,
      { episode, locations: relevantLocations, characters: relevantCharacters },
      3,
      8000 // Increased token limit for detailed scene generation
    );
    
    result.universe_id = episode.universe_id;
    result.episode_no = episode.episode_no;
    
    // Post-process scenes to ensure constraints are met
    for (const scene of result.scenes) {
      this.validateAndFixScene(scene, characters, locations);
    }
    
    return validateSchema<ScenePlan>('ScenePlan', result);
  }
  
  private validateAndFixScene(
    scene: SceneUnit, 
    characters: CharacterRoster,
    locations: LocationsBundle
  ): void {
    // Ensure value shift actually turns
    if (scene.scene_value_shift.from === scene.scene_value_shift.to) {
      scene.scene_value_shift.to = scene.scene_value_shift.from === 'positive' ? 'negative' : 'positive';
    }
    
    // Validate and fix b-roll constraints
    const broll = scene.broll_image_brief;
    
    // Ensure subject count matches subject IDs
    broll.subject_count = Math.min(broll.subject_ids.length, 2) as 1 | 2;
    broll.subject_ids = broll.subject_ids.slice(0, 2);
    
    // Ensure all subjects are present in scene
    broll.subject_ids = broll.subject_ids.filter(id => scene.characters_present.includes(id));
    if (broll.subject_ids.length === 0 && scene.characters_present.length > 0) {
      broll.subject_ids = [scene.characters_present[0]];
      broll.subject_count = 1;
    }
    
    // Fix keywords constraint
    broll.keywords = ['candid', 'amateur', 'naturalistic', 'unposed', 'documentary'] as ['candid', 'amateur', 'naturalistic', 'unposed', 'documentary'];
    
    // Fix time_offset to valid enum value
    if (broll.time_offset !== 'pre_scene' && broll.time_offset !== 'post_scene') {
      broll.time_offset = 'pre_scene';
    }
    
    // Validation of frame-specific traits is handled in schema (max 5)
  }
  
  buildBrollPrompt(
    scene: SceneUnit, 
    characters: CharacterRoster, 
    locations: LocationsBundle
  ): string {
    const broll = scene.broll_image_brief;
    const charDescriptions: string[] = [];
    
    // Build character descriptions using frame-specific recasts
    for (const recast of broll.subject_recasts) {
      const char = characters.characters.find(c => c.id === recast.char_id);
      
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
      } else {
        // Fallback if character not found
        const parts = [
          recast.char_id,
          recast.ethnicity,
          recast.skin_tone,
          recast.eye_color,
          ...recast.frame_specific_traits,
          recast.expression_state
        ].filter(Boolean);
        
        charDescriptions.push(parts.join(', '));
      }
    }
    
    // Build enhanced activity description from scene context
    let enhancedActivity = broll.activity_suggestion;
    
    // Add dramatic context from scene objective and value shift
    if (scene.objective) {
      const objectiveAction = this.extractActionFromObjective(scene.objective);
      if (objectiveAction) {
        enhancedActivity = `${objectiveAction}, ${enhancedActivity}`;
      }
    }
    
    // Add emotional context from value shift
    if (scene.scene_value_shift && scene.scene_value_shift.from !== scene.scene_value_shift.to) {
      const emotionalState = this.mapValueShiftToEmotion(scene.scene_value_shift);
      if (emotionalState) {
        enhancedActivity = `${enhancedActivity}, ${emotionalState}`;
      }
    }
    
    // Build location description from frame-specific setting
    const location = locations.locations.find(l => l.id === scene.setting.loc_id);
    const baseLoc = location ? location.name : scene.setting.loc_id;
    
    const settingParts = [
      baseLoc,
      ...broll.frame_specific_setting.visible_objects,
      ...broll.frame_specific_setting.atmospheric_elements,
      ...broll.frame_specific_setting.composition_elements
    ].filter(Boolean);
    
    // Combine elements with proper diffusion formatting
    const parts = [
      charDescriptions.join(" and "),
      enhancedActivity,
      `at ${settingParts.join(', ')}`,
      broll.framing.replace(/_/g, ' '),
      broll.frame_specific_setting.lighting_quality,
      `${scene.setting.time} ${scene.setting.weather}`.trim(),
      broll.keywords.join(", ")
    ].filter(Boolean);
    
    return parts.join(", ");
  }
  
  private extractActionFromObjective(objective: string): string | null {
    // Extract key action verbs from scene objectives
    const actionPatterns = [
      /(?:try|tries|trying|attempt|attempts) to (\w+)/i,
      /(?:must|needs to|wants to) (\w+)/i,
      /(?:seeks|seeks to|looking to) (\w+)/i
    ];
    
    for (const pattern of actionPatterns) {
      const match = objective.match(pattern);
      if (match) {
        return match[1].toLowerCase() + 'ing';
      }
    }
    
    return null;
  }
  
  private mapValueShiftToEmotion(valueShift: any): string | null {
    const { from, to, axis } = valueShift;
    
    // Map common value shifts to emotional expressions
    const emotionMap: { [key: string]: string } = {
      'confident_to_uncertain': 'hesitant expression',
      'trusting_to_suspicious': 'wary gaze', 
      'hopeful_to_desperate': 'strained posture',
      'calm_to_agitated': 'tense body language',
      'controlled_to_chaotic': 'frayed composure',
      'safe_to_dangerous': 'alert stance'
    };
    
    const shiftKey = `${from}_to_${to}`.toLowerCase().replace(/\s+/g, '_');
    return emotionMap[shiftKey] || null;
  }
  
  private async writeFile(outputDir: string, filename: string, data: any): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    await fs.writeFile(
      path.join(outputDir, filename),
      JSON.stringify(data, null, 2),
      'utf8'
    );
    console.log(`📄 Wrote ${filename}`);
  }
  
  async generateCompleteStory(
    concept: string,
    episodeCount: number = 6,
    outputDir?: string
  ): Promise<GenerationContext> {
    // Concept will be included in the universe and passed to all subsequent generations
    
    // Create output directory if provided for streaming
    if (outputDir) {
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.mkdir(outputDir, { recursive: true });
      await fs.mkdir(path.join(outputDir, 'episodes'), { recursive: true });
      await fs.mkdir(path.join(outputDir, 'scenes'), { recursive: true });
    }
    
    console.log('🌍 Generating Universe...');
    const universe = await this.generateUniverse(concept);
    if (outputDir) await this.writeFile(outputDir, 'universe.json', universe);
    
    console.log('💭 Generating Controlling Idea...');  
    const controllingIdea = await this.generateControllingIdea(universe);
    if (outputDir) await this.writeFile(outputDir, 'controlling-idea.json', controllingIdea);
    
    console.log('🏛️ Generating Factions...');
    const factions = await this.generateFactions(universe, controllingIdea);
    if (outputDir) await this.writeFile(outputDir, 'factions.json', factions);
    
    console.log('👥 Generating Characters...');
    const characters = await this.generateCharacters(universe, controllingIdea, factions);
    if (outputDir) await this.writeFile(outputDir, 'characters.json', characters);
    
    // Update factions with key_figures now that we have characters
    if (outputDir) {
      console.log('🔗 Updating faction key figures...');
      // Populate key_figures based on character faction_affiliations
      for (const faction of factions.factions) {
        faction.key_figures = characters.characters
          .filter(char => char.faction_affiliations.includes(faction.id))
          .map(char => char.id);
      }
      await this.writeFile(outputDir, 'factions.json', factions);
    }
    
    console.log('🏗️ Generating Locations...');
    const locations = await this.generateLocations(universe);
    if (outputDir) await this.writeFile(outputDir, 'locations.json', locations);
    
    // Update universe catalogs now that we have factions and locations  
    if (outputDir) {
      console.log('🔗 Updating universe catalogs...');
      // These should already be populated by the generate methods, but ensure streaming gets updates
      await this.writeFile(outputDir, 'universe.json', universe);
    }
    
    console.log('⚔️ Generating Conflict Matrix...');
    const conflicts = await this.generateConflictMatrix(characters, factions, controllingIdea);
    if (outputDir) await this.writeFile(outputDir, 'conflicts.json', conflicts);
    
    console.log('📚 Generating Season Arc...');
    const seasonArc = await this.generateSeasonArc(conflicts, controllingIdea);
    if (outputDir) await this.writeFile(outputDir, 'season-arc.json', seasonArc);
    
    // Update episode count and ensure proper act distribution
    if (episodeCount !== seasonArc.episode_count) {
      seasonArc.episode_count = episodeCount;
      
      // Generate proper act-based episode distribution
      const episodesPerAct = Math.ceil(episodeCount / 3);
      const newPromises = [];
      
      for (let ep = 1; ep <= episodeCount; ep++) {
        let act: 1 | 2 | 3;
        if (ep <= episodesPerAct) {
          act = 1;
        } else if (ep <= episodesPerAct * 2) {
          act = 2;
        } else {
          act = 3;
        }
        
        // Use existing promises if available, otherwise create new ones
        const existingPromise = seasonArc.episode_promises.find(p => p.ep === ep);
        if (existingPromise) {
          newPromises.push({
            ...existingPromise,
            act
          });
        } else {
          // Create new promise using cycling value axes
          const axes = controllingIdea.controlling_idea.value_axes_in_play;
          const axisIndex = (ep - 1) % axes.length;
          
          newPromises.push({
            ep,
            act,
            value_axis: axes[axisIndex],
            turn: `Episode ${ep} value turn on ${axes[axisIndex].replace(/_/g, ' ')}`
          });
        }
      }
      
      seasonArc.episode_promises = newPromises;
    }
    
    console.log(`📊 Context sizes: Characters=${characters.characters.length}, Locations=${locations.locations.length}, Conflicts=${conflicts.pairwise_pressures.length}`);
    
    const episodes: EpisodePlan[] = [];
    const scenes: ScenePlan[] = [];
    
    for (let ep = 1; ep <= episodeCount; ep++) {
      console.log(`📺 Generating Episode ${ep}...`);
      const episode = await this.generateEpisodePlan(seasonArc, conflicts, locations, characters, ep);
      episodes.push(episode);
      if (outputDir) await this.writeFile(outputDir, `episodes/episode-${ep}.json`, episode);
      
      console.log(`🎬 Generating Scenes for Episode ${ep}...`);
      const scenePlan = await this.generateScenePlan(episode, locations, characters);
      scenes.push(scenePlan);
      if (outputDir) await this.writeFile(outputDir, `scenes/scenes-episode-${ep}.json`, scenePlan);
    }
    
    const context: GenerationContext = {
      universe,
      controllingIdea,
      factions,
      characters,
      locations,
      conflicts,
      seasonArc,
      episodes,
      scenes
    };
    
    console.log('✅ Validating referential integrity...');
    validateReferentialIntegrity(context);
    
    console.log('🎉 Story generation complete!');
    
    // Output performance report
    console.log(this.claude.getPerformanceReport());
    
    return context;
  }
}
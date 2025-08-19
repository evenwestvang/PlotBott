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
  
  async generateUniverse(concept?: string): Promise<Universe> {
    const prompt = concept 
      ? `${UNIVERSE_PROMPT}\n\nCore concept: "${concept}"`
      : UNIVERSE_PROMPT;
      
    const result = await this.claude.generateWithRetry<Universe>(prompt);
    
    // Generate universe_id if not provided
    if (!result.universe_id) {
      result.universe_id = generateId(result.title || 'universe');
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
    const result = await this.claude.generateWithRetry<CharacterRoster>(
      CHARACTERS_PROMPT,
      { universe, controllingIdea, factions },
      3,
      6000 // Increased token limit for detailed character generation
    );
    
    result.universe_id = universe.universe_id;
    
    // Ensure minimum character count
    if (result.characters.length < 4) {
      throw new Error(`Generated only ${result.characters.length} characters, need at least 4. Please retry generation.`);
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
    
    return validateSchema<CharacterRoster>('CharacterRoster', result);
  }
  
  async generateLocations(universe: Universe): Promise<LocationsBundle> {
    const result = await this.claude.generateWithRetry<LocationsBundle>(
      LOCATIONS_PROMPT,
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
    broll.keywords = ['candid', 'amateur'] as ['candid', 'amateur'];
    
    // Fix time_offset to valid enum value
    if (broll.time_offset !== 'pre_scene' && broll.time_offset !== 'post_scene') {
      broll.time_offset = 'pre_scene';
    }
    
    // Limit character recast traits to max 3
    for (const recast of scene.scene_character_recasts) {
      if (recast.minimal_visual_traits.length > 3) {
        const excess = recast.minimal_visual_traits.slice(3);
        recast.minimal_visual_traits = recast.minimal_visual_traits.slice(0, 3);
        recast.avoid_list.push(...excess);
      }
    }
  }
  
  buildBrollPrompt(
    scene: SceneUnit, 
    characters: CharacterRoster, 
    locations: LocationsBundle
  ): string {
    const broll = scene.broll_image_brief;
    
    // Build character descriptions using visual bibles and scene recasts
    const charDescriptions: string[] = [];
    for (const charId of broll.subject_ids) {
      const char = characters.characters.find(c => c.id === charId);
      const recast = scene.scene_character_recasts.find(r => r.char_id === charId);
      
      if (char) {
        const parts = [char.name];
        
        // Add core visual bible elements
        if (char.visual_bible.age_range) parts.push(char.visual_bible.age_range);
        if (char.visual_bible.hair) parts.push(char.visual_bible.hair);
        
        // Add scene-specific recast traits (1-3 minimal traits)
        if (recast && recast.minimal_visual_traits.length > 0) {
          parts.push(...recast.minimal_visual_traits);
        } else {
          // Fallback to core apparel if no recast
          if (char.visual_bible.apparel_core.length > 0) {
            parts.push(char.visual_bible.apparel_core[0]);
          }
        }
        
        charDescriptions.push(parts.join(', '));
      } else {
        charDescriptions.push(charId);
      }
    }
    
    // Build location description using visual bible
    const location = locations.locations.find(l => l.id === scene.setting.loc_id);
    let locationDescription = scene.setting.loc_id;
    
    if (location) {
      const locParts = [location.name];
      
      // Add iconic composition for visual continuity
      if (location.iconic_composition) {
        locParts.push(location.iconic_composition);
      }
      
      // Add sensory palette elements for atmosphere (max 2)
      if (location.sensory_palette.length > 0) {
        const sensoryElements = location.sensory_palette.slice(0, 2);
        locParts.push(...sensoryElements);
      }
      
      locationDescription = locParts.join(', ');
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
    
    // Combine elements with proper diffusion formatting
    const parts = [
      charDescriptions.join(" and "),
      enhancedActivity,
      `at ${locationDescription}`,
      broll.framing.replace(/_/g, ' '),
      broll.setting_details,
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
  
  async generateCompleteStory(
    concept: string,
    episodeCount: number = 6
  ): Promise<GenerationContext> {
    console.log('🌍 Generating Universe...');
    const universe = await this.generateUniverse(concept);
    
    console.log('💭 Generating Controlling Idea...');  
    const controllingIdea = await this.generateControllingIdea(universe);
    
    console.log('🏛️ Generating Factions...');
    const factions = await this.generateFactions(universe, controllingIdea);
    
    console.log('👥 Generating Characters...');
    const characters = await this.generateCharacters(universe, controllingIdea, factions);
    
    console.log('🏗️ Generating Locations...');
    const locations = await this.generateLocations(universe);
    
    console.log('⚔️ Generating Conflict Matrix...');
    const conflicts = await this.generateConflictMatrix(characters, factions, controllingIdea);
    
    console.log('📚 Generating Season Arc...');
    const seasonArc = await this.generateSeasonArc(conflicts, controllingIdea);
    
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
      
      console.log(`🎬 Generating Scenes for Episode ${ep}...`);
      const scenePlan = await this.generateScenePlan(episode, locations, characters);
      scenes.push(scenePlan);
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
    return context;
  }
}
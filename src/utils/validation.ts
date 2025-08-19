import Ajv from 'ajv';
import { STORYWORLD_SCHEMA } from '../schemas/index.js';
import type { 
  Universe, ControllingIdea, FactionsBundle, CharacterRoster, 
  LocationsBundle, ConflictMatrix, SeasonArc, EpisodePlan, ScenePlan,
  AxisId, CharId, LocId, FactionId, GenerationContext 
} from '../types/index.js';

const ajv = new Ajv({ allErrors: true, verbose: true });
ajv.addSchema(STORYWORLD_SCHEMA, 'storyworld');

export class ValidationError extends Error {
  constructor(public errors: any[]) {
    super(`Validation failed: ${errors.map(e => `${e.instancePath} ${e.message}`).join(', ')}`);
  }
}

export function validateSchema<T>(schemaRef: string, data: any): T {
  const validate = ajv.getSchema(`storyworld#/definitions/${schemaRef}`);
  if (!validate) {
    throw new Error(`Schema not found: ${schemaRef}`);
  }
  
  if (!validate(data)) {
    throw new ValidationError(validate.errors || []);
  }
  
  return data as T;
}

export function validateReferentialIntegrity(context: GenerationContext): void {
  const errors: string[] = [];
  
  if (!context.universe) {
    errors.push('Universe is required');
    return;
  }
  
  const validAxes = new Set(context.universe.value_spectrums.map(vs => vs.axis));
  const validChars = new Set(context.characters?.characters.map(c => c.id) || []);
  const validLocs = new Set(context.locations?.locations.map(l => l.id) || []);
  const validFactions = new Set(context.factions?.factions.map(f => f.id) || []);
  
  // Check controlling idea axes
  if (context.controllingIdea) {
    for (const axis of context.controllingIdea.controlling_idea.value_axes_in_play) {
      if (!validAxes.has(axis)) {
        errors.push(`Controlling idea references unknown axis: ${axis}`);
      }
    }
  }
  
  // Check character relationships and faction affiliations
  if (context.characters) {
    for (const char of context.characters.characters) {
      for (const rel of char.relationships) {
        if (!validChars.has(rel.other_id)) {
          errors.push(`Character ${char.id} has relationship with unknown character: ${rel.other_id}`);
        }
        if (!validAxes.has(rel.tension_axis)) {
          errors.push(`Character ${char.id} relationship references unknown axis: ${rel.tension_axis}`);
        }
      }
      
      for (const factionId of char.faction_affiliations) {
        if (!validFactions.has(factionId)) {
          errors.push(`Character ${char.id} affiliated with unknown faction: ${factionId}`);
        }
      }
      
      for (const axis of Object.keys(char.position_on_axes)) {
        if (!validAxes.has(axis)) {
          errors.push(`Character ${char.id} positioned on unknown axis: ${axis}`);
        }
      }
    }
  }
  
  // Check conflict matrix axes
  if (context.conflicts) {
    for (const axis of context.conflicts.conflict_axes) {
      if (!validAxes.has(axis)) {
        errors.push(`Conflict matrix references unknown axis: ${axis}`);
      }
    }
    
    for (const pressure of context.conflicts.pairwise_pressures) {
      if (!validAxes.has(pressure.primary_axis)) {
        errors.push(`Pairwise pressure references unknown axis: ${pressure.primary_axis}`);
      }
      for (const charId of pressure.between) {
        if (!validChars.has(charId)) {
          errors.push(`Pairwise pressure references unknown character: ${charId}`);
        }
      }
    }
  }
  
  // Check season arc episode promises
  if (context.seasonArc) {
    if (!validAxes.has(context.seasonArc.inciting_incident.value_shift.axis)) {
      errors.push(`Season arc inciting incident references unknown axis: ${context.seasonArc.inciting_incident.value_shift.axis}`);
    }
    
    for (const promise of context.seasonArc.episode_promises) {
      if (!validAxes.has(promise.value_axis)) {
        errors.push(`Episode ${promise.ep} promise references unknown axis: ${promise.value_axis}`);
      }
    }
  }
  
  // Check episodes
  if (context.episodes) {
    for (const ep of context.episodes) {
      if (!validChars.has(ep.A_plot.protagonist)) {
        errors.push(`Episode ${ep.episode_no} A-plot references unknown protagonist: ${ep.A_plot.protagonist}`);
      }
      if (!validAxes.has(ep.value_turn.axis)) {
        errors.push(`Episode ${ep.episode_no} value turn references unknown axis: ${ep.value_turn.axis}`);
      }
      for (const locId of ep.locations) {
        if (!validLocs.has(locId)) {
          errors.push(`Episode ${ep.episode_no} references unknown location: ${locId}`);
        }
      }
    }
  }
  
  // Check scenes
  if (context.scenes) {
    for (const scenePlan of context.scenes) {
      for (const scene of scenePlan.scenes) {
        if (!validLocs.has(scene.setting.loc_id)) {
          errors.push(`Scene ${scene.scene_no} references unknown location: ${scene.setting.loc_id}`);
        }
        
        for (const charId of scene.characters_present) {
          if (!validChars.has(charId)) {
            errors.push(`Scene ${scene.scene_no} references unknown character: ${charId}`);
          }
        }
        
        if (!validAxes.has(scene.conflict_axis)) {
          errors.push(`Scene ${scene.scene_no} references unknown conflict axis: ${scene.conflict_axis}`);
        }
        
        if (!validAxes.has(scene.scene_value_shift.axis)) {
          errors.push(`Scene ${scene.scene_no} value shift references unknown axis: ${scene.scene_value_shift.axis}`);
        }
        
        // B-roll constraints
        const broll = scene.broll_image_brief;
        if (broll.subject_count !== broll.subject_ids.length) {
          errors.push(`Scene ${scene.scene_no} b-roll subject count mismatch: ${broll.subject_count} vs ${broll.subject_ids.length}`);
        }
        
        for (const subjectId of broll.subject_ids) {
          if (!scene.characters_present.includes(subjectId)) {
            errors.push(`Scene ${scene.scene_no} b-roll subject ${subjectId} not present in scene`);
          }
        }
        
        if (broll.keywords.length !== 2 || !broll.keywords.includes('candid') || !broll.keywords.includes('amateur')) {
          errors.push(`Scene ${scene.scene_no} b-roll keywords must be exactly ["candid", "amateur"]`);
        }
        
        // Value turn must actually turn
        if (scene.scene_value_shift.from === scene.scene_value_shift.to) {
          errors.push(`Scene ${scene.scene_no} value shift does not turn (from === to)`);
        }
        
        // Character recasts validation
        for (const recast of scene.scene_character_recasts) {
          if (!validChars.has(recast.char_id)) {
            errors.push(`Scene ${scene.scene_no} recast references unknown character: ${recast.char_id}`);
          }
          if (recast.minimal_visual_traits.length > 3) {
            errors.push(`Scene ${scene.scene_no} recast for ${recast.char_id} has too many traits (max 3)`);
          }
        }
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Referential integrity violations:\n${errors.join('\n')}`);
  }
}

export function generateId(prefix: string, suffix?: string): string {
  const base = prefix.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const id = suffix ? `${base}_${suffix}` : base;
  return id.slice(0, 64); // Ensure max length
}

export function hashSeed(...inputs: (string | number)[]): number {
  const str = inputs.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
export type IdSlug = string;
export type AxisId = IdSlug;
export type CharId = IdSlug;
export type FactionId = IdSlug;
export type LocId = IdSlug;

export interface ValueSpectrum {
  axis: AxisId;
  definition: string;
}

export interface Universe {
  universe_id: IdSlug;
  title: string;
  genre: string[];
  tone: string[];
  world_rules: {
    tech: string[];
    constraints: string[];
    magic_or_meta?: string | null;
  };
  value_spectrums: ValueSpectrum[];
  motifs_symbols: string[];
  lexicon: {
    slang?: string[];
    gestures?: string[];
  };
  locations_catalog: LocId[];
  factions_catalog: FactionId[];
  notes?: string;
}

export interface ControllingIdea {
  universe_id: IdSlug;
  controlling_idea: {
    assertion: string;
    counterassertion: string;
    value_axes_in_play: AxisId[];
    test_vectors: string[];
  };
}

export interface Faction {
  id: FactionId;
  name: string;
  mission: string;
  methods: string[];
  position_on_axes: Record<AxisId, number>;
  resources: string[];
  signature_tactics: string[];
  visual_cues: string[];
  key_figures: CharId[];
}

export interface FactionsBundle {
  universe_id: IdSlug;
  factions: Faction[];
}

export interface Character {
  id: CharId;
  name: string;
  role_archetype: 'protagonist' | 'antagonist' | 'ally' | 'foil' | 'mentor' | 'trickster' | 'confidante';
  public_mask: string;
  private_truth: string;
  wants: string;
  needs: string;
  skills_strengths: string[];
  flaws_contradictions: string[];
  relationships: {
    other_id: CharId;
    type: 'ally' | 'rival' | 'mentor' | 'love' | 'family' | 'betrayer' | 'confidante';
    tension_axis: AxisId;
    current_value: number;
  }[];
  faction_affiliations: FactionId[];
  position_on_axes: Record<AxisId, number>;
  visual_bible: {
    age_range: string;
    body_outline: string;
    face_keypoints: string;
    hair: string;
    apparel_core: string[];
    props: string[];
    palette: string[];
    surface_textures: string[];
    iconic_silhouette: string;
    style_notes: string[];
    negatives: string[];
  };
  diffusion_control: {
    prompt_core: string;
    negative_prompt: string;
    seed: number;
    aspect_ratio: string;
    consistency_tags: string[];
  };
}

export interface CharacterRoster {
  universe_id: IdSlug;
  characters: Character[];
}

export interface Location {
  id: LocId;
  name: string;
  function_in_story: string;
  sensory_palette: string[];
  blocking_affordances: string[];
  iconic_composition: string;
  diffusion_guide: {
    prompt_core: string;
    negative_prompt: string;
    aspect_ratio: string;
    consistency_tags: string[];
  };
}

export interface LocationsBundle {
  universe_id: IdSlug;
  locations: Location[];
}

export interface PairwisePressure {
  between: [CharId, CharId];
  primary_axis: AxisId;
  stakes: string;
  pressure_points: string[];
  likely_reversals: string[];
}

export interface ConflictMatrix {
  universe_id: IdSlug;
  conflict_axes: AxisId[];
  pairwise_pressures: PairwisePressure[];
  escalation_ladder: {
    tier: 1 | 2 | 3;
    scope: 'personal' | 'institutional' | 'existential';
    events: string[];
  }[];
}

export interface SeasonArc {
  universe_id: IdSlug;
  arc_title: string;
  inciting_incident: {
    event: string;
    value_shift: {
      axis: AxisId;
      from: string;
      to: string;
    };
  };
  act_structure: {
    act: 1 | 2 | 3;
    promise_of_the_premise?: string;
    turning_point?: {
      event: string;
      reversal: string;
    };
    complications?: string[];
    midpoint_reversal?: {
      event: string;
      reversal: string;
    };
    rising_stakes?: string[];
    crisis?: {
      dilemma: string;
      values: string[];
    };
    climax?: {
      event: string;
      moral_choice_reveals_true_character: boolean;
    };
    resolution?: {
      new_equilibrium: string;
    };
  }[];
  episode_count: number;
  episode_promises: {
    ep: number;
    act: 1 | 2 | 3;
    value_axis: AxisId;
    turn: string;
  }[];
}

export interface EpisodePlan {
  universe_id: IdSlug;
  season_arc_id: IdSlug;
  episode_no: number;
  episode_title: string;
  dramatic_question: string;
  A_plot: {
    protagonist: CharId;
    goal: string;
    opposition: string;
    stakes: string;
  };
  B_plot: {
    focus: string;
    goal: string;
    cross_pressure: string;
  };
  value_turn: {
    axis: AxisId;
    from: string;
    to: string;
  };
  reversals: string[];
  locations: LocId[];
  beats: string[];
}

export interface SceneBeat {
  beat_no: number;
  action: string;
  micro_turn: string;
}

export interface SceneCharacterRecast {
  char_id: CharId;
  minimal_visual_traits: string[];
  avoid_list: string[];
}

export interface BrollImageBrief {
  time_offset: 'pre_scene' | 'post_scene';
  subject_count: 1 | 2;
  subject_ids: CharId[];
  framing: 'over_shoulder' | 'profile' | 'reflection' | 'through_glass' | 'partial_occlusion' | 'crop_past_face';
  activity_suggestion: string;
  setting_details: string;
  keywords: ['candid', 'amateur'];
}

export interface SceneUnit {
  scene_no: number;
  setting: {
    loc_id: LocId;
    time: string;
    weather: string;
  };
  characters_present: CharId[];
  conflict_axis: AxisId;
  objective: string;
  obstacles: string[];
  beat_list: SceneBeat[];
  scene_value_shift: {
    from: string;
    to: string;
    axis: AxisId;
  };
  button: string;
  scene_character_recasts: SceneCharacterRecast[];
  broll_image_brief: BrollImageBrief;
}

export interface ScenePlan {
  universe_id: IdSlug;
  episode_no: number;
  scenes: SceneUnit[];
}

// Generation Context for passing between steps
export interface GenerationContext {
  universe: Universe;
  controllingIdea?: ControllingIdea;
  factions?: FactionsBundle;
  characters?: CharacterRoster;
  locations?: LocationsBundle;
  conflicts?: ConflictMatrix;
  seasonArc?: SeasonArc;
  episodes?: EpisodePlan[];
  scenes?: ScenePlan[];
}
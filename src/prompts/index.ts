export const UNIVERSE_PROMPT = `
Role: Worldbuilder.
Task: Generate a Universe that dramatizes value conflict, not lore.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "generated_id_here",
  "title": "Universe Title",
  "genre": ["genre1", "genre2"],
  "tone": ["tone1", "tone2"],
  "world_rules": {
    "tech": ["tech constraint 1", "tech constraint 2"],
    "constraints": ["constraint 1", "constraint 2"],
    "magic_or_meta": null
  },
  "value_spectrums": [
    {
      "axis": "axis_id_1",
      "definition": "Value A vs Value B explanation"
    },
    {
      "axis": "axis_id_2", 
      "definition": "Value C vs Value D explanation"
    }
  ],
  "motifs_symbols": ["motif1", "motif2"],
  "lexicon": {
    "slang": ["term1", "term2"],
    "gestures": ["gesture1", "gesture2"]
  },
  "locations_catalog": [],
  "factions_catalog": [],
  "notes": "Optional notes"
}

Requirements:
- Create 2-5 sharp value_spectrums with explicit opposites 
- axis IDs must be lowercase with underscores (e.g., "freedom_vs_security")
- genre and tone must be arrays of strings
- world_rules.tech and world_rules.constraints must be arrays
- catalogs start empty (will be populated later)

Output: Valid Universe JSON only. No additional text or explanation.
`;

export const CONTROLLING_IDEA_PROMPT = `
Role: Dramatist.
Task: Express the controlling idea as "X prevails when/because Y" with a counterassertion.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "controlling_idea": {
    "assertion": "X prevails when/because Y - clear statement",
    "counterassertion": "But Z prevails when/because W - opposing statement", 
    "value_axes_in_play": ["axis_id_1", "axis_id_2"],
    "test_vectors": [
      "Episode test scenario 1",
      "Episode test scenario 2",
      "Episode test scenario 3"
    ]
  }
}

Requirements:
- Reference the Universe's value_spectrums by their exact axis IDs 
- value_axes_in_play must be an array of strings matching axis IDs from the universe
- test_vectors must be an array of strings (not objects)
- Assertion should state what value wins under what conditions
- Counterassertion should challenge the assertion compellingly

Output: Valid ControllingIdea JSON only. No additional text or explanation.
`;

export const FACTIONS_PROMPT = `
Role: Systems Designer.
Task: Create 2-5 factions that conflict by design, not accident.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "factions": [
    {
      "id": "faction_id_1",
      "name": "Faction Name",
      "mission": "What they're trying to achieve",
      "methods": ["method 1", "method 2"],
      "position_on_axes": {
        "axis_id_1": 0.8,
        "axis_id_2": -0.5
      },
      "resources": ["resource 1", "resource 2"],
      "signature_tactics": ["tactic 1", "tactic 2"], 
      "visual_cues": ["visual 1", "visual 2"],
      "key_figures": []
    }
  ]
}

Requirements:
- Each faction needs all required fields
- position_on_axes values must be between -1 and +1
- key_figures should be empty array (characters come later)
- Factions should embody different positions on the value axes
- Methods and tactics should reflect their value positions

Output: Valid FactionsBundle JSON only. No additional text or explanation.
`;

export const CHARACTERS_PROMPT = `
Role: Casting + Psychology.
Task: Create 4-8 characters with wants vs needs, flaws, relationships, and modular visual designs.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "characters": [
    {
      "id": "char_id_1",
      "name": "Character Name",
      "role_archetype": "protagonist",
      "public_mask": "How they present themselves",
      "private_truth": "What they hide",
      "wants": "What they consciously pursue",
      "needs": "What they actually require for growth",
      "skills_strengths": ["skill 1", "skill 2"],
      "flaws_contradictions": ["flaw 1", "flaw 2"],
      "relationships": [
        {
          "other_id": "char_id_2",
          "type": "ally",
          "tension_axis": "axis_id_1",
          "current_value": 0.5
        }
      ],
      "faction_affiliations": ["faction_id_1"],
      "position_on_axes": {
        "axis_id_1": 0.7,
        "axis_id_2": -0.3
      },
      "visual_bible": {
        "age_range": "20s-30s",
        "body_outline": "physical description",
        "face_keypoints": "facial features",
        "hair": "hair description",
        "apparel_core": ["clothing item 1", "clothing item 2"],
        "props": ["prop 1", "prop 2"],
        "palette": ["color 1", "color 2"],
        "surface_textures": ["texture 1", "texture 2"],
        "iconic_silhouette": "distinctive silhouette",
        "style_notes": ["style note 1", "style note 2"],
        "negatives": ["avoid this", "avoid that"]
      },
      "diffusion_control": {
        "prompt_core": "core visual prompt",
        "negative_prompt": "what to avoid",
        "seed": 0,
        "aspect_ratio": "1:1",
        "consistency_tags": ["tag1", "tag2"]
      }
    }
  ]
}

Requirements:
- Character IDs must be lowercase with underscores (e.g., "annie_williams", "marcus_chen")
- Build cross-character relationships with tension on value axes
- Visual descriptions should be modular for scene-specific recasting
- role_archetype must be: protagonist, antagonist, ally, foil, mentor, trickster, or confidante
- relationship type must be: ally, rival, mentor, love, family, betrayer, or confidante
- All array fields must be arrays, all object fields must be objects

Output: Valid CharacterRoster JSON only. No additional text or explanation.
`;

export const LOCATIONS_PROMPT = `
Role: Production Designer.
Task: Create 5-10 locations that afford conflict through spatial design.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "locations": [
    {
      "id": "location_id_1",
      "name": "Location Name",
      "function_in_story": "What role this location serves",
      "sensory_palette": ["sight detail", "sound detail", "smell detail"],
      "blocking_affordances": ["spatial feature 1", "spatial feature 2"],
      "iconic_composition": "Key visual framing",
      "diffusion_guide": {
        "prompt_core": "visual prompt for AI generation",
        "negative_prompt": "what to avoid",
        "aspect_ratio": "16:9",
        "consistency_tags": ["tag1", "tag2"]
      }
    }
  ]
}

Requirements:
- sensory_palette and blocking_affordances must be arrays of strings
- diffusion_guide must be an object with required fields
- Blocking affordances should create natural opportunities for confrontation, concealment, revelation

Output: Valid LocationsBundle JSON only. No additional text or explanation.
`;

export const CONFLICT_MATRIX_PROMPT = `
Role: Opposition Engineer.
Task: Build pairwise pressures between characters and a 3-tier escalation ladder.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "conflict_axes": ["axis_id_1", "axis_id_2"],
  "pairwise_pressures": [
    {
      "between": ["char_id_1", "char_id_2"],
      "primary_axis": "axis_id_1",
      "stakes": "What's at risk",
      "pressure_points": ["trigger 1", "trigger 2"],
      "likely_reversals": ["reversal 1", "reversal 2"]
    }
  ],
  "escalation_ladder": [
    {
      "tier": 1,
      "scope": "personal",
      "events": ["personal level event 1", "personal level event 2"]
    },
    {
      "tier": 2,
      "scope": "institutional", 
      "events": ["institutional level event 1", "institutional level event 2"]
    },
    {
      "tier": 3,
      "scope": "existential",
      "events": ["existential level event 1", "existential level event 2"]
    }
  ]
}

Requirements:
- conflict_axes must reference existing axis IDs from the universe
- pairwise_pressures must be array with character IDs from roster
- escalation_ladder must have exactly 3 tiers

Output: Valid ConflictMatrix JSON only. No additional text or explanation.
`;

export const SEASON_ARC_PROMPT = `
Role: Structuralist.
Task: Define macro structure with inciting incident, act turns, and episodic value promises.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "arc_title": "Season Title",
  "inciting_incident": {
    "event": "What happens to start the story",
    "value_shift": {
      "axis": "axis_id_1",
      "from": "starting state",
      "to": "new state after incident"
    }
  },
  "act_structure": [
    {
      "act": 1,
      "promise_of_the_premise": "What act 1 promises",
      "turning_point": {
        "event": "Act 1 turning point",
        "reversal": "How it changes everything"
      },
      "complications": ["complication 1", "complication 2"]
    },
    {
      "act": 2,
      "promise_of_the_premise": "What act 2 promises",
      "midpoint_reversal": {
        "event": "Midpoint reversal event",
        "reversal": "How it changes trajectory"
      },
      "rising_stakes": ["stake 1", "stake 2"]
    },
    {
      "act": 3,
      "crisis": {
        "dilemma": "Final impossible choice",
        "values": ["value 1", "value 2"]
      },
      "climax": {
        "event": "Climactic event",
        "moral_choice_reveals_true_character": true
      },
      "resolution": {
        "new_equilibrium": "How the world has changed"
      }
    }
  ],
  "episode_count": 6,
  "episode_promises": [
    {
      "ep": 1,
      "act": 1,
      "value_axis": "axis_id_1",
      "turn": "value turn for episode 1"
    },
    {
      "ep": 2,
      "act": 1,
      "value_axis": "axis_id_2", 
      "turn": "value turn for episode 2"
    },
    {
      "ep": 3,
      "act": 2,
      "value_axis": "axis_id_3",
      "turn": "value turn for episode 3"
    },
    {
      "ep": 4,
      "act": 2,
      "value_axis": "axis_id_1",
      "turn": "value turn for episode 4"
    },
    {
      "ep": 5,
      "act": 3,
      "value_axis": "axis_id_2",
      "turn": "value turn for episode 5"
    },
    {
      "ep": 6,
      "act": 3,
      "value_axis": "axis_id_3",
      "turn": "value turn for episode 6"
    }
  ]
}

Requirements:
- episode_promises must have one entry per episode_count
- Episodes 1-2 are Act 1, Episodes 3-4 are Act 2, Episodes 5-6 are Act 3
- All axis references must match universe value_spectrums
- act_structure must have exactly 3 acts
- Episode distribution: 2 episodes per act (6 total default)

Output: Valid SeasonArc JSON only. No additional text or explanation.
`;

export const EPISODE_PLAN_PROMPT = `
Role: Episodic Designer.
Task: Create A/B plots and reversals with a clear value turn for one episode.

CRITICAL: Output must be valid JSON matching this exact structure:

{
  "universe_id": "same_as_input_universe_id",
  "season_arc_id": "arc_id_from_season",
  "episode_no": 1,
  "episode_title": "Episode Title",
  "dramatic_question": "What question will this episode answer?",
  "A_plot": {
    "protagonist": "char_id_1",
    "goal": "What protagonist wants this episode",
    "opposition": "Who/what opposes them",
    "stakes": "What happens if they fail"
  },
  "B_plot": {
    "focus": "What B-plot centers on",
    "goal": "B-plot objective",
    "cross_pressure": "How B-plot complicates A-plot"
  },
  "value_turn": {
    "axis": "axis_id_1",
    "from": "starting value state",
    "to": "ending value state"
  },
  "reversals": ["reversal 1", "reversal 2"],
  "locations": ["loc_id_1", "loc_id_2"],
  "beats": ["beat 1", "beat 2", "beat 3"]
}

Requirements:
- protagonist must be valid character ID
- value_turn.axis must match universe value_spectrums
- locations must reference existing location IDs
- reversals must be causal progressions, not arbitrary twists

Output: Valid EpisodePlan JSON only. No additional text or explanation.
`;

export const SCENE_PLAN_PROMPT = `
Role: Beat Mechanic.
Task: Break episode into scenes with value shifts, character recasts, and b-roll briefs.

CRITICAL: Output must be valid JSON with 3-5 scenes per episode matching this exact structure:

{
  "universe_id": "same_as_input_universe_id", 
  "episode_no": 1,
  "scenes": [
    {
      "scene_no": 1,
      "setting": {
        "loc_id": "location_id_1",
        "time": "day/night/morning",
        "weather": "clear/rainy/foggy"
      },
      "characters_present": ["char_id_1", "char_id_2"],
      "conflict_axis": "axis_id_1",
      "objective": "What characters want in this scene",
      "obstacles": ["active opposition 1", "active opposition 2"],
      "beat_list": [
        {
          "beat_no": 1,
          "action": "What happens in this beat",
          "micro_turn": "Small value shift in this beat"
        },
        {
          "beat_no": 2,
          "action": "What happens next",
          "micro_turn": "Next small shift"
        }
      ],
      "scene_value_shift": {
        "from": "starting state",
        "to": "ending state",
        "axis": "axis_id_1"
      },
      "button": "How scene ends/transitions",
      "scene_character_recasts": [
        {
          "char_id": "char_id_1",
          "minimal_visual_traits": ["trait 1", "trait 2"],
          "avoid_list": ["avoid this", "avoid that"]
        }
      ],
      "broll_image_brief": {
        "time_offset": "pre_scene",
        "subject_count": 1,
        "subject_ids": ["char_id_1"],
        "framing": "over_shoulder",
        "activity_suggestion": "natural activity",
        "setting_details": "environmental details",
        "keywords": ["candid", "amateur"]
      }
    }
  ]
}

CRITICAL B-roll constraints:
- subject_count must be 1 or 2 only
- subject_ids must be subset of characters_present
- keywords must be exactly ["candid", "amateur"]
- framing must be: over_shoulder, profile, reflection, through_glass, partial_occlusion, or crop_past_face

Requirements:
- Generate 3-5 scenes per episode for proper dramatic pacing
- scene_value_shift.from must NOT equal scene_value_shift.to  
- minimal_visual_traits max 3 items per character
- obstacles must be active opposition, not mere difficulty
- Each scene should build toward episode's overall value turn

Output: Valid ScenePlan JSON with 3-5 scenes only. No additional text or explanation.
`;
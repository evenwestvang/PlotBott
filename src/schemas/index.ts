export const STORYWORLD_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/storyworld.schema.json",
  "title": "Storyworld Schemas",
  "type": "object",
  "definitions": {
    "IdSlug": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:[._-][a-z0-9]+)*$",
      "minLength": 1,
      "maxLength": 64
    },
    "AxisId": { "$ref": "#/definitions/IdSlug" },
    "CharId": { "$ref": "#/definitions/IdSlug" },
    "FactionId": { "$ref": "#/definitions/IdSlug" },
    "LocId": { "$ref": "#/definitions/IdSlug" },

    "ValueSpectrum": {
      "type": "object",
      "additionalProperties": false,
      "required": ["axis", "definition"],
      "properties": {
        "axis": { "$ref": "#/definitions/AxisId" },
        "definition": { "type": "string", "minLength": 1 }
      }
    },

    "Universe": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id", "title", "genre", "tone", "world_rules", "value_spectrums", "motifs_symbols", "lexicon", "locations_catalog", "factions_catalog"],
      "properties": {
        "original_concept": { "type": "string" },
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "title": { "type": "string", "minLength": 1 },
        "genre": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "tone": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "world_rules": {
          "type": "object",
          "additionalProperties": false,
          "required": ["tech", "constraints"],
          "properties": {
            "tech": { "type": "array", "items": { "type": "string" } },
            "constraints": { "type": "array", "items": { "type": "string" } },
            "magic_or_meta": { "type": ["string", "null"] }
          }
        },
        "value_spectrums": {
          "type": "array",
          "items": { "$ref": "#/definitions/ValueSpectrum" },
          "minItems": 2,
          "maxItems": 5,
          "uniqueItems": true
        },
        "motifs_symbols": { "type": "array", "items": { "type": "string" } },
        "lexicon": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "slang": { "type": "array", "items": { "type": "string" } },
            "gestures": { "type": "array", "items": { "type": "string" } }
          }
        },
        "locations_catalog": { "type": "array", "items": { "$ref": "#/definitions/LocId" } },
        "factions_catalog": { "type": "array", "items": { "$ref": "#/definitions/FactionId" } },
        "notes": { "type": "string" }
      }
    },

    "ControllingIdea": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id", "controlling_idea"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "controlling_idea": {
          "type": "object",
          "additionalProperties": false,
          "required": ["assertion", "counterassertion", "value_axes_in_play", "test_vectors"],
          "properties": {
            "assertion": { "type": "string", "minLength": 1 },
            "counterassertion": { "type": "string", "minLength": 1 },
            "value_axes_in_play": { "type": "array", "items": { "$ref": "#/definitions/AxisId" }, "minItems": 1 },
            "test_vectors": { "type": "array", "items": { "type": "string" }, "minItems": 2 }
          }
        }
      }
    },

    "Faction": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "name", "mission", "methods", "position_on_axes", "resources", "signature_tactics", "visual_cues", "key_figures"],
      "properties": {
        "id": { "$ref": "#/definitions/FactionId" },
        "name": { "type": "string", "minLength": 1 },
        "mission": { "type": "string", "minLength": 1 },
        "methods": { "type": "array", "items": { "type": "string" } },
        "position_on_axes": {
          "type": "object",
          "additionalProperties": { "type": "number", "minimum": -1, "maximum": 1 }
        },
        "resources": { "type": "array", "items": { "type": "string" } },
        "signature_tactics": { "type": "array", "items": { "type": "string" } },
        "visual_cues": { "type": "array", "items": { "type": "string" } },
        "key_figures": { "type": "array", "items": { "$ref": "#/definitions/CharId" } }
      }
    },

    "FactionsBundle": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id", "factions"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "factions": {
          "type": "array",
          "items": { "$ref": "#/definitions/Faction" },
          "minItems": 2
        }
      }
    },

    "Character": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "name", "role_archetype", "public_mask", "private_truth", "wants", "needs", "skills_strengths", "flaws_contradictions", "relationships", "faction_affiliations", "position_on_axes", "visual_bible", "diffusion_control"],
      "properties": {
        "id": { "$ref": "#/definitions/CharId" },
        "name": { "type": "string", "minLength": 1 },
        "role_archetype": { "type": "string", "enum": ["protagonist","antagonist","ally","foil","mentor","trickster","confidante"] },
        "public_mask": { "type": "string" },
        "private_truth": { "type": "string" },
        "wants": { "type": "string" },
        "needs": { "type": "string" },
        "skills_strengths": { "type": "array", "items": { "type": "string" } },
        "flaws_contradictions": { "type": "array", "items": { "type": "string" } },
        "relationships": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["other_id", "type", "tension_axis", "current_value"],
            "properties": {
              "other_id": { "$ref": "#/definitions/CharId" },
              "type": { "type": "string", "enum": ["ally","rival","mentor","love","family","betrayer","confidante"] },
              "tension_axis": { "$ref": "#/definitions/AxisId" },
              "current_value": { "type": "number", "minimum": -1, "maximum": 1 }
            }
          }
        },
        "faction_affiliations": { "type": "array", "items": { "$ref": "#/definitions/FactionId" } },
        "position_on_axes": {
          "type": "object",
          "additionalProperties": { "type": "number", "minimum": -1, "maximum": 1 }
        },
        "visual_bible": {
          "type": "object",
          "additionalProperties": false,
          "required": ["age_range","body_outline","face_keypoints","hair","apparel_core","props","palette","surface_textures","iconic_silhouette","style_notes","negatives"],
          "properties": {
            "age_range": { "type": "string" },
            "body_outline": { "type": "string" },
            "face_keypoints": { "type": "string" },
            "hair": { "type": "string" },
            "apparel_core": { "type": "array", "items": { "type": "string" } },
            "props": { "type": "array", "items": { "type": "string" } },
            "palette": { "type": "array", "items": { "type": "string" } },
            "surface_textures": { "type": "array", "items": { "type": "string" } },
            "iconic_silhouette": { "type": "string" },
            "style_notes": { "type": "array", "items": { "type": "string" } },
            "negatives": { "type": "array", "items": { "type": "string" } }
          }
        },
        "diffusion_control": {
          "type": "object",
          "additionalProperties": false,
          "required": ["prompt_core","negative_prompt","seed","aspect_ratio","consistency_tags"],
          "properties": {
            "prompt_core": { "type": "string" },
            "negative_prompt": { "type": "string" },
            "seed": { "type": "integer" },
            "aspect_ratio": { "type": "string" },
            "consistency_tags": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },

    "CharacterRoster": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id", "characters"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "characters": {
          "type": "array",
          "items": { "$ref": "#/definitions/Character" },
          "minItems": 4
        }
      }
    },

    "Location": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id","name","function_in_story","sensory_palette","blocking_affordances","iconic_composition","diffusion_guide"],
      "properties": {
        "id": { "$ref": "#/definitions/LocId" },
        "name": { "type": "string" },
        "function_in_story": { "type": "string" },
        "sensory_palette": { "type": "array", "items": { "type": "string" } },
        "blocking_affordances": { "type": "array", "items": { "type": "string" } },
        "iconic_composition": { "type": "string" },
        "diffusion_guide": {
          "type": "object",
          "additionalProperties": false,
          "required": ["prompt_core","negative_prompt","aspect_ratio","consistency_tags"],
          "properties": {
            "prompt_core": { "type": "string" },
            "negative_prompt": { "type": "string" },
            "aspect_ratio": { "type": "string" },
            "consistency_tags": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },

    "LocationsBundle": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id","locations"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "locations": { "type": "array", "items": { "$ref": "#/definitions/Location" }, "minItems": 5 }
      }
    },

    "PairwisePressure": {
      "type": "object",
      "additionalProperties": false,
      "required": ["between","primary_axis","stakes","pressure_points","likely_reversals"],
      "properties": {
        "between": {
          "type": "array",
          "items": { "$ref": "#/definitions/CharId" },
          "minItems": 2,
          "maxItems": 2,
          "uniqueItems": true
        },
        "primary_axis": { "$ref": "#/definitions/AxisId" },
        "stakes": { "type": "string" },
        "pressure_points": { "type": "array", "items": { "type": "string" } },
        "likely_reversals": { "type": "array", "items": { "type": "string" } }
      }
    },

    "ConflictMatrix": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id","conflict_axes","pairwise_pressures","escalation_ladder"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "conflict_axes": { "type": "array", "items": { "$ref": "#/definitions/AxisId" }, "minItems": 1 },
        "pairwise_pressures": { "type": "array", "items": { "$ref": "#/definitions/PairwisePressure" }, "minItems": 1 },
        "escalation_ladder": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["tier","scope","events"],
            "properties": {
              "tier": { "type": "integer", "minimum": 1, "maximum": 3 },
              "scope": { "type": "string", "enum": ["personal","institutional","existential"] },
              "events": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
            }
          },
          "minItems": 3,
          "maxItems": 3
        }
      }
    },

    "SeasonArc": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id","arc_title","inciting_incident","act_structure","episode_count","episode_promises"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "arc_title": { "type": "string" },
        "inciting_incident": {
          "type": "object",
          "additionalProperties": false,
          "required": ["event","value_shift"],
          "properties": {
            "event": { "type": "string" },
            "value_shift": {
              "type": "object",
              "additionalProperties": false,
              "required": ["axis","from","to"],
              "properties": {
                "axis": { "$ref": "#/definitions/AxisId" },
                "from": { "type": "string" },
                "to": { "type": "string" }
              }
            }
          }
        },
        "act_structure": {
          "type": "array",
          "minItems": 3,
          "maxItems": 3,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "act": { "type": "integer", "minimum": 1, "maximum": 3 },
              "promise_of_the_premise": { "type": "string" },
              "turning_point": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "event": { "type": "string" },
                  "reversal": { "type": "string" }
                },
                "required": ["event","reversal"]
              },
              "complications": { "type": "array", "items": { "type": "string" } },
              "midpoint_reversal": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "event": { "type": "string" },
                  "reversal": { "type": "string" }
                }
              },
              "rising_stakes": { "type": "array", "items": { "type": "string" } },
              "crisis": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "dilemma": { "type": "string" },
                  "values": { "type": "array", "items": { "type": "string" } }
                }
              },
              "climax": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "event": { "type": "string" },
                  "moral_choice_reveals_true_character": { "type": "boolean" }
                }
              },
              "resolution": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "new_equilibrium": { "type": "string" }
                }
              }
            }
          }
        },
        "episode_count": { "type": "integer", "minimum": 1 },
        "episode_promises": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["ep","act","value_axis","turn"],
            "properties": {
              "ep": { "type": "integer", "minimum": 1 },
              "act": { "type": "integer", "minimum": 1, "maximum": 3 },
              "value_axis": { "$ref": "#/definitions/AxisId" },
              "turn": { "type": "string" }
            }
          },
          "minItems": 1
        }
      }
    },

    "EpisodePlan": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id","season_arc_id","episode_no","episode_title","dramatic_question","A_plot","B_plot","value_turn","reversals","locations","beats"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "season_arc_id": { "$ref": "#/definitions/IdSlug" },
        "episode_no": { "type": "integer", "minimum": 1 },
        "episode_title": { "type": "string" },
        "dramatic_question": { "type": "string" },
        "A_plot": {
          "type": "object",
          "additionalProperties": false,
          "required": ["protagonist","goal","opposition","stakes"],
          "properties": {
            "protagonist": { "$ref": "#/definitions/CharId" },
            "goal": { "type": "string" },
            "opposition": { "type": "string" },
            "stakes": { "type": "string" }
          }
        },
        "B_plot": {
          "type": "object",
          "additionalProperties": false,
          "required": ["focus","goal","cross_pressure"],
          "properties": {
            "focus": { "type": "string" },
            "goal": { "type": "string" },
            "cross_pressure": { "type": "string" }
          }
        },
        "value_turn": {
          "type": "object",
          "additionalProperties": false,
          "required": ["axis","from","to"],
          "properties": {
            "axis": { "$ref": "#/definitions/AxisId" },
            "from": { "type": "string" },
            "to": { "type": "string" }
          }
        },
        "reversals": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "locations": { "type": "array", "items": { "$ref": "#/definitions/LocId" }, "minItems": 1 },
        "beats": { "type": "array", "items": { "type": "string" } }
      }
    },

    "SceneBeat": {
      "type": "object",
      "additionalProperties": false,
      "required": ["beat_no","action","micro_turn"],
      "properties": {
        "beat_no": { "type": "integer", "minimum": 1 },
        "action": { "type": "string" },
        "micro_turn": { "type": "string" }
      }
    },

    "SceneCharacterRecast": {
      "type": "object",
      "additionalProperties": false,
      "required": ["char_id","minimal_visual_traits","avoid_list"],
      "properties": {
        "char_id": { "$ref": "#/definitions/CharId" },
        "minimal_visual_traits": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1,
          "maxItems": 3
        },
        "avoid_list": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },

    "BrollImageBrief": {
      "type": "object",
      "additionalProperties": false,
      "required": ["time_offset","subject_count","subject_ids","framing","activity_suggestion","setting_details","keywords"],
      "properties": {
        "time_offset": { "type": "string", "enum": ["pre_scene","post_scene"] },
        "subject_count": { "type": "integer", "minimum": 1, "maximum": 2 },
        "subject_ids": {
          "type": "array",
          "items": { "$ref": "#/definitions/CharId" },
          "minItems": 1,
          "maxItems": 2,
          "uniqueItems": true
        },
        "framing": {
          "type": "string",
          "enum": ["over_shoulder","profile","reflection","through_glass","partial_occlusion","crop_past_face"]
        },
        "activity_suggestion": { "type": "string" },
        "setting_details": { "type": "string" },
        "keywords": {
          "type": "array",
          "items": { "enum": ["candid","amateur"] },
          "minItems": 2,
          "maxItems": 2,
          "uniqueItems": true
        }
      }
    },

    "SceneUnit": {
      "type": "object",
      "additionalProperties": false,
      "required": ["scene_no","setting","characters_present","conflict_axis","objective","obstacles","beat_list","scene_value_shift","button","scene_character_recasts","broll_image_brief"],
      "properties": {
        "scene_no": { "type": "integer", "minimum": 1 },
        "setting": {
          "type": "object",
          "additionalProperties": false,
          "required": ["loc_id","time","weather"],
          "properties": {
            "loc_id": { "$ref": "#/definitions/LocId" },
            "time": { "type": "string" },
            "weather": { "type": "string" }
          }
        },
        "characters_present": { "type": "array", "items": { "$ref": "#/definitions/CharId" }, "minItems": 1 },
        "conflict_axis": { "$ref": "#/definitions/AxisId" },
        "objective": { "type": "string" },
        "obstacles": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "beat_list": { "type": "array", "items": { "$ref": "#/definitions/SceneBeat" }, "minItems": 1 },
        "scene_value_shift": {
          "type": "object",
          "additionalProperties": false,
          "required": ["from","to","axis"],
          "properties": {
            "from": { "type": "string" },
            "to": { "type": "string" },
            "axis": { "$ref": "#/definitions/AxisId" }
          }
        },
        "button": { "type": "string" },
        "scene_character_recasts": { "type": "array", "items": { "$ref": "#/definitions/SceneCharacterRecast" } },
        "broll_image_brief": { "$ref": "#/definitions/BrollImageBrief" }
      }
    },

    "ScenePlan": {
      "type": "object",
      "additionalProperties": false,
      "required": ["universe_id","episode_no","scenes"],
      "properties": {
        "universe_id": { "$ref": "#/definitions/IdSlug" },
        "episode_no": { "type": "integer", "minimum": 1 },
        "scenes": {
          "type": "array",
          "items": { "$ref": "#/definitions/SceneUnit" },
          "minItems": 1
        }
      }
    }
  }
} as const;
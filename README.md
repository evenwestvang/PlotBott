# PlotBott

A story generation pipeline that creates complete dramatic narratives from universe to scenes, including b-roll image briefs optimized for diffusion models, with ComfyUI integration for automatic image generation.

## Features

- **Dramatic Structure**: Follows Robert McKee's dramatic principles throughout the entire generation process
- **8-Step Generation Pipeline**: Universe → Controlling Idea → Factions → Characters → Locations → Conflicts → Season Arc → Episodes → Scenes  
- **B-roll Image Briefs**: Scene-specific diffusion prompts with strict constraints (max 2 subjects, "candid, amateur" keywords only)
- **ComfyUI Integration**: Automatic b-roll image generation using locally running ComfyUI server
- **Character Recasting**: Scene-specific character visual traits (1-3 minimal traits) to avoid "catalog poses"
- **Referential Integrity**: Full validation of ID references across all story elements
- **JSON Schema Validation**: Strict schema enforcement with AJV validation
- **Deterministic Generation**: Consistent output with proper seed management

## Installation

```bash
npm install
npm run build
```

## Usage

### Generate a Complete Story

```bash
# Generate story with text and images (requires ComfyUI running)
npm run generate "A world where memories can be traded like currency"

# Generate story without images
npm run generate "A world where memories can be traded like currency" --no-images
```

Options:
- `-e, --episodes <number>`: Number of episodes to generate (default: 6)
- `-o, --output <directory>`: Output directory (auto-generated if not specified)
- `--json-only`: Only output raw JSON files
- `--no-broll-prompts`: Skip generating b-roll diffusion prompts
- `--no-images`: Skip generating b-roll images with ComfyUI
- `--comfyui-server <url>`: ComfyUI server URL (default: http://127.0.0.1:8188)
- `--comfyui-workflow <path>`: Path to ComfyUI workflow JSON file

### Setup ComfyUI for Image Generation

```bash
# One-time setup
npm run setup-comfyui

# Start ComfyUI server (in separate terminal)
npm run start-comfyui

# Then generate with images
npm run generate "Your story concept"
```

### Generate Images from Existing Story

```bash
# Generate images for already-created story
npm run generate-images ./output/2025-08-19-your-story-folder
```

### Example Output Structure

```
output/2025-08-19-a-world-where-trust-is-currency/
├── complete-story.json          # Full generation context
├── universe.json               # World rules and value spectrums
├── controlling-idea.json       # Theme and dramatic thesis
├── factions.json              # Opposing systems
├── characters.json            # Character roster with visual bibles
├── locations.json             # Locations with blocking affordances
├── conflicts.json             # Conflict matrix and escalation
├── season-arc.json            # Macro story structure
├── episodes/
│   ├── episode-1.json         # Per-episode plans
│   ├── episode-2.json
│   ├── ...
│   └── episode-6.json
├── scenes/
│   ├── scenes-episode-1.json  # Scene breakdowns with b-roll
│   ├── scenes-episode-2.json
│   ├── ...
│   └── scenes-episode-6.json
├── story-summary.md           # Human-readable summary
├── complete-treatment.html    # Professional HTML treatment
├── performance-report.txt     # API usage analytics
├── broll-prompts.md           # Diffusion-ready image prompts
└── images/                    # Generated b-roll images (if --no-images not used)
    ├── episode-1-scene-1-timestamp.png
    ├── episode-1-scene-1-timestamp.txt  # Image prompt metadata
    ├── episode-1-scene-2-timestamp.png
    └── ...
```

### Validate Existing Story Files

```bash
npm run validate ./output/your-story-folder
```

### Extract B-roll Prompts

```bash
npm run extract-broll ./output/your-story-folder --output ./broll-prompts.txt
```

## Key Design Principles

### McKee-Native Generation
Every step enforces McKee's dramatic principles:
- **Value Conflict**: All action stems from competing values, not external obstacles
- **Scene Value Turns**: Every scene must turn a value (from ≠ to)
- **Active Opposition**: Obstacles are intelligent agents, not mere difficulties
- **Causality**: All beats and reversals follow causal chains

### B-roll Image Constraints
Designed for diffusion model limitations:
- **Subject Limit**: Maximum 2 people per image
- **Style Keywords**: Exactly `["candid", "amateur"]` - no other style tokens
- **Natural Framing**: `over_shoulder`, `profile`, `reflection`, `through_glass`, `partial_occlusion`
- **Scene Recasting**: 1-3 minimal visual traits per character to avoid "pose all features"

### Referential Integrity
All IDs are validated across the complete story:
- Axis IDs must exist in Universe value_spectrums
- Character IDs must resolve to created characters  
- Location IDs must exist in locations catalog
- B-roll subject IDs must be present in scene characters

## Schema Overview

The pipeline uses strict JSON Schema validation for all 12+ object types:

- `Universe`: World rules, value spectrums, catalogs
- `ControllingIdea`: Dramatic thesis with test vectors
- `FactionsBundle`: Opposing systems with value positions
- `CharacterRoster`: Characters with wants/needs and visual bibles
- `LocationsBundle`: Locations with blocking affordances
- `ConflictMatrix`: Pairwise pressures and escalation ladder
- `SeasonArc`: 3-act structure with episode promises
- `EpisodePlan`: A/B plots with value turns
- `ScenePlan`: Scene units with beats and b-roll briefs

## Development

### Run Tests

```bash
npm test
npm run test:golden  # Golden reference tests
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Architecture

### Core Components

- **`src/schemas/`**: JSON Schema definitions
- **`src/types/`**: TypeScript interfaces
- **`src/generators/`**: Step-by-step story generation
- **`src/api/`**: Claude API integration with retry logic
- **`src/utils/`**: Validation and utility functions
- **`src/prompts/`**: Generation prompts

### Generation Pipeline

The pipeline is deterministic and testable:

```typescript
const context = await generator.generateCompleteStory(concept, episodeCount);
```

Each step validates its output and updates the generation context before proceeding.

## Environment Variables

Create a `.env` file:

```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

## License

MIT
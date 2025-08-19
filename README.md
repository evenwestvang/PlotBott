# PlotBott

AI-powered story generation with comprehensive narrative structure. Creates complete dramatic narratives from universe to scenes, including b-roll image briefs optimized for diffusion models.

## Features

- **🎭 Dramatic Structure**: Follows Robert McKee's storytelling principles throughout the entire generation process
- **🔄 8-Step Pipeline**: Universe → Controlling Idea → Factions → Characters → Locations → Conflicts → Season Arc → Episodes → Scenes  
- **🎬 B-roll Image Briefs**: Scene-specific diffusion prompts with strict constraints (max 2 subjects, "candid, amateur" keywords only)
- **🎯 Character Recasting**: Scene-specific character visual traits (1-3 minimal traits) to avoid "catalog poses"
- **🔗 Cross-Reference Integrity**: Full validation of ID references across all story elements with streaming output
- **📊 Performance Tracking**: Comprehensive API call analytics and token usage monitoring
- **⚡ Streaming Output**: Files written as generated for real-time progress feedback
- **🛡️ Schema Validation**: Strict JSON schema enforcement with AJV validation

## Installation

```bash
npm install
npm run build
```

## Usage

### Generate a Complete Story

```bash
npm run dev generate "A world where memories can be traded like currency"
```

Options:
- `[concept]`: Core story concept (default: "A world where trust is currency")
- `-e, --episodes <number>`: Number of episodes to generate (default: 6)
- `-o, --output <directory>`: Output directory (auto-generated if not specified)
- `--json-only`: Only output raw JSON files
- `--no-broll-prompts`: Skip generating b-roll diffusion prompts

### Example Output Structure

```
output/2024-12-20-memories-currency/
├── complete-story.json          # Full generation context
├── universe.json               # World rules and value spectrums (updated with catalogs)
├── controlling-idea.json       # Theme and dramatic thesis
├── factions.json              # Opposing systems (updated with key_figures)
├── characters.json            # Character roster with visual bibles
├── locations.json             # Locations with blocking affordances
├── conflicts.json             # Conflict matrix and escalation
├── season-arc.json            # Macro story structure
├── episodes/
│   ├── episode-1.json         # Per-episode plans
│   └── episode-6.json
├── scenes/
│   ├── scenes-episode-1.json  # Scene breakdowns with b-roll
│   └── scenes-episode-6.json
├── story-summary.md           # Human-readable summary
├── treatment.html             # Professional HTML treatment
├── broll-prompts.md           # Diffusion-ready image prompts
└── performance-report.txt     # API usage analytics
```

### Validate Existing Story Files

```bash
npm run dev validate ./output
```

### Extract B-roll Prompts

```bash
npm run dev extract-broll ./output --output ./broll-prompts.txt
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
- **`src/prompts/`**: McKee-native generation prompts

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
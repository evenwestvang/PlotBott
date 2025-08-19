# Usage Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   npm run build
   ```

2. **Set up environment:**
   Create `.env` file with your Claude API key:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   ```

3. **Generate a story:**
   ```bash
   npm run dev generate --concept "Your story concept here"
   ```

## Command Line Interface

### Generate Complete Story
```bash
npm run dev generate [options]
```

**Options:**
- `-c, --concept <concept>` - Core story concept
- `-e, --episodes <number>` - Number of episodes (default: 3)
- `-o, --output <directory>` - Output directory (default: ./output)
- `--json-only` - Only output JSON files, skip summaries
- `--no-broll-prompts` - Skip b-roll image prompts

**Examples:**
```bash
# Basic generation
npm run dev generate --concept "A world where dreams are taxable"

# Generate 5 episodes to a specific directory
npm run dev generate -c "AI therapists replace human counselors" -e 5 -o ./my-story

# Generate only JSON files
npm run dev generate -c "Time flows backwards on Tuesdays" --json-only
```

### Validate Existing Story
```bash
npm run dev validate <directory>
```

### Extract B-roll Prompts
```bash
npm run dev extract-broll <directory> --output <file>
```

## Programmatic Usage

### Basic Universe Generation

```typescript
import { StoryGenerator } from './src/generators/index.js';

const generator = new StoryGenerator();
const universe = await generator.generateUniverse("Your concept");
```

### Step-by-Step Generation

```typescript
// Generate each component separately
const universe = await generator.generateUniverse(concept);
const controllingIdea = await generator.generateControllingIdea(universe);
const factions = await generator.generateFactions(universe, controllingIdea);
const characters = await generator.generateCharacters(universe, controllingIdea, factions);
// ... etc
```

### Complete Story Generation

```typescript
// Generate everything at once
const completeStory = await generator.generateCompleteStory(concept, episodeCount);

// Access all components
console.log(completeStory.universe.title);
console.log(completeStory.characters.characters.map(c => c.name));
console.log(completeStory.scenes[0].scenes.map(s => s.objective));
```

## Output Structure

When you generate a story, you'll get:

```
output/
├── complete-story.json          # Full generation context
├── universe.json               # World rules and value spectrums
├── controlling-idea.json       # Theme and dramatic thesis
├── factions.json              # Opposing systems
├── characters.json            # Character roster with visual bibles
├── locations.json             # Locations with blocking affordances
├── conflicts.json             # Conflict matrix and escalation
├── season-arc.json            # Macro story structure
├── episodes/
│   ├── episode-1.json
│   └── episode-2.json
├── scenes/
│   ├── scenes-episode-1.json
│   └── scenes-episode-2.json
├── story-summary.md           # Human-readable overview
└── broll-prompts.md          # Diffusion image prompts
```

## Key Components Explained

### Universe
The foundation containing:
- **Value Spectrums**: The core conflicts (e.g., "freedom vs security")
- **World Rules**: Technology and constraints that force choices
- **Genre/Tone**: Artistic direction

### Characters
Each character has:
- **Wants vs Needs**: External goals vs internal growth
- **Visual Bible**: Modular traits for consistent imagery
- **Relationships**: Cross-character tensions on value axes
- **Diffusion Control**: Seeds and prompts for AI art generation

### Scenes
Each scene includes:
- **Value Turn**: Measurable change from beginning to end (from ≠ to)
- **Character Recasts**: 1-3 visual traits specific to this scene
- **B-roll Brief**: Image prompt with max 2 subjects, "candid, amateur" keywords
- **Beat Structure**: Micro-turns that build to the scene's value shift

## B-roll Image Prompts

The system generates diffusion-optimized prompts like:
```
"Elena, walking away, at neon_alley, over shoulder, rain-slick reflections, candid, amateur"
```

**Constraints enforced:**
- Maximum 2 people per image
- Exactly `["candid", "amateur"]` keywords
- Natural framing (over_shoulder, profile, reflection, etc.)
- Scene-appropriate activities

## Validation and Testing

### Run Tests
```bash
npm test                # All tests
npm run test:golden    # Golden reference tests
```

### Validate Schema
The system automatically validates all JSON against strict schemas and checks referential integrity (all IDs must resolve to actual objects).

### Common Validation Errors
- **Value turns that don't turn**: Scene's `from` equals `to`
- **Invalid character references**: Scene references character not in roster
- **B-roll constraint violations**: More than 2 subjects or wrong keywords
- **Missing required fields**: Schema validation catches incomplete objects

## Tips for Best Results

1. **Concept Clarity**: More specific concepts yield better results
   - Good: "Therapists who literally absorb patients' trauma"
   - Okay: "A world where therapy is different"

2. **Episode Count**: Start with 1-3 episodes for testing
   - Full seasons (8-12 episodes) take longer but provide complete arcs

3. **Value Conflicts**: The system works best with moral dilemmas, not external obstacles
   - Good: "Privacy vs safety in surveillance state"
   - Less good: "Heroes vs monsters"

4. **Iteration**: Use individual components to refine concepts
   - Generate just Universe first to test the concept
   - Adjust prompts if needed before full generation

## Troubleshooting

### "No JSON found in Claude response"
Claude returned text that doesn't contain valid JSON. Usually resolves on retry.

### "Referential integrity violations"
Characters, locations, or axes referenced that don't exist. Check the validation output for specific missing IDs.

### "Schema validation failed"
The generated JSON doesn't match the required structure. Check the specific field mentioned in the error.

### API Rate Limits
If you hit Claude's rate limits, the system will retry with exponential backoff automatically.
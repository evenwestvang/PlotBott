#!/usr/bin/env node

import { StoryGenerator } from '../src/generators/index.js';
import { promises as fs } from 'fs';

async function example() {
  const generator = new StoryGenerator();
  
  console.log('🌍 Generating a simple story...');
  
  // Generate just a universe to start
  const universe = await generator.generateUniverse(
    "A world where emotions can be bottled and sold like wine"
  );
  
  console.log('✅ Universe created:');
  console.log(`Title: ${universe.title}`);
  console.log(`Genre: ${universe.genre.join(', ')}`);
  console.log('Value Spectrums:');
  universe.value_spectrums.forEach(vs => {
    console.log(`  - ${vs.axis}: ${vs.definition}`);
  });
  
  // Save the universe
  await fs.writeFile('./example-universe.json', JSON.stringify(universe, null, 2));
  console.log('\n💾 Universe saved to example-universe.json');
  
  // For a complete story, you would continue:
  // const controllingIdea = await generator.generateControllingIdea(universe);
  // const factions = await generator.generateFactions(universe, controllingIdea);
  // etc...
  
  // Or generate everything at once:
  // const completeStory = await generator.generateCompleteStory("concept", 1);
}

example().catch(console.error);
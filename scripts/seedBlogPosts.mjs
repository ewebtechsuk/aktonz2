#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const seedPosts = require('../data/blog-posts.json');

const outputPath = new URL('../data/blog-posts.json', import.meta.url);

async function seed() {
  if (!Array.isArray(seedPosts)) {
    throw new Error('Seed data must be an array of blog posts');
  }

  await writeFile(outputPath, `${JSON.stringify(seedPosts, null, 2)}\n`, 'utf8');
  console.log(`Seeded ${seedPosts.length} blog posts to ${outputPath.pathname}`);
}

seed().catch((error) => {
  console.error('Failed to seed blog posts', error);
  process.exitCode = 1;
});

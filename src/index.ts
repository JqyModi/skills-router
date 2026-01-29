#!/usr/bin/env node
import { SkillsMcpServer } from './server/mcp-server.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve skills directory: Priority to ENV, then relative to this file
// If we are in dist/index.js, skills is at ../skills
// If we are in src/index.ts, skills is at ../skills
const skillsDir = process.env.SKILLS_DIR || path.resolve(__dirname, '../skills');

async function main() {
    console.error(`Status: Initializing skills-router with directory: ${skillsDir}`);
    const server = new SkillsMcpServer(skillsDir);
    await server.refreshSkills();
    await server.run();
}

main().catch((err) => {
    console.error('Fatal error in skills-router:', err);
    process.exit(1);
});

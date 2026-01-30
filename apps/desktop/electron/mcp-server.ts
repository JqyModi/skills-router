import { SkillsMcpServer } from '@skills-router/core/dist/server/mcp-server.js';
import path from 'node:path';

// Resolve skills directory from environment or default path
// In packaged app, __dirname is .../app.asar/dist-electron
const SKILLS_DIR = process.env.SKILLS_DIR || path.join(process.env.HOME || '', 'Library/Application Support/SkillsRouter', 'skills');

async function main() {
    console.error(`Status: Initializing skills-router MCP server with directory: ${SKILLS_DIR}`);
    const server = new SkillsMcpServer(SKILLS_DIR);
    await server.refreshSkills();
    await server.run();
}

main().catch((err) => {
    console.error('Fatal error in skills-router MCP server:', err);
    process.exit(1);
});

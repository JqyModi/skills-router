import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SkillScanner } from '../core/scanner.js';
import { SkillParser, SkillMetadata } from '../core/parser.js';
import { SkillExecutor } from '../core/executor.js';
import path from 'node:path';
import fs from 'node:fs/promises';

export class SkillsMcpServer {
    private server: Server;
    private skills: Map<string, { metadata: SkillMetadata; path: string }> = new Map();
    private executor = new SkillExecutor();

    constructor(private skillsDir: string) {
        this.server = new Server(
            {
                name: 'skills-router',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    async refreshSkills() {
        const scanner = new SkillScanner(this.skillsDir);
        const parser = new SkillParser();

        const discovered = await scanner.scan();
        console.error(`Discovered ${discovered.length} skill folders`);
        const newSkills = new Map<string, { metadata: SkillMetadata; path: string }>();

        for (const skill of discovered) {
            try {
                const metadata = await parser.parse(skill.skillMdPath);
                console.error(`Parsed skill: ${metadata.name}`);
                newSkills.set(metadata.name, { metadata, path: skill.path });
            } catch (err) {
                console.error(`Failed to parse skill at ${skill.path}:`, err);
            }
        }
        this.skills = newSkills;
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            await this.refreshSkills();
            const tools = Array.from(this.skills.entries()).map(([name, info]) => ({
                name,
                description: info.metadata.description,
                inputSchema: {
                    type: 'object',
                    properties: info.metadata.parameters || {},
                    required: Object.keys(info.metadata.parameters || {}),
                },
            }));

            return { tools };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const skillInfo = this.skills.get(name);

            if (!skillInfo) {
                throw new Error(`Skill ${name} not found`);
            }

            // If no scripts are defined, it's a prompt-only skill. Return the skill's instructions.
            const script = skillInfo.metadata.scripts?.[0];
            if (!script) {
                try {
                    const content = await fs.readFile(path.join(skillInfo.path, 'SKILL.md'), 'utf-8');
                    // Remove frontmatter
                    const body = content.replace(/^---[\s\S]*?---/, '').trim();
                    return {
                        content: [{ type: 'text', text: body }],
                    };
                } catch (err) {
                    return {
                        content: [{ type: 'text', text: 'Failed to read skill instructions.' }],
                        isError: true,
                    };
                }
            }

            const output = await this.executor.execute(skillInfo.path, script, args || {});
            return {
                content: [{ type: 'text', text: output }],
            };
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Skills Router MCP server running on stdio');
    }
}

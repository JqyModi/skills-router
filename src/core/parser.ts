import fs from 'node:fs/promises';
import yaml from 'yaml';

export interface SkillMetadata {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    scripts?: string[];
}

export class SkillParser {
    async parse(skillMdPath: string): Promise<SkillMetadata> {
        const content = await fs.readFile(skillMdPath, 'utf-8');

        // More robust regex to extract YAML frontmatter
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        if (!match) {
            console.error(`Error: No YAML frontmatter found in ${skillMdPath}`);
            // Check if it's just missing the newline after the first ---
            if (!content.startsWith('---')) {
                console.error(`Error: ${skillMdPath} does not start with ---`);
            }
            throw new Error(`No YAML frontmatter found in ${skillMdPath}`);
        }

        const metadata = yaml.parse(match[1]);

        return {
            name: metadata.name || 'Unnamed Skill',
            description: metadata.description || 'No description provided',
            parameters: metadata.parameters || {},
            scripts: metadata.scripts || []
        };
    }
}

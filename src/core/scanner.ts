import fs from 'node:fs/promises';
import path from 'node:path';

export interface SkillInfo {
    path: string;
    skillMdPath: string;
}

export class SkillScanner {
    constructor(private baseDir: string) { }

    async scan(): Promise<SkillInfo[]> {
        const skills: SkillInfo[] = [];
        try {
            await this.walk(this.baseDir, skills);
        } catch (err: any) {
            console.error(`Warning: Failed to scan directory ${this.baseDir}: ${err.message}`);
        }
        return skills;
    }

    private async walk(dir: string, results: SkillInfo[]) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            console.error(`Scanning: ${fullPath}`);

            if (entry.isDirectory()) {
                const skillMdPath = path.join(fullPath, 'SKILL.md');
                try {
                    await fs.access(skillMdPath);
                    results.push({
                        path: fullPath,
                        skillMdPath
                    });
                } catch {
                    // Not a skill folder, recurse if needed or skip
                    // For MVP, we only look one level deep or check subdirs
                    await this.walk(fullPath, results);
                }
            }
        }
    }
}

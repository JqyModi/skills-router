import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

export class SkillExecutor {
    async execute(skillPath: string, command: string, args: Record<string, any>): Promise<string> {
        // Basic execution logic: For MVP, we assume the command is a script in scripts/
        // or a direct shell command if configured.

        // In a real scenario, we'd map args to environment variables or command arguments.
        const env = { ...process.env, ...this.flattenArgs(args) };

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: skillPath,
                env
            });

            if (stderr && !stdout) {
                return `Error: ${stderr}`;
            }
            return stdout || stderr || 'Success (no output)';
        } catch (error: any) {
            return `Execution failed: ${error.message}`;
        }
    }

    private flattenArgs(args: Record<string, any>): Record<string, string> {
        const flattened: Record<string, string> = {};
        for (const [key, value] of Object.entries(args)) {
            flattened[`SKILL_ARG_${key.toUpperCase()}`] = String(value);
        }
        return flattened;
    }
}

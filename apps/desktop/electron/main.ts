import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { SkillsMcpServer } from '@skills-router/core/dist/server/mcp-server.js'
import { SkillScanner } from '@skills-router/core/dist/core/scanner.js'
import { SkillParser } from '@skills-router/core/dist/core/parser.js'
import fs from 'node:fs/promises';
import { SkillExecutor } from '@skills-router/core/dist/core/executor.js'


// Revert to __dirname for CJS build
const __dirname = path.dirname(new URL(import.meta.url).pathname);
// Wait, in CJS output (main.cjs), import.meta.url will fail.
// So we should strictly rely on electron-vite injecting identifiers or standard CJS behavior.
// But since we are writing .ts, and package.json is type:module... TS might complain.
// Let's assume the bundler handles __dirname if we target CJS.
// BUT, esbuild/vite might not inject it in ESM source.
// Let's use a robust shim:
// Or better: just don't rely on global __dirname. Use process.cwd()? No, need relative to file.

// ACTUALLY: if we build to CJS, we can typically use __dirname.
// Let's try skipping the shim and assume the bundler does its job, OR use a CJS-safe shim.
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

const DIST_PATH = process.env.DIST || '';
const PUBLIC_PATH = process.env.VITE_PUBLIC || '';

let win: BrowserWindow | null
// VITE_DEV_SERVER_URL is passed by vite-plugin-electron-renderer
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Initialize MCP Server internally
// In dev (not packaged), we are in apps/desktop. Skills are in ../../skills
// In prod (packaged), we default to userData/skills or env
const SKILLS_DIR = process.env.SKILLS_DIR || (
    app.isPackaged
        ? path.join(app.getPath('userData'), 'skills')
        : path.resolve(__dirname, '../../../skills')
);

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(PUBLIC_PATH, 'vite.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    // Test active push message to Renderer
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(DIST_PATH, 'index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(async () => {
    // Ensure SKILLS_DIR exists
    try {
        await fs.access(SKILLS_DIR);
    } catch {
        console.log(`Creating skills directory at ${SKILLS_DIR}`);
        await fs.mkdir(SKILLS_DIR, { recursive: true });

        // In a real distribution, we might copy a template skill here
        // For now, just ensure the folder exists so scanner doesn't crash
    }
    createWindow();
})

// IPC Handlers for Skills Router
ipcMain.handle('get-skills', async () => {
    console.log(`Scanning skills in: ${SKILLS_DIR}`);
    const scanner = new SkillScanner(SKILLS_DIR);
    const skills = await scanner.scan();
    const parser = new SkillParser();

    // Enrich with metadata
    const results = [];
    for (const skill of skills) {
        try {
            const meta = await parser.parse(skill.skillMdPath);
            const content = await fs.readFile(skill.skillMdPath, 'utf-8');
            results.push({ ...skill, metadata: meta, content });
        } catch (e) {
            console.error(e);
            results.push({ ...skill, error: String(e) });
        }
    }
    return results;
});

ipcMain.handle('save-skill', async (_event, skillPath, content) => {
    try {
        await fs.writeFile(skillPath, content, 'utf-8');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('run-skill', async (_event, skillPath, scriptName, args) => {
    const executor = new SkillExecutor();
    try {
        console.log(`Running skill at ${skillPath} with script ${scriptName} and args`, args);
        // Ensure args are string values for env vars
        const result = await executor.execute(skillPath, scriptName, args);
        return { success: true, output: result };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('create-skill', async (_event, skillName) => {
    // Basic validation
    if (!skillName || !/^[a-zA-Z0-9-_]+$/.test(skillName)) {
        return { success: false, error: 'Invalid skill name' };
    }
    const skillPath = path.join(SKILLS_DIR, skillName);
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    try {
        await fs.mkdir(skillPath, { recursive: true });
        const initialContent = `---
name: ${skillName}
description: A new skill
parameters:
  input:
    type: string
    description: Input parameter
---
# ${skillName}
Enter your skill logic here.
`;
        await fs.writeFile(skillMdPath, initialContent, 'utf-8');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('delete-skill', async (_event, skillPath) => {
    try {
        // Security check: ensure path is within SKILLS_DIR
        // This is a basic check.
        if (!skillPath.startsWith(SKILLS_DIR)) {
            return { success: false, error: 'Access denied' };
        }
        await fs.rm(skillPath, { recursive: true, force: true });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-app-info', () => {
    return {
        skillsDir: SKILLS_DIR,
        // The main.cjs is the server entry point for MCP
        serverPath: path.join(__dirname, 'main.cjs')
    };
});

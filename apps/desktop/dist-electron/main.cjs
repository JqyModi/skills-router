"use strict";
const electron = require("electron");
const path = require("node:path");
const executor = require("./executor-Bz75bjeU.cjs");
const fs = require("node:fs/promises");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(new URL(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.cjs", document.baseURI).href).pathname);
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
const DIST_PATH = process.env.DIST || "";
const PUBLIC_PATH = process.env.VITE_PUBLIC || "";
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const SKILLS_DIR = process.env.SKILLS_DIR || (electron.app.isPackaged ? path.join(electron.app.getPath("userData"), "skills") : path.resolve(__dirname$1, "../../../skills"));
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(PUBLIC_PATH, "vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(DIST_PATH, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.app.isReady() && electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(async () => {
  try {
    await fs.access(SKILLS_DIR);
  } catch {
    console.log(`Creating skills directory at ${SKILLS_DIR}`);
    await fs.mkdir(SKILLS_DIR, { recursive: true });
  }
  createWindow();
});
electron.ipcMain.handle("get-skills", async () => {
  console.log(`Scanning skills in: ${SKILLS_DIR}`);
  const scanner = new executor.SkillScanner(SKILLS_DIR);
  const skills = await scanner.scan();
  const parser = new executor.SkillParser();
  const results = [];
  for (const skill of skills) {
    try {
      const meta = await parser.parse(skill.skillMdPath);
      const content = await fs.readFile(skill.skillMdPath, "utf-8");
      results.push({ ...skill, metadata: meta, content });
    } catch (e) {
      console.error(e);
      results.push({ ...skill, error: String(e) });
    }
  }
  return results;
});
electron.ipcMain.handle("save-skill", async (_event, skillPath, content) => {
  try {
    await fs.writeFile(skillPath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
electron.ipcMain.handle("run-skill", async (_event, skillPath, scriptName, args) => {
  const executor$1 = new executor.SkillExecutor();
  try {
    console.log(`Running skill at ${skillPath} with script ${scriptName} and args`, args);
    const result = await executor$1.execute(skillPath, scriptName, args);
    return { success: true, output: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
electron.ipcMain.handle("create-skill", async (_event, skillName) => {
  if (!skillName || !/^[a-zA-Z0-9-_]+$/.test(skillName)) {
    return { success: false, error: "Invalid skill name" };
  }
  const skillPath = path.join(SKILLS_DIR, skillName);
  const skillMdPath = path.join(skillPath, "SKILL.md");
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
    await fs.writeFile(skillMdPath, initialContent, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
electron.ipcMain.handle("delete-skill", async (_event, skillPath) => {
  try {
    if (!skillPath.startsWith(SKILLS_DIR)) {
      return { success: false, error: "Access denied" };
    }
    await fs.rm(skillPath, { recursive: true, force: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
electron.ipcMain.handle("get-app-info", () => {
  return {
    skillsDir: SKILLS_DIR,
    // The mcp-server.cjs is the dedicated server entry point
    serverPath: path.join(__dirname$1, "mcp-server.cjs"),
    appPath: electron.app.getAppPath(),
    exePath: process.execPath
  };
});

import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = process.env.SKILLS_DIR || path.resolve(__dirname$1, "../../skills");
function createWindow() {
  const win = new BrowserWindow({
    width: 1e3,
    height: 700,
    backgroundColor: "#1e1e1e",
    // Dark mode background
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname$1, "../index.html"));
  }
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle("get-skills", async () => {
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const skills = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(SKILLS_DIR, entry.name);
        const skillMdPath = path.join(skillPath, "SKILL.md");
        try {
          await fs.access(skillMdPath);
          const content = await fs.readFile(skillMdPath, "utf-8");
          skills.push({
            id: entry.name,
            name: entry.name,
            // Will be parsed in frontend or improved here later
            path: skillPath,
            content
          });
        } catch {
        }
      }
    }
    return { success: true, skills };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

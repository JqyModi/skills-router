"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getSkills: () => electron.ipcRenderer.invoke("get-skills")
});

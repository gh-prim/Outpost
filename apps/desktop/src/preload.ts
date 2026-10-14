import { contextBridge, ipcRenderer } from "electron";

const origin = process.argv.find((arg) => arg.startsWith("--outpost-origin="))?.split("=")[1];

if (origin && location.origin === origin) {
  // Detected by the web app, which then sends requests from this computer instead of the server.
  contextBridge.exposeInMainWorld("outpostDesktop", {
    run: (input: unknown) => ipcRenderer.invoke("outpost:run", input),
  });
}

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("outpostSetup", {
    setServer: (url: string) => ipcRenderer.invoke("outpost:set-server", url),
  });
}

import { join } from "node:path";
import { runCollection, type RunInput } from "@outpost/engine";
import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { normalizeServerUrl, readConfig, writeConfig } from "./config";

let window: BrowserWindow | null = null;

function serverOrigin() {
  return readConfig().serverUrl;
}

function createWindow() {
  const origin = serverOrigin();
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Outpost",
    backgroundColor: "#09090b",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      // The preload only exposes the local runner to this origin.
      additionalArguments: origin ? [`--outpost-origin=${origin}`] : [],
    },
  });

  // Links that leave the app open in the system browser; SSO redirects stay in the window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (origin) void window.loadURL(origin);
  else void window.loadFile(join(__dirname, "setup.html"));
}

function changeServer() {
  writeConfig({});
  window?.close();
  createWindow();
}

/** Runs requests on this computer, so they reach localhost and the company network. */
ipcMain.handle("outpost:run", async (event, input: RunInput) => {
  const origin = serverOrigin();
  const sender = event.senderFrame?.url ? new URL(event.senderFrame.url).origin : null;
  if (!origin || sender !== origin) throw new Error("Local execution is only available to your Outpost server");
  return runCollection(input);
});

ipcMain.handle("outpost:set-server", async (event, input: string) => {
  // Only the bundled setup page may change the server.
  if (!event.senderFrame?.url.startsWith("file://")) throw new Error("Not allowed");
  const serverUrl = normalizeServerUrl(input);
  const response = await fetch(new URL("/api/auth/ok", serverUrl)).catch(() => null);
  if (!response?.ok) throw new Error(`No Outpost server answered at ${serverUrl}`);
  writeConfig({ serverUrl });
  window?.close();
  createWindow();
});

app.whenReady().then(() => {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
    {
      label: "Outpost",
      submenu: [{ label: "Change server…", click: changeServer }, { type: "separator" }, { role: "reload" }, { role: "toggleDevTools" }],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

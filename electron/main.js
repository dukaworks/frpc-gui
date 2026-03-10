import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure production environment for Express static serving
process.env.NODE_ENV = 'production';

let mainWindow;
let server;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Optional if needed
    },
    icon: path.join(__dirname, '../dist/favicon.png') // Or ico/icns
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

async function startServer() {
  try {
    // Import the compiled Express app
    // Note: dist-server/app.js exports default app
    // We assume dist-server exists (npm run build must run before this)
    const module = await import('../dist-server/app.js');
    const expressApp = module.default;
      
    // Start server on random port
    // Bind to 127.0.0.1 explicitly for security
    const serverInstance = expressApp.listen(0, '127.0.0.1', () => {
      const address = serverInstance.address();
      const port = typeof address === 'string' ? 0 : address.port;
      console.log(`Electron server started on port ${port}`);
      createWindow(port);
    });
    
    server = serverInstance;
  } catch (err) {
    console.error('Failed to start server:', err);
    // In dev, maybe fallback to localhost:3000 if server is already running?
    // But this main.js is for "production-like" electron run.
  }
}

app.on('ready', startServer);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) startServer();
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

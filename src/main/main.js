// Electron main process — app entry point
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { createServer, startServer } = require('./server');
const { getLanIP } = require('./network');
const { exportCSV, exportJSON } = require('./export');
const QRCode = require('qrcode');

let mainWindow;
let serverObj;
let activePort;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        title: 'Zenith Buzzer — Admin Panel',
        icon: path.join(__dirname, '..', 'assets', 'zenith-logo.png'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Remove default menu bar
    Menu.setApplicationMenu(null);

    mainWindow.loadFile(path.join(__dirname, '..', 'admin', 'index.html'));

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function bootstrap() {
    // Create and start the server
    serverObj = createServer();
    activePort = await startServer(serverObj, 3000);

    const lanIP = getLanIP();
    const joinURL = `http://${lanIP}:${activePort}`;

    console.log(`[Zenith Buzzer] Server running at ${joinURL}`);

    // IPC handlers for admin renderer
    ipcMain.handle('get-server-info', () => ({
        ip: lanIP,
        port: activePort,
        joinURL: joinURL,
    }));

    ipcMain.handle('export-csv', async () => {
        const data = serverObj.session.getSessionData();
        return exportCSV(data, mainWindow);
    });

    ipcMain.handle('export-json', async () => {
        const data = serverObj.session.getSessionData();
        return exportJSON(data, mainWindow);
    });

    ipcMain.handle('generate-qr', async (_, url) => {
        try {
            const dataURL = await QRCode.toDataURL(url, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            });
            return dataURL;
        } catch (err) {
            console.error('[QR] Generation failed:', err);
            return null;
        }
    });

    ipcMain.handle('refresh-ip', () => {
        const newIP = getLanIP();
        const newURL = `http://${newIP}:${activePort}`;
        return { ip: newIP, port: activePort, joinURL: newURL };
    });

    createWindow();
}

app.whenReady().then(bootstrap).catch((err) => {
    console.error('[Zenith Buzzer] Failed to start:', err);
    app.quit();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Cleanup on quit
app.on('before-quit', () => {
    if (serverObj && serverObj.server) {
        serverObj.server.close();
    }
});

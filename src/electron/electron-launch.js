// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    center: true,
    darkTheme: true,
    webContents: {
      openDevTools: true,

    }
  });

  mainWindow.loadFile('index.html')
  mainWindow.setMenuBarVisibility(false);

  // debug

  win.webContents.openDevTools();

}

app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

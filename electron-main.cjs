// Handle uncaught errors first thing before anything else can fail at module load
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const http = require("http");
const net = require("net");

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  dialog.showErrorBox(
    "خطای بحرانی در برنامه",
    "برنامه با یک خطای غیرمنتظره مواجه شد و باید بسته شود:\n\n" + (error.stack || error.message)
  );
  app.quit();
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  dialog.showErrorBox(
    "خطای سیستمی (Promise Rejection)",
    "یک عملیات ناموفق سیستم شناسایی شد:\n\n" + String(reason)
  );
});

let mainWindow = null;
let CURRENT_PORT = 3000;

// Configure production environment and local network binding
process.env.NODE_ENV = "production";
process.env.PORTAL_BIND_ADDRESS = "127.0.0.1";

// Helper to find an available port starting from startPort
function findFreePort(startPort, callback) {
  let port = startPort;
  const server = net.createServer();
  
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      port++;
      server.listen(port, "127.0.0.1");
    } else {
      callback(err);
    }
  });
  
  server.on("listening", () => {
    server.close(() => {
      callback(null, port);
    });
  });
  
  server.listen(port, "127.0.0.1");
}

// Helper to check if server is active yet
function checkServerReady(callback) {
  const req = http.get(`http://127.0.0.1:${CURRENT_PORT}/`, (res) => {
    // If the server responds with a valid HTTP status (even if it is 404, 304, or 200), it's alive!
    if (res.statusCode >= 200 && res.statusCode < 500) {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  req.on("error", () => callback(false));
  req.end();
}

function startBackendServer() {
  try {
    console.log(`Starting backend server inside desktop process on port ${CURRENT_PORT}...`);
    // Simply requiring the compiled server executes startServer() automatically
    require("./dist/server.cjs");
  } catch (err) {
    console.error("Failed to start backend server:", err);
    dialog.showErrorBox(
      "خطای موتور دیتابیس یا سرور",
      "امکان راه‌اندازی سرور داخلی یا لود دیتابیس وجود ندارد. لطفاً مطمئن شوید معماری سیستم یکسان است.\n\nجزئیات خطا:\n" + (err.stack || err.message)
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 850,
    minWidth: 1020,
    minHeight: 700,
    show: false, // Don't show until page is loaded
    autoHideMenuBar: true, // Clean look, holds Alt to show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Log failures to load
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Failed to load URL:", errorCode, errorDescription);
    dialog.showErrorBox(
      "خطا در بالا آمدن رابط کاربری",
      `امکان ارتباط با موتور داخلی برنامه وجود ندارد.\nکد خطا: ${errorCode}\nتوضیحات: ${errorDescription}\nمسیر: ${validatedURL}`
    );
  });

  // Keep polling until local server is accessible
  const interval = setInterval(() => {
    checkServerReady((ready) => {
      if (ready) {
        clearInterval(interval);
        mainWindow.loadURL(`http://127.0.0.1:${CURRENT_PORT}`);
        mainWindow.once("ready-to-show", () => {
          mainWindow.show();
        });
      }
    });
  }, 100);
}

// Safely execute when Electron has initialized fully
app.whenReady().then(() => {
  // It is now perfectly safe to query the AppData path and assign it
  process.env.PORTAL_DATABASE_DIR = app.getPath("userData");
  
  // Dynamically allocate a free port
  findFreePort(3000, (err, freePort) => {
    if (err) {
      console.error("Failed to find a free port:", err);
      freePort = 3000; // Fallback
    }
    
    CURRENT_PORT = freePort;
    process.env.PORT = String(freePort);
    
    // Start the server with the secure, verified free port context
    startBackendServer();
    
    createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // On Windows/Linux, quit app completely when window is closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

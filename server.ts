import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DB_FILE = path.join(process.cwd(), "rose-amour-db.json");

// Helper to load DB
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading JSON database:", e);
    }
  }
  return {};
}

// Helper to save DB
function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving JSON database:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Route: Get state from the server database
  app.get("/api/data", (req, res) => {
    const db = loadDB();
    res.json(db);
  });

  // API Route: Save state to the server database
  app.post("/api/save", (req, res) => {
    try {
      const incoming = req.body;
      const currentDB = loadDB();
      const updatedDB = { ...currentDB, ...incoming };
      saveDB(updatedDB);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Rose Amour Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DB_FILE = path.join(process.cwd(), "rose-amour-db.json");

// Structure par défaut de la base de données en cas d'absence ou fichier vide
const DEFAULT_DB = {
  users: [
    {
      id: "admin_wilfried",
      email: "cybertest611@gmail.com",
      name: "Administrateur Principal",
      role: "admin",
      whatsappNumber: "+237659228516",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      createdAt: "2026-06-13T12:00:00Z",
      city: "Yaoundé",
      gender: "Femelle",
      password: "Wilfried11",
      isVerified: true
    }
  ],
  products: [],
  sales: [],
  comments: [],
  messages: [],
  logs: [],
  whatsAppClicks: [],
  admin_announcement: ""
};

// Helper pour sauvegarder la base de données
function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving JSON database:", e);
  }
}

// Helper de chargement robuste avec auto-génération sécurisée
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8").trim();
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.warn("Database file is empty or invalid JSON. Re-initializing helper defaults.");
  }
  
  // Recrée le fichier automatiquement pour éviter les erreurs futures
  saveDB(DEFAULT_DB);
  return DEFAULT_DB;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Route: Obtenir l'état de la base
  app.get("/api/data", (req, res) => {
    const db = loadDB();
    res.json(db);
  });

  // API Route: Sauvegarder l'état
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

  // Vite Integration (Développement vs Production)
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

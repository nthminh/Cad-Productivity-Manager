import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the persisted Firebase config file (sits next to the server binary)
const FIREBASE_CONFIG_FILE = path.join(__dirname, "firebase-config.json");

// Rate limiter for config endpoints: generous limits since these are called on
// app startup / settings save, not in a tight loop.
const configRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "PM - Productivity Manager API is running" });
  });

  // Return the stored Firebase config so new clients can auto-configure without
  // requiring each user to enter credentials manually.
  // Note: Firebase client-side config values (apiKey, projectId, etc.) are intentionally
  // public — they identify the Firebase project but carry no privileged access.
  // Security is enforced by Firebase Security Rules on the server side.
  app.get("/api/firebase-config", configRateLimit, (req, res) => {
    if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(FIREBASE_CONFIG_FILE, "utf8");
        const config = JSON.parse(raw);
        res.json(config);
        return;
      } catch {
        res.status(500).json({ error: "Failed to read config" });
        return;
      }
    }
    res.status(404).json({ error: "Config not set" });
  });

  // Persist a Firebase config submitted from the Settings page.
  // Only accepts the known Firebase config fields to prevent storing arbitrary data.
  app.post("/api/firebase-config", configRateLimit, (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || !body.apiKey || !body.projectId) {
      res.status(400).json({ error: "Invalid config: apiKey and projectId are required" });
      return;
    }
    // Allowlist only known Firebase config fields
    const config = {
      apiKey: String(body.apiKey),
      authDomain: body.authDomain ? String(body.authDomain) : undefined,
      databaseURL: body.databaseURL ? String(body.databaseURL) : undefined,
      projectId: String(body.projectId),
      storageBucket: body.storageBucket ? String(body.storageBucket) : undefined,
      messagingSenderId: body.messagingSenderId ? String(body.messagingSenderId) : undefined,
      appId: body.appId ? String(body.appId) : undefined,
    };
    try {
      fs.writeFileSync(FIREBASE_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

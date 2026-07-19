import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./src/db/index.js";
import * as schema from "./src/db/schema.js";
import { eq, desc } from "drizzle-orm";
import { PaymentService } from "./src/payment/services/PaymentService.js";
import { WebhookHandler } from "./src/payment/webhooks/WebhookHandler.js";
import { PaymentValidator } from "./src/payment/validators/paymentValidator.js";
import { PaymentFactory } from "./src/payment/services/PaymentFactory.js";
import { PaymentProviderName } from "./src/payment/types/index.js";

dotenv.config();

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Token manquant." });
  }

  jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key_for_rose_amour_2026", (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Token invalide ou expiré." });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès interdit. Rôle administrateur requis." });
  }
  next();
}

interface EnvVarDefinition {
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
}

function validateEnv() {
  const definitions: EnvVarDefinition[] = [
    { name: "PORT", description: "Port d'écoute du serveur (valeur par défaut : 3000)", required: false, sensitive: false },
    { name: "JWT_SECRET", description: "Clé de chiffrement et de signature des tokens JWT", required: true, sensitive: true },
    { name: "SQL_URL", description: "URL de connexion PostgreSQL (ou DATABASE_URL / POSTGRES_URL)", required: true, sensitive: true },
    { name: "CINETPAY_API_KEY", description: "Clé d'API CinetPay (mode réel)", required: false, sensitive: true },
    { name: "CINETPAY_SITE_ID", description: "ID de site CinetPay (mode réel)", required: false, sensitive: false },
    { name: "CINETPAY_SECRET_KEY", description: "Clé secrète CinetPay pour la signature de webhook", required: false, sensitive: true },
    { name: "CINETPAY_NOTIFY_URL", description: "URL de retour webhook de notification CinetPay", required: false, sensitive: false },
    { name: "CINETPAY_RETURN_URL", description: "URL de retour après redirection de paiement CinetPay", required: false, sensitive: false },
  ];

  console.log("\n=======================================================");
  console.log("🌹 SYSTEM AUDIT: ENVIRONMENT VARIABLES CHECK 🌹");
  console.log("=======================================================");

  let missingRequiredCount = 0;

  for (const def of definitions) {
    let value = process.env[def.name];
    
    // Check aliases for SQL_URL
    if (def.name === "SQL_URL" && !value) {
      value = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    }

    if (!value) {
      if (def.required) {
        console.warn(`⚠️  [MANQUANT REQUIS] ${def.name}: ${def.description}`);
        missingRequiredCount++;
      } else {
        console.log(`ℹ️  [OPTIONNEL ABSENT] ${def.name}: ${def.description}`);
      }
    } else {
      const displayVal = def.sensitive ? "[PROTÉGÉ / CONFIGURÉ]" : value;
      console.log(`✅ [CONFIGURÉ] ${def.name}: ${displayVal}`);
    }
  }

  if (missingRequiredCount > 0) {
    console.warn("\n⚠️  Attention: Certaines variables obligatoires sont manquantes ! Les fonctionnalités associées seront dégradées, mais le serveur ne crashera pas pour assurer une haute disponibilité.");
  } else {
    console.log("\n✅ Toutes les variables d'environnement requises sont configurées !");
  }
  console.log("=======================================================\n");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // 1. Configurer Express pour fonctionner derrière le proxy Render / Cloud Run (indispensable pour express-rate-limit)
  app.set("trust proxy", 1);

  // 2. Validate Environment Variables at startup (Never causes crash)
  validateEnv();

  // 3. Test Database Connection (Never causes crash)
  console.log("[Rose Amour] Testing database connection...");
  try {
    const { testDbConnection } = await import("./src/db/index.js");
    const dbStatus = await testDbConnection();
    if (dbStatus.connected) {
      console.log("\n=================================");
      console.log("✅ Database Connected");
      console.log("=================================\n");
    } else {
      console.error("\n=================================");
      console.error("❌ Database Connection Failed");
      console.error("Reason:", dbStatus.error);
      console.error("=================================\n");
    }
  } catch (err: any) {
    console.error("\n=================================");
    console.error("❌ Database Connection Failed (Import Error)");
    console.error("Reason:", err?.message || err);
    console.error("=================================\n");
  }

  // 4. Secure Headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // Maintain flexibility in iframe/Vite previews
    crossOriginEmbedderPolicy: false
  }));

  // 5. Enable CORS with proper configuration
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // 6. Central Rate Limiter (with trust proxy enabled above)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requêtes provenant de cette adresse IP, veuillez réessayer plus tard." }
  });
  app.use("/api/", apiLimiter);

  // 7. JSON & URL-Encoded Payload protection with raw body extraction for webhook signature verification
  app.use(express.json({
    limit: "10mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));
  app.use(express.urlencoded({
    limit: "10mb",
    extended: true,
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));

  // API Route: Get state from the server database
  app.get("/api/data", async (req, res, next) => {
    try {
      const dbUsers = await db.select().from(schema.users);
      const dbProducts = await db.select().from(schema.products);
      const dbSales = await db.select().from(schema.sales);
      const dbComments = await db.select().from(schema.comments);
      const dbMessages = await db.select().from(schema.messages);
      const dbLogs = await db.select().from(schema.connectionLogs);
      const dbClicks = await db.select().from(schema.whatsappClickLogs);
      const announcementSetting = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, "admin_announcement"));

      const mappedUsers = dbUsers.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString()
      }));

      const mappedProducts = dbProducts.map(p => ({
        ...p,
        boostExpiry: p.boostExpiry ? p.boostExpiry.toISOString() : undefined,
        createdAt: p.createdAt.toISOString()
      }));

      const mappedSales = dbSales.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString()
      }));

      const mappedComments = dbComments.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString()
      }));

      const mappedMessages = dbMessages.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString()
      }));

      const mappedLogs = dbLogs.map(l => ({
        ...l,
        loginTime: l.loginTime.toISOString()
      }));

      const mappedClicks = dbClicks.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString()
      }));

      res.json({
        users: mappedUsers,
        products: mappedProducts,
        sales: mappedSales,
        comments: mappedComments,
        messages: mappedMessages,
        logs: mappedLogs,
        whatsAppClicks: mappedClicks,
        admin_announcement: announcementSetting[0]?.value || ""
      });
    } catch (err) {
      next(err);
    }
  });

  // API Route: Save state to the server database (Admin-only, JWT secured)
  app.post("/api/save", authenticateToken, requireAdmin, async (req, res, next) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== "object") {
        return res.status(400).json({ error: "Corps de requête invalide" });
      }

      await db.transaction(async (tx) => {
        if (incoming.users && Array.isArray(incoming.users)) {
          for (const u of incoming.users) {
            let pwd = u.password;
            if (pwd && !pwd.startsWith("$2a$") && !pwd.startsWith("$2b$")) {
              const salt = await bcrypt.genSalt(10);
              pwd = await bcrypt.hash(pwd, salt);
            }
            await tx.insert(schema.users).values({
              id: u.id,
              email: u.email.toLowerCase().trim(),
              name: u.name,
              role: u.role || "user",
              whatsappNumber: u.whatsappNumber,
              avatarUrl: u.avatarUrl,
              city: u.city,
              gender: u.gender,
              password: pwd,
              isVerified: u.isVerified ?? false,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              updatedAt: new Date(),
            }).onConflictDoUpdate({
              target: schema.users.id,
              set: {
                email: u.email.toLowerCase().trim(),
                name: u.name,
                role: u.role || "user",
                whatsappNumber: u.whatsappNumber,
                avatarUrl: u.avatarUrl,
                city: u.city,
                gender: u.gender,
                password: pwd,
                isVerified: u.isVerified ?? false,
                updatedAt: new Date()
              }
            });
          }
        }

        if (incoming.products && Array.isArray(incoming.products)) {
          for (const p of incoming.products) {
            await tx.insert(schema.products).values({
              id: p.id,
              title: p.title,
              description: p.description,
              price: Number(p.price || 0),
              category: p.category,
              sellerId: p.sellerId,
              sellerName: p.sellerName,
              sellerWhatsapp: p.sellerWhatsapp,
              imageUrl: p.imageUrl,
              imageUrl2: p.imageUrl2,
              isBoosted: p.isBoosted ?? false,
              boostExpiry: p.boostExpiry ? new Date(p.boostExpiry) : null,
              status: p.status || "active",
              location: p.location || "Cameroun",
              statusText: p.statusText,
              age: p.age ? Number(p.age) : null,
              verificationCode: p.verificationCode,
              planType: p.planType,
              paymentConfirmed: p.paymentConfirmed ?? false,
              cityGroup: p.cityGroup,
              views: p.views ? Number(p.views) : 0,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              updatedAt: new Date(),
            }).onConflictDoUpdate({
              target: schema.products.id,
              set: {
                title: p.title,
                description: p.description,
                price: Number(p.price || 0),
                category: p.category,
                sellerId: p.sellerId,
                sellerName: p.sellerName,
                sellerWhatsapp: p.sellerWhatsapp,
                imageUrl: p.imageUrl,
                imageUrl2: p.imageUrl2,
                isBoosted: p.isBoosted ?? false,
                boostExpiry: p.boostExpiry ? new Date(p.boostExpiry) : null,
                status: p.status || "active",
                location: p.location || "Cameroun",
                statusText: p.statusText,
                age: p.age ? Number(p.age) : null,
                verificationCode: p.verificationCode,
                planType: p.planType,
                paymentConfirmed: p.paymentConfirmed ?? false,
                cityGroup: p.cityGroup,
                views: p.views ? Number(p.views) : 0,
                updatedAt: new Date()
              }
            });
          }
        }

        if (incoming.admin_announcement !== undefined) {
          await tx.insert(schema.systemSettings).values({
            key: "admin_announcement",
            value: String(incoming.admin_announcement),
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: schema.systemSettings.key,
            set: {
              value: String(incoming.admin_announcement),
              updatedAt: new Date()
            }
          });
        }
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // API Route: Secure Login (Returns JWT)
  app.post("/api/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Identifiants de connexion requis." });
      }

      const emailNormalized = String(email).toLowerCase().trim();
      const usersFound = await db.select().from(schema.users).where(eq(schema.users.email, emailNormalized));
      const found = usersFound[0];

      if (!found) {
        return res.status(401).json({ error: "Identifiants incorrects." });
      }

      const isMatch = await bcrypt.compare(password, found.password || "");
      if (!isMatch) {
        return res.status(401).json({ error: "Identifiants incorrects." });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: found.id, email: found.email, role: found.role },
        process.env.JWT_SECRET || "fallback_secret_key_for_rose_amour_2026",
        { expiresIn: "24h" }
      );

      const { password: _, ...userWithoutPassword } = found;
      console.log(`[Rose Amour Audit] Connexion réussie pour ${emailNormalized} (${found.role})`);

      res.json({
        user: {
          ...userWithoutPassword,
          createdAt: found.createdAt.toISOString()
        },
        token
      });
    } catch (err) {
      next(err);
    }
  });

  // Public Endpoint: Secure Registration
  app.post("/api/public/signup", async (req, res, next) => {
    try {
      const { user } = req.body;
      if (!user || typeof user !== "object") {
        return res.status(400).json({ error: "Données requises manquantes" });
      }

      const { id, email, name, whatsappNumber, city, gender, password } = user;
      if (!id || !email || !name || !whatsappNumber || !city || !gender || !password) {
        return res.status(400).json({ error: "Tous les champs requis ne sont pas remplis." });
      }

      const emailNormalized = String(email).toLowerCase().trim();
      if (!emailNormalized.includes("@") || emailNormalized.length > 100) {
        return res.status(400).json({ error: "Adresse e-mail invalide." });
      }

      const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, emailNormalized));
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: "Cette adresse e-mail est déjà utilisée." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await db.insert(schema.users).values({
        id: String(id),
        email: emailNormalized,
        name: String(name),
        role: "user",
        whatsappNumber: String(whatsappNumber),
        avatarUrl: user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        createdAt: new Date(),
        city: String(city),
        gender: String(gender),
        password: hashedPassword,
        isVerified: false
      });

      console.log(`[Rose Amour Audit] Nouvel utilisateur enregistré : ${emailNormalized}`);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Public Endpoint: Verify Email
  app.post("/api/public/verify-email", async (req, res, next) => {
    try {
      const { userId } = req.body;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "ID d'utilisateur requis." });
      }

      const existingUsers = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      if (existingUsers.length > 0) {
        await db.update(schema.users).set({ isVerified: true }).where(eq(schema.users.id, userId));
        console.log(`[Rose Amour Audit] Compte activé pour l'ID : ${userId}`);
        return res.json({ success: true });
      }
      res.status(404).json({ error: "Utilisateur non trouvé." });
    } catch (err) {
      next(err);
    }
  });

  // Public Endpoint: Add Comment
  app.post("/api/public/comment", async (req, res, next) => {
    try {
      const { comment } = req.body;
      if (!comment || typeof comment !== "object" || !comment.id || !comment.content) {
        return res.status(400).json({ error: "Données de commentaire invalides." });
      }

      await db.insert(schema.comments).values({
        id: comment.id,
        productId: comment.productId,
        authorName: comment.authorName || comment.userName || "Anonyme",
        rating: Number(comment.rating || 5),
        content: comment.content,
        createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date()
      });

      console.log(`[Rose Amour Audit] Nouveau commentaire ajouté par ${comment.authorName || comment.userName || 'Anonyme'}`);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Public Endpoint: Checkout Success
  app.post("/api/public/checkout-success", async (req, res, next) => {
    try {
      const { sale, product } = req.body;
      if (!sale || typeof sale !== "object" || !sale.id) {
        return res.status(400).json({ error: "Données de vente invalides." });
      }

      await db.transaction(async (tx) => {
        await tx.insert(schema.sales).values({
          id: sale.id,
          productId: sale.productId,
          productTitle: sale.productTitle,
          buyerName: sale.buyerName || sale.customerName || "Inconnu",
          buyerEmail: sale.buyerEmail || sale.customerEmail || "inconnu@email.com",
          customerName: sale.customerName,
          customerEmail: sale.customerEmail,
          amount: Number(sale.amount || 0),
          feeType: sale.feeType || "standard_item",
          paymentMethod: sale.paymentMethod || "orange_money",
          provider: sale.provider,
          status: sale.status || "completed",
          createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date()
        });

        if (product && typeof product === "object" && product.id) {
          await tx.insert(schema.products).values({
            id: product.id,
            title: product.title,
            description: product.description,
            price: Number(product.price || 0),
            category: product.category,
            sellerId: product.sellerId,
            sellerName: product.sellerName,
            sellerWhatsapp: product.sellerWhatsapp,
            imageUrl: product.imageUrl,
            imageUrl2: product.imageUrl2,
            isBoosted: product.isBoosted ?? false,
            boostExpiry: product.boostExpiry ? new Date(product.boostExpiry) : null,
            status: product.status || "active",
            location: product.location || "Cameroun",
            statusText: product.statusText,
            age: product.age ? Number(product.age) : null,
            verificationCode: product.verificationCode,
            planType: product.planType,
            paymentConfirmed: product.paymentConfirmed ?? false,
            cityGroup: product.cityGroup,
            views: product.views ? Number(product.views) : 0,
            createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: schema.products.id,
            set: {
              title: product.title,
              description: product.description,
              price: Number(product.price || 0),
              category: product.category,
              sellerId: product.sellerId,
              sellerName: product.sellerName,
              sellerWhatsapp: product.sellerWhatsapp,
              imageUrl: product.imageUrl,
              imageUrl2: product.imageUrl2,
              isBoosted: product.isBoosted ?? false,
              boostExpiry: product.boostExpiry ? new Date(product.boostExpiry) : null,
              status: product.status || "active",
              location: product.location || "Cameroun",
              statusText: product.statusText,
              age: product.age ? Number(product.age) : null,
              verificationCode: product.verificationCode,
              planType: product.planType,
              paymentConfirmed: product.paymentConfirmed ?? false,
              cityGroup: product.cityGroup,
              views: product.views ? Number(product.views) : 0,
              updatedAt: new Date()
            }
          });
          console.log(`[Rose Amour Audit] Nouveau profil ajouté via checkout (ID: ${product.id})`);
        }
      });

      console.log(`[Rose Amour Audit] Vente enregistrée avec succès (Réf: ${sale.id})`);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Public Endpoint: WhatsApp Click
  app.post("/api/public/whatsapp-click", async (req, res, next) => {
    try {
      const { click } = req.body;
      if (!click || typeof click !== "object" || !click.id) {
        return res.status(400).json({ error: "Données de clic invalides." });
      }

      await db.insert(schema.whatsappClickLogs).values({
        id: click.id,
        productId: click.productId,
        productTitle: click.productTitle,
        hostessName: click.hostessName,
        hostessWhatsapp: click.hostessWhatsapp,
        visitorIp: click.visitorIp,
        visitorDevice: click.visitorDevice,
        visitorLang: click.visitorLang,
        visitorUsername: click.visitorUsername,
        message: click.message,
        timestamp: click.timestamp ? new Date(click.timestamp) : new Date()
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Public Endpoint: Add Log
  app.post("/api/public/log", async (req, res, next) => {
    try {
      const { log } = req.body;
      if (!log || typeof log !== "object" || !log.id) {
        return res.status(400).json({ error: "Données de log de connexion invalides." });
      }

      await db.insert(schema.connectionLogs).values({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        loginTime: log.loginTime ? new Date(log.loginTime) : new Date(),
        ipAddress: log.ipAddress,
        device: log.device
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // --- SECURE CINETPAY PAYMENT SIMULATOR GATEWAY ---
  app.get("/payment/cinetpay-sim", async (req, res, next) => {
    try {
      const { reference } = req.query;
      if (!reference) {
        return res.status(400).send("Référence manquante.");
      }

      const [payment] = await db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.reference, reference as string))
        .limit(1);

      if (!payment) {
        return res.status(404).send("Session de paiement introuvable.");
      }

      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>CinetPay - Simulateur de Paiement Sécurisé</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
          </style>
        </head>
        <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
          <div class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <!-- Header -->
            <div class="bg-rose-600 text-white p-6 text-center">
              <h1 class="text-xl font-black tracking-tight">CinetPay Simulator</h1>
              <p class="text-[10px] text-rose-100 mt-1 uppercase tracking-widest font-mono">Administration Rose Amour</p>
            </div>
            
            <!-- Content -->
            <div class="p-6 space-y-6">
              <div class="text-center">
                <span class="text-[10px] text-slate-400 uppercase font-black tracking-widest font-mono">Montant du versement</span>
                <div class="text-3xl font-black text-rose-600 font-mono mt-1">${payment.amount} FCFA</div>
                <div class="text-[11px] text-slate-400 mt-1">Référence : <span class="font-mono font-bold text-slate-600">${payment.reference}</span></div>
              </div>
              
              <div class="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-900 leading-relaxed space-y-1">
                <p class="font-black text-rose-850">💡 Mode Simulation Actif</p>
                <p>Vous êtes sur la passerelle de paiement simulée CinetPay pour valider votre fiche ou activer votre boost VIP.</p>
              </div>
              
              <form id="payForm" class="space-y-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Moyen de paiement simulé</label>
                  <div class="grid grid-cols-3 gap-2">
                    <label class="flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50/10 transition-all border-orange-500 bg-orange-50/25 font-bold">
                      <input type="radio" name="method" value="OM" checked class="sr-only">
                      <span class="text-xs text-orange-600 font-black mb-1">Orange</span>
                      <span class="text-[10px] text-slate-500">OM</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer hover:border-yellow-500 hover:bg-yellow-50/10 transition-all border-slate-200">
                      <input type="radio" name="method" value="MTN" class="sr-only">
                      <span class="text-xs text-yellow-600 font-black mb-1">MTN</span>
                      <span class="text-[10px] text-slate-500">MoMo</span>
                    </label>
                    <label class="flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer hover:border-pink-500 hover:bg-pink-50/10 transition-all border-slate-200">
                      <input type="radio" name="method" value="CARD" class="sr-only">
                      <span class="text-xs text-pink-600 font-black mb-1">Carte</span>
                      <span class="text-[10px] text-slate-500">Visa/Master</span>
                    </label>
                  </div>
                </div>
                
                <button type="submit" id="submitBtn" class="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl transition duration-300 shadow-md uppercase tracking-wider text-xs cursor-pointer">
                  Confirmer le versement simulé
                </button>
              </form>
              
              <div id="successMsg" class="hidden p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <span class="text-2xl">🎉</span>
                <div class="text-sm font-black text-emerald-800">Paiement Simulé avec Succès !</div>
                <p class="text-xs text-slate-500 leading-relaxed">
                  Le webhook de CinetPay a été déclenché et votre profil/VIP boost a été activé en base de données.
                </p>
                <button id="closeBtn" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition">
                  Retourner sur Rose Amour
                </button>
              </div>
            </div>
          </div>
          
          <script>
            const radios = document.querySelectorAll('input[name="method"]');
            radios.forEach(r => {
              r.addEventListener('change', () => {
                radios.forEach(x => {
                  x.parentElement.className = "flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer hover:border-slate-300 transition-all border-slate-200 bg-white";
                });
                if (r.checked) {
                  let colorClass = "border-orange-500 bg-orange-50/20 font-bold";
                  if (r.value === "MTN") colorClass = "border-yellow-500 bg-yellow-50/20 font-bold";
                  if (r.value === "CARD") colorClass = "border-pink-500 bg-pink-50/20 font-bold";
                  r.parentElement.className = "flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer hover:border-slate-400 transition-all " + colorClass;
                }
              });
            });
            
            const form = document.getElementById('payForm');
            const submitBtn = document.getElementById('submitBtn');
            const successMsg = document.getElementById('successMsg');
            
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              submitBtn.disabled = true;
              submitBtn.innerHTML = "Traitement en cours...";
              
              const selectedMethod = document.querySelector('input[name="method"]:checked').value;
              
              try {
                const res = await fetch("/api/v2/payment/webhook/cinetpay", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    transaction_id: "${payment.reference}",
                    status: "ACCEPTED",
                    amount: ${payment.amount},
                    currency: "${payment.currency}",
                    operator_id: "SIM-OP-" + selectedMethod + "-" + Math.floor(100000 + Math.random() * 900000)
                  })
                });
                
                if (res.ok) {
                  form.className = "hidden";
                  successMsg.className = "p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 block";
                } else {
                  alert("Erreur lors de la simulation du paiement.");
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = "Confirmer le versement simulé";
                }
              } catch (err) {
                console.error(err);
                alert("Erreur de connexion.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Confirmer le versement simulé";
              }
            });
            
            document.getElementById('closeBtn').addEventListener('click', () => {
              window.location.href = "/";
            });
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // MODERN MODULAR PAYMENT ENGINE (V2)
  // =========================================================================
  const paymentService = new PaymentService();
  const webhookHandler = new WebhookHandler();

  // Route: Initialize a payment session
  app.post("/api/v2/payment/initialize", async (req, res, next) => {
    try {
      const { provider, ...payload } = req.body;
      if (!provider) {
        return res.status(400).json({ error: "Le paramètre 'provider' est obligatoire." });
      }

      // 1. Syntactic validation of payload parameters
      PaymentValidator.validateInitializationPayload(payload);

      // 2. Resolve IP and optional User Context from token if logged in
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "0.0.0.0";
      let userId: string | undefined;

      // Try reading Authorization token if provided
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key_for_rose_amour_2026") as any;
          userId = decoded?.id;
        } catch {
          // Allow anonymous checkouts but don't crash
        }
      }

      // 3. Initiate payment inside robust transactional engine
      const response = await paymentService.initializePayment(provider as PaymentProviderName, {
        ...payload,
        userId: payload.userId || userId
      }, {
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userId: payload.userId || userId
      });

      return res.json({
        success: true,
        data: response
      });
    } catch (err: any) {
      console.error("[Payment Engine V2] Initialization error:", err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message,
        errorCode: err.errorCode || "PAYMENT_INIT_ERROR",
        details: err.details || undefined
      });
    }
  });

  // Route: Verify an active payment session
  app.post("/api/v2/payment/verify", async (req, res, next) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ error: "Le paramètre 'reference' est obligatoire." });
      }

      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "0.0.0.0";
      const response = await paymentService.verifyPayment(reference, {
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress
      });

      return res.json({
        success: true,
        data: response
      });
    } catch (err: any) {
      console.error("[Payment Engine V2] Verification error:", err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message,
        errorCode: err.errorCode || "PAYMENT_VERIFY_ERROR"
      });
    }
  });

  // Route: Secure refund management (Admin only)
  app.post("/api/v2/payment/refund", authenticateToken, requireAdmin, async (req, res, next) => {
    try {
      const { paymentId, amount, reason } = req.body;
      if (!paymentId || !amount || !reason) {
        return res.status(400).json({ error: "Les champs paymentId, amount et reason sont obligatoires." });
      }

      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "0.0.0.0";
      const response = await paymentService.refundPayment(paymentId, amount, reason, {
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userId: (req as any).user?.id
      });

      return res.json({
        success: true,
        message: "Remboursement traité avec succès.",
        data: response
      });
    } catch (err: any) {
      console.error("[Payment Engine V2] Refund error:", err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message,
        errorCode: err.errorCode || "PAYMENT_REFUND_ERROR"
      });
    }
  });

  // Route: Generic Multi-Provider Webhook ingestion point
  app.post("/api/v2/payment/webhook/:provider", async (req, res, next) => {
    try {
      const { provider } = req.params;
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
      const headers = req.headers as Record<string, string>;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "0.0.0.0";

      const result = await webhookHandler.handleWebhook(
        provider as PaymentProviderName,
        rawPayload,
        headers,
        { ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress }
      );

      return res.json(result);
    } catch (err: any) {
      console.error("[Payment Engine V2] Webhook ingestion error:", err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message,
        errorCode: err.errorCode || "WEBHOOK_INGEST_ERROR"
      });
    }
  });

  // Route: Fetch billing invoices (PDF Metadata API)
  app.get("/api/v2/payment/invoice/:invoiceId", authenticateToken, async (req, res, next) => {
    try {
      const { invoiceId } = req.params;
      const data = await paymentService.getInvoiceDetails(invoiceId);

      // Check access ownership (Admin or own invoice)
      if ((req as any).user.role !== "admin" && data.invoice.userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Accès refusé. Vous n'êtes pas propriétaire de cette facture." });
      }

      return res.json({
        success: true,
        data
      });
    } catch (err: any) {
      console.error("[Payment Engine V2] Invoice metadata retrieval error:", err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Route: Retrieve user-owned subscriptions
  app.get("/api/v2/payment/subscriptions/:userId", authenticateToken, async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      // Access check
      if ((req as any).user.role !== "admin" && userId !== (req as any).user.id) {
        return res.status(403).json({ error: "Accès refusé. Vous ne pouvez visualiser que vos propres abonnements." });
      }

      const subscriptions = await paymentService.getUserSubscriptions(userId);
      return res.json({
        success: true,
        data: subscriptions
      });
    } catch (err: any) {
      console.error("[Payment Engine V2] Subscriptions fetch error:", err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Route: Gateways and Providers Health Monitoring Pings
  app.get("/api/v2/payment/health", async (req, res, next) => {
    try {
      const providers = PaymentFactory.getRegisteredProviders();
      const checks = await Promise.all(
        providers.map(async (name) => {
          try {
            const provider = PaymentFactory.getProvider(name);
            return await provider.healthCheck();
          } catch (err: any) {
            return {
              provider: name,
              status: "DOWN" as const,
              latencyMs: 0,
              message: err.message
            };
          }
        })
      );

      const isOverallUp = checks.some(c => c.status === "UP");

      return res.json({
        success: true,
        status: isOverallUp ? "OPERATIONAL" : "DEGRADED",
        timestamp: new Date().toISOString(),
        providers: checks
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Health Check Endpoint (For Render, Cloud Run, and architectural monitoring)
  app.get("/health", async (req, res) => {
    let dbStatus = "failed";
    let dbDetail = "";
    try {
      const { testDbConnection } = await import("./src/db/index.js");
      const status = await testDbConnection();
      dbStatus = status.connected ? "connected" : "failed";
      dbDetail = status.error || "operational";
    } catch (err: any) {
      dbStatus = "error";
      dbDetail = err?.message || String(err);
    }

    let socketStatus = "offline";
    try {
      const { Gateway } = await import("./src/realtime/socket/Gateway.js");
      const gatewayInstance = Gateway.getInstance();
      if (gatewayInstance && gatewayInstance["io"]) {
        socketStatus = "online";
      }
    } catch (err: any) {
      socketStatus = "error";
    }

    return res.json({
      status: "ok",
      database: dbStatus,
      database_details: dbDetail,
      socket: socketStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
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

  // Centralized Error Handler (Never crashes the server, logs Drizzle database errors cleanly)
  app.use((err: any, req: any, res: any, next: any) => {
    const errMsg = err.message || "";
    const isDbError = 
      errMsg.includes("connect") || 
      errMsg.includes("select") || 
      errMsg.includes("relation") || 
      err.code?.startsWith("08") || 
      err.code?.startsWith("3D") || 
      err.code === "ECONNREFUSED";

    if (isDbError) {
      console.error("\n❌ [Rose Amour Database Error] A Drizzle database operation failed!");
      console.error("Reason:", errMsg);
      console.error("Troubleshooting: Ensure PostgreSQL is active, SQL_URL/DATABASE_URL is set correctly, and the tables are pushed with 'npx drizzle-kit push'.\n");
      return res.status(503).json({
        error: "Le service de base de données est indisponible ou en cours de maintenance.",
        details: errMsg
      });
    }

    console.error("[Rose Amour Server Error]", err.stack || err);
    res.status(500).json({ error: "Une erreur interne du serveur est survenue." });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Rose Amour Server] Running on http://0.0.0.0:${PORT}`);
  });

  // Initialisation du Gateway temps réel
  const { Gateway } = await import("./src/realtime/socket/Gateway.js");
  Gateway.getInstance().initialize(server);
}

startServer();

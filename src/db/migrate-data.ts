import fs from "fs";
import path from "path";
import { db } from "./index.js";
import * as schema from "./schema.js";

const DB_FILE = path.join(process.cwd(), "rose-amour-db.json");

async function runMigration() {
  console.log("[Rose Amour Migration] Starting data migration from JSON to PostgreSQL...");

  if (!fs.existsSync(DB_FILE)) {
    console.error(`[Rose Amour Migration Error] Source JSON DB file not found at: ${DB_FILE}`);
    return;
  }

  const raw = fs.readFileSync(DB_FILE, "utf-8").trim();
  if (!raw) {
    console.warn("[Rose Amour Migration] Source JSON DB file is empty. Nothing to migrate.");
    return;
  }

  const data = JSON.parse(raw);
  console.log("[Rose Amour Migration] Successfully read and parsed rose-amour-db.json");

  // 1. Migrate Users
  if (data.users && Array.isArray(data.users)) {
    console.log(`[Rose Amour Migration] Migrating ${data.users.length} users...`);
    for (const u of data.users) {
      try {
        await db.insert(schema.users).values({
          id: u.id,
          email: u.email.toLowerCase().trim(),
          name: u.name,
          role: u.role || "user",
          whatsappNumber: u.whatsappNumber,
          avatarUrl: u.avatarUrl,
          city: u.city,
          gender: u.gender,
          password: u.password,
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
            password: u.password,
            isVerified: u.isVerified ?? false,
            updatedAt: new Date()
          }
        });
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating user ${u.email}:`, err.message);
      }
    }
    console.log("[Rose Amour Migration] Users migration completed.");
  }

  // 2. Extract and Migrate Categories
  const uniqueCategories = new Set<string>();
  if (data.products && Array.isArray(data.products)) {
    for (const p of data.products) {
      if (p.category) {
        uniqueCategories.add(p.category);
      }
    }
  }
  // Add some defaults if empty
  if (uniqueCategories.size === 0) {
    uniqueCategories.add("Modèles VIP");
    uniqueCategories.add("Escortes");
    uniqueCategories.add("Massages");
    uniqueCategories.add("Agences");
  }

  console.log(`[Rose Amour Migration] Migrating ${uniqueCategories.size} unique product categories...`);
  for (const catName of uniqueCategories) {
    try {
      await db.insert(schema.categories).values({
        name: catName,
        description: `Catégorie pour ${catName}`
      }).onConflictDoNothing();
    } catch (err: any) {
      console.error(`[Rose Amour Migration Error] Failed migrating category ${catName}:`, err.message);
    }
  }
  console.log("[Rose Amour Migration] Categories migration completed.");

  // 3. Migrate Products
  if (data.products && Array.isArray(data.products)) {
    console.log(`[Rose Amour Migration] Migrating ${data.products.length} products...`);
    for (const p of data.products) {
      try {
        await db.insert(schema.products).values({
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
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating product ${p.title} (ID: ${p.id}):`, err.message);
      }
    }
    console.log("[Rose Amour Migration] Products migration completed.");
  }

  // 4. Migrate Comments
  if (data.comments && Array.isArray(data.comments)) {
    console.log(`[Rose Amour Migration] Migrating ${data.comments.length} comments...`);
    for (const c of data.comments) {
      try {
        await db.insert(schema.comments).values({
          id: c.id,
          productId: c.productId,
          authorName: c.authorName || c.userName || "Anonyme",
          rating: Number(c.rating || 5),
          content: c.content,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        }).onConflictDoNothing();
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating comment ${c.id}:`, err.message);
      }
    }
    console.log("[Rose Amour Migration] Comments migration completed.");
  }

  // 5. Migrate Sales
  if (data.sales && Array.isArray(data.sales)) {
    console.log(`[Rose Amour Migration] Migrating ${data.sales.length} sales records...`);
    for (const s of data.sales) {
      try {
        await db.insert(schema.sales).values({
          id: s.id,
          productId: s.productId,
          productTitle: s.productTitle,
          buyerName: s.buyerName || s.customerName || "Inconnu",
          buyerEmail: s.buyerEmail || s.customerEmail || "inconnu@email.com",
          customerName: s.customerName,
          customerEmail: s.customerEmail,
          amount: Number(s.amount || 0),
          feeType: s.feeType || "standard_item",
          paymentMethod: s.paymentMethod || "orange_money",
          provider: s.provider,
          status: s.status || "completed",
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        }).onConflictDoNothing();
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating sale ${s.id}:`, err.message);
      }
    }
    console.log("[Rose Amour Migration] Sales migration completed.");
  }

  // 6. Migrate Messages
  if (data.messages && Array.isArray(data.messages)) {
    console.log(`[Rose Amour Migration] Migrating ${data.messages.length} messages...`);
    for (const m of data.messages) {
      try {
        await db.insert(schema.messages).values({
          id: m.id,
          recipientId: m.recipientId,
          senderId: m.senderId || null,
          senderName: m.senderName || "Admin",
          content: m.content || m.body || "",
          isRead: m.isRead ?? false,
          type: m.type || "general",
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        }).onConflictDoNothing();
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating message ${m.id}:`, err.message);
      }
    }
    console.log("[Rose Amour Migration] Messages migration completed.");
  }

  // 7. Migrate Logs
  if (data.logs && Array.isArray(data.logs)) {
    console.log(`[Rose Amour Migration] Migrating ${data.logs.length} connection/server logs...`);
    for (const l of data.logs) {
      try {
        if (l.userId && l.userName && l.userEmail && l.ipAddress && l.device) {
          // It's a Connection Log
          await db.insert(schema.connectionLogs).values({
            id: l.id,
            userId: l.userId,
            userName: l.userName,
            userEmail: l.userEmail,
            loginTime: l.loginTime ? new Date(l.loginTime) : new Date(),
            ipAddress: l.ipAddress,
            device: l.device,
          }).onConflictDoNothing();
        } else {
          // General Server Log - we can ignore or log it
        }
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating log ${l.id}:`, err.message);
      }
    }
    console.log("[Rose Amour Migration] Connection logs migration completed.");
  }

  // 8. Migrate WhatsApp Clicks
  if (data.whatsAppClicks && Array.isArray(data.whatsAppClicks)) {
    console.log(`[Rose Amour Migration] Migrating ${data.whatsAppClicks.length} WhatsApp clicks...`);
    for (const click of data.whatsAppClicks) {
      try {
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
          timestamp: click.timestamp ? new Date(click.timestamp) : new Date(),
        }).onConflictDoNothing();
      } catch (err: any) {
        console.error(`[Rose Amour Migration Error] Failed migrating WhatsApp click ${click.id}:`, err.message);
      }
    }
    console.log("[Rose Amour Migration] WhatsApp clicks migration completed.");
  }

  // 9. Migrate Admin Announcement
  if (data.admin_announcement !== undefined) {
    console.log("[Rose Amour Migration] Migrating admin announcement setting...");
    try {
      await db.insert(schema.systemSettings).values({
        key: "admin_announcement",
        value: String(data.admin_announcement),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
          value: String(data.admin_announcement),
          updatedAt: new Date()
        }
      });
    } catch (err: any) {
      console.error("[Rose Amour Migration Error] Failed migrating admin announcement:", err.message);
    }
    console.log("[Rose Amour Migration] Admin announcement migrated.");
  }

  console.log("[Rose Amour Migration] ALL DATA HAS BEEN SUCCESSFULLY MIGRATED TO POSTGRESQL! 🎉");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("[Rose Amour Migration FAILED]", err);
  process.exit(1);
});

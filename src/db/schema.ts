import { pgTable, serial, text, integer, boolean, timestamp, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Roles Table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'admin', 'user', 'moderator'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 2. Permissions Table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'manage_users', 'manage_products', etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Many-to-Many join table: roles_permissions
export const rolesPermissions = pgTable("roles_permissions", {
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] })
}));

// 3. Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Using string ID (e.g. 'admin_wilfried' or Firebase UID)
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // 'user' or 'admin'
  whatsappNumber: text("whatsapp_number").notNull(),
  avatarUrl: text("avatar_url"),
  city: text("city"),
  gender: text("gender"), // femme, homme, transsexuel, etc.
  password: text("password"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 4. Categories Table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'VIP', 'Escort', 'Massage', etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 5. Products Table
export const products = pgTable("products", {
  id: text("id").primaryKey(), // string ID 'prod_...'
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  category: text("category").notNull(), // text category name for compatibility
  sellerId: text("seller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sellerName: text("seller_name").notNull(),
  sellerWhatsapp: text("seller_whatsapp").notNull(),
  imageUrl: text("image_url").notNull(),
  imageUrl2: text("image_url2"),
  isBoosted: boolean("is_boosted").default(false).notNull(),
  boostExpiry: timestamp("boost_expiry"),
  status: text("status").notNull().default("active"), // 'active', 'sold', 'disputed'
  location: text("location").notNull(),
  statusText: text("status_text"),
  age: integer("age"),
  verificationCode: text("verification_code"),
  planType: text("plan_type"), // 'premium', 'vedette', 'visites'
  paymentConfirmed: boolean("payment_confirmed").default(false).notNull(),
  cityGroup: text("city_group"),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 6. Favorites Table
export const favorites = pgTable("favorites", {
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.productId] })
}));

// 7. Conversations Table (For Messagerie)
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(), // conv_...
  userOneId: text("user_one_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  userTwoId: text("user_two_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 8. Messages Table
export const messages = pgTable("messages", {
  id: text("id").primaryKey(), // msg_...
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  senderId: text("sender_id").references(() => users.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  type: text("type").notNull().default("general"), // 'encouragement', 'congratulations', 'general'
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 9. Comments / Reviews Table
export const comments = pgTable("comments", {
  id: text("id").primaryKey(), // comment_...
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(), // 1-5
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 10. Sales / Transactions Table
export const sales = pgTable("sales", {
  id: text("id").primaryKey(), // sale_...
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  productTitle: text("product_title").notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  amount: integer("amount").notNull(),
  feeType: text("fee_type").notNull(), // 'standard_item', 'list_fee', 'boost_fee'
  paymentMethod: text("payment_method").notNull(), // 'card', 'orange_money', 'mtn_money'
  provider: text("provider"),
  status: text("status").notNull().default("completed"), // 'completed', 'refunded'
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 11. Payments Table (for tracking and future providers like CinetPay/Orange/MTN API attempts)
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  externalReference: text("external_reference"),
  productId: text("product_id"),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  currency: text("currency").default("XAF").notNull(),
  phoneNumber: text("phone_number"),
  paymentMethod: text("payment_method").notNull(), // 'orange_money', 'mtn_money', 'card'
  status: text("status").notNull().default("PENDING"), // 'PENDING', 'SUCCESSFUL', 'FAILED'
  planType: text("plan_type"),
  provider: text("provider").default("mock").notNull(),
  idempotencyKey: text("idempotency_key"),
  rawResponse: text("raw_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  idempotencyIdx: index("payments_idempotency_idx").on(table.idempotencyKey),
  userIdIdx: index("payments_user_id_idx").on(table.userId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

// 12. Disputes / Reports Table
export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(), // disp_...
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  productTitle: text("product_title").notNull(),
  sellerId: text("seller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sellerName: text("seller_name").notNull(),
  sellerWhatsapp: text("seller_whatsapp"),
  complaintUser: text("complaint_user").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'resolved', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 13. Notifications Table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 14. Sessions Table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  device: text("device"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 15. Connection Logs Table
export const connectionLogs = pgTable("connection_logs", {
  id: text("id").primaryKey(), // log_...
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  loginTime: timestamp("login_time").defaultNow().notNull(),
  ipAddress: text("ip_address").notNull(),
  device: text("device").notNull()
});

// 16. WhatsApp Click Logs Table
export const whatsappClickLogs = pgTable("whatsapp_click_logs", {
  id: text("id").primaryKey(), // click_...
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  productTitle: text("product_title").notNull(),
  hostessName: text("hostess_name").notNull(),
  hostessWhatsapp: text("hostess_whatsapp").notNull(),
  visitorIp: text("visitor_ip").notNull(),
  visitorDevice: text("visitor_device").notNull(),
  visitorLang: text("visitor_lang").notNull(),
  visitorUsername: text("visitor_username"),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// 17. System Settings / Admin Announcements Table
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  favorites: many(favorites),
  notifications: many(notifications),
  sessions: many(sessions),
  disputes: many(disputes),
  connectionLogs: many(connectionLogs)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id]
  }),
  comments: many(comments),
  sales: many(sales),
  disputes: many(disputes),
  favorites: many(favorites),
  whatsappClickLogs: many(whatsappClickLogs)
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  product: one(products, {
    fields: [comments.productId],
    references: [products.id]
  })
}));

export const salesRelations = relations(sales, ({ one }) => ({
  product: one(products, {
    fields: [sales.productId],
    references: [products.id]
  })
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  product: one(products, {
    fields: [disputes.productId],
    references: [products.id]
  }),
  seller: one(users, {
    fields: [disputes.sellerId],
    references: [users.id]
  })
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [favorites.productId],
    references: [products.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const connectionLogsRelations = relations(connectionLogs, ({ one }) => ({
  user: one(users, {
    fields: [connectionLogs.userId],
    references: [users.id]
  })
}));

export const whatsappClickLogsRelations = relations(whatsappClickLogs, ({ one }) => ({
  product: one(products, {
    fields: [whatsappClickLogs.productId],
    references: [products.id]
  })
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  userOne: one(users, {
    fields: [conversations.userOneId],
    references: [users.id]
  }),
  userTwo: one(users, {
    fields: [conversations.userTwoId],
    references: [users.id]
  }),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id]
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id]
  })
}));

// 18. Payment Providers Table
export const paymentProviders = pgTable("payment_providers", {
  id: text("id").primaryKey(), // 'mock', 'cinetpay', 'flutterwave', 'stripe', 'paypal'
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 19. Payment Methods Table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // 'orange_money', 'mtn_money', 'card', 'paypal', etc.
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  providerIdIdx: index("payment_methods_provider_id_idx").on(table.providerId),
}));

// 20. Refunds Table
export const refunds = pgTable("refunds", {
  id: text("id").primaryKey(), // ref_...
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"), // 'PENDING', 'COMPLETED', 'FAILED'
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  paymentIdIdx: index("refunds_payment_id_idx").on(table.paymentId),
}));

// 21. Payment Logs Table (Audit Trail)
export const paymentLogs = pgTable("payment_logs", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  ipAddress: text("ip_address"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("XAF"),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  responseTimeMs: integer("response_time_ms"),
  returnCode: text("return_code"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  paymentIdIdx: index("payment_logs_payment_id_idx").on(table.paymentId),
  userIdIdx: index("payment_logs_user_id_idx").on(table.userId),
}));

// 22. Webhooks Table (Idempotency and auditing)
export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey(), // wh_...
  provider: text("provider").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  payload: text("payload").notNull(),
  signature: text("signature"),
  status: text("status").notNull().default("PENDING"), // 'PENDING', 'PROCESSED', 'FAILED'
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 23. Subscriptions Table
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // sub_...
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planType: text("plan_type").notNull(), // 'premium', 'boost', 'monthly', 'annual', 'sponsored'
  status: text("status").notNull().default("ACTIVE"), // 'ACTIVE', 'EXPIRED', 'CANCELLED'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
  statusIdx: index("subscriptions_status_idx").on(table.status),
}));

// 24. Invoices Table (PDF generation preparation)
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(), // inv_...
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("XAF"),
  status: text("status").notNull().default("UNPAID"), // 'PAID', 'UNPAID'
  metadata: text("metadata"), // JSON configuration/billing info
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("invoices_user_id_idx").on(table.userId),
  paymentIdIdx: index("invoices_payment_id_idx").on(table.paymentId),
}));

// 25. Conversation Members Table (for group chat support)
export const conversationMembers = pgTable("conversation_members", {
  id: serial("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("member").notNull(), // 'admin', 'member'
  joinedAt: timestamp("joined_at").defaultNow().notNull()
}, (table) => ({
  convIdIdx: index("conv_members_conv_id_idx").on(table.conversationId),
  userIdIdx: index("conv_members_user_id_idx").on(table.userId),
}));

// 26. Message Status Table (for delivery receipts)
export const messageStatus = pgTable("message_status", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull(), // 'sent', 'delivered', 'read'
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  msgIdIdx: index("msg_status_msg_id_idx").on(table.messageId),
  userIdIdx: index("msg_status_user_id_idx").on(table.userId),
}));

// 27. Message Attachments Table (for multimedia messages)
export const messageAttachments = pgTable("message_attachments", {
  id: text("id").primaryKey(), // att_...
  messageId: text("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // 'image', 'audio', 'video', 'document'
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  msgIdIdx: index("msg_attachments_msg_id_idx").on(table.messageId),
}));

// 28. Presence Table
export const presence = pgTable("presence", {
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).primaryKey(),
  status: text("status").default("offline").notNull(), // 'online', 'offline', 'away', 'busy', 'invisible'
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  customMessage: text("custom_message"),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 29. Notification Queue Table (Multi-channel delivery queue)
export const notificationQueue = pgTable("notification_queue", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  channel: text("channel").notNull(), // 'push', 'email', 'sms', 'whatsapp', 'internal'
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed'
  attempts: integer("attempts").default(0).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("notif_queue_user_id_idx").on(table.userId),
  statusIdx: index("notif_queue_status_idx").on(table.status),
}));

// 30. Devices Table (for Push Notification targeting)
export const devices = pgTable("devices", {
  id: text("id").primaryKey(), // dev_...
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fcmToken: text("fcm_token").notNull(),
  deviceType: text("device_type").notNull(), // 'ios', 'android', 'web'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("devices_user_id_idx").on(table.userId),
}));

// 31. Blocked Users Table (Anti-spam/security blocking)
export const blockedUsers = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  blockerId: text("blocker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  blockedId: text("blocked_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  blockerIdx: index("blocked_users_blocker_id_idx").on(table.blockerId),
  blockedIdx: index("blocked_users_blocked_id_idx").on(table.blockedId),
}));

// 32. Friends / Contacts Table
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  friendId: text("friend_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("friends_user_id_idx").on(table.userId),
  friendIdIdx: index("friends_friend_id_idx").on(table.friendId),
}));

// 33. Calls Table (RTC Signal Tracking)
export const calls = pgTable("calls", {
  id: text("id").primaryKey(), // call_...
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  callerId: text("caller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").default("audio").notNull(), // 'audio', 'video'
  status: text("status").default("ringing").notNull(), // 'ringing', 'ongoing', 'ended', 'missed', 'rejected'
  channelName: text("channel_name").notNull(), // WebRTC/Agora unique identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at")
}, (table) => ({
  convIdIdx: index("calls_conv_id_idx").on(table.conversationId),
  callerIdIdx: index("calls_caller_id_idx").on(table.callerId),
}));

// 34. Call Logs Table
export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  callId: text("call_id").references(() => calls.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  status: text("status").notNull(), // 'missed', 'connected', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  callIdIdx: index("call_logs_call_id_idx").on(table.callId),
  userIdIdx: index("call_logs_user_id_idx").on(table.userId),
}));


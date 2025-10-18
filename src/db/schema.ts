import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  balance: real('balance').notNull().default(0),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Crypto addresses table
export const cryptoAddresses = sqliteTable('crypto_addresses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cryptocurrency: text('cryptocurrency').notNull(),
  address: text('address').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  cryptocurrency: text('cryptocurrency').notNull(),
  amount: real('amount').notNull(),
  transactionHash: text('transaction_hash').notNull().unique(),
  status: text('status').notNull().default('pending'),
  verifiedAt: text('verified_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Services table
export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  discountPercentage: integer('discount_percentage').notNull(),
  priceLimit: real('price_limit'),
  imageUrl: text('image_url'),
  orderLink: text('order_link'),
  browseLink: text('browse_link'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Products table
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  imageUrl: text('image_url'),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Orders table
export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  orderType: text('order_type').notNull(),
  serviceId: integer('service_id').references(() => services.id),
  totalAmount: real('total_amount').notNull(),
  paymentStatus: text('payment_status').notNull().default('pending'),
  deliveryStatus: text('delivery_status').notNull().default('pending'),
  transactionHash: text('transaction_hash'),
  cryptocurrencyUsed: text('cryptocurrency_used'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Order items table
export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  priceAtPurchase: real('price_at_purchase').notNull(),
  createdAt: text('created_at').notNull(),
});

// Reviews table
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  userId: integer('user_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  photoUrl: text('photo_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Loyalty rewards table
export const loyaltyRewards = sqliteTable('loyalty_rewards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  pointsEarned: integer('points_earned').notNull().default(0),
  pointsSpent: integer('points_spent').notNull().default(0),
  description: text('description').notNull(),
  orderId: integer('order_id').references(() => orders.id),
  createdAt: text('created_at').notNull(),
});

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Add new tables at the end
export const productVariants = sqliteTable('product_variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  denomination: real('denomination').notNull(),
  customerPrice: real('customer_price').notNull(),
  adminCost: real('admin_cost').notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const discountCodes = sqliteTable('discount_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  discountPercentage: real('discount_percentage').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  productId: integer('product_id').references(() => products.id),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
});

export const orderAttachments = sqliteTable('order_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  uploadedByAdminId: integer('uploaded_by_admin_id'),
  createdAt: text('created_at').notNull(),
});

export const profitMargins = sqliteTable('profit_margins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  adminDiscountPercentage: real('admin_discount_percentage').notNull().default(36),
  customerDiscountPercentage: real('customer_discount_percentage').notNull().default(30),
  updatedAt: text('updated_at').notNull(),
});
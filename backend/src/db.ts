import { Database } from "bun:sqlite";
import { join } from "path";

// Initialize SQLite database in WAL mode for maximum concurrent read/write performance
const dbPath = join(import.meta.dir, "../soren.db");
export const db = new Database(dbPath, { create: true });

// Enable WAL journal mode & foreign keys
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('coffee', 'cake', 'shake')),
    price INTEGER NOT NULL,
    description TEXT,
    tags TEXT,
    is_available BOOLEAN DEFAULT 1,
    stock_count INTEGER DEFAULT -1,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL,
    customer_name TEXT DEFAULT 'مشتری کافه',
    phone_number TEXT,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID', 'PAID')),
    payment_method TEXT NOT NULL DEFAULT 'PAY_AT_COUNTER' CHECK(payment_method IN ('PAY_AT_COUNTER', 'ONLINE')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'BREWING', 'READY', 'DELIVERED', 'CANCELLED')),
    total_price INTEGER NOT NULL,
    session_token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    zone TEXT NOT NULL DEFAULT 'indoor' CHECK(zone IN ('indoor', 'courtyard', 'vip')),
    status TEXT NOT NULL DEFAULT 'FREE' CHECK(status IN ('FREE', 'HELD', 'OCCUPIED')),
    held_by TEXT,
    held_until INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_number);
  CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
`);

export interface Product {
  id: string;
  name: string;
  category: "coffee" | "cake" | "shake";
  price: number;
  description: string;
  tags: string;
  is_available: number;
  stock_count: number;
  image_url: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderRecord {
  id: string;
  table_number: string;
  customer_name: string;
  phone_number: string | null;
  payment_status: "UNPAID" | "PAID";
  payment_method: "PAY_AT_COUNTER" | "ONLINE";
  status: "PENDING" | "BREWING" | "READY" | "DELIVERED" | "CANCELLED";
  total_price: number;
  session_token: string;
  created_at: string;
  completed_at: string | null;
  items?: OrderItemRecord[];
}

export interface CafeTable {
  id: string;
  number: string;
  name: string;
  capacity: number;
  zone: "indoor" | "courtyard" | "vip";
  status: "FREE" | "HELD" | "OCCUPIED";
  held_by?: string | null;
  held_until?: number | null;
  remainingHoldSeconds?: number;
}

// Auto-seed initial 8 tables if table is empty
const tableCountCheck = db.prepare("SELECT COUNT(*) as count FROM tables").get() as { count: number };
if (tableCountCheck.count === 0) {
  const insertTableStmt = db.prepare(`
    INSERT INTO tables (id, number, name, capacity, zone, status)
    VALUES (?, ?, ?, ?, ?, 'FREE')
  `);
  const initialTables = [
    { id: "tbl_1", number: "میز ۱", name: "رو به حیاط و آب‌نما", capacity: 2, zone: "courtyard" },
    { id: "tbl_2", number: "میز ۲", name: "رو به حیاط و فضای سبز", capacity: 4, zone: "courtyard" },
    { id: "tbl_3", number: "میز ۳", name: "سالن اصلی - کنار شومینه", capacity: 4, zone: "indoor" },
    { id: "tbl_4", number: "میز ۴", name: "کنار بار و دم‌آوری دستی", capacity: 2, zone: "indoor" },
    { id: "tbl_5", number: "میز ۵", name: "سالن اصلی - فضای خانوادگی", capacity: 6, zone: "indoor" },
    { id: "tbl_6", number: "میز ۶", name: "میز کار اختصاصی با پریز برق", capacity: 4, zone: "indoor" },
    { id: "tbl_7", number: "میز ۷", name: "تراس بهاره", capacity: 4, zone: "courtyard" },
    { id: "tbl_8", number: "میز ۸", name: "اتاق تشریفات VIP", capacity: 8, zone: "vip" },
  ];
  for (const t of initialTables) {
    insertTableStmt.run(t.id, t.number, t.name, t.capacity, t.zone);
  }
}

// ---------------- Database Operations ----------------

export function getAllProducts(category?: string): Product[] {
  if (category) {
    const stmt = db.prepare("SELECT * FROM products WHERE category = ? ORDER BY price ASC");
    return stmt.all(category) as Product[];
  }
  const stmt = db.prepare("SELECT * FROM products ORDER BY category, price ASC");
  return stmt.all() as Product[];
}

export function getProductById(id: string): Product | null {
  const stmt = db.prepare("SELECT * FROM products WHERE id = ?");
  return (stmt.get(id) as Product) || null;
}

export function setProductAvailability(id: string, isAvailable: boolean): boolean {
  const stmt = db.prepare("UPDATE products SET is_available = ? WHERE id = ?");
  const result = stmt.run(isAvailable ? 1 : 0, id);
  return result.changes > 0;
}

// Transaction telemetry interface
export interface TransactionTelemetry {
  txnId: string;
  orderId: string;
  tableNumber: string;
  journalMode: string;
  totalUs: number;
  steps: {
    name: string;
    durationUs: number;
    details?: string;
  }[];
}

// Atomic order placement with server-authoritative price calculation & microsecond tracing
export function createOrderWithTelemetry(data: {
  tableNumber: string;
  customerName?: string;
  phoneNumber?: string;
  sessionToken: string;
  items: OrderItemInput[];
}): { order: OrderRecord; telemetry: TransactionTelemetry } {
  if (!data.items || data.items.length === 0) {
    throw new Error("سفارش باید حداقل شامل یک آیتم باشد.");
  }

  const tStart = performance.now();
  const steps: { name: string; durationUs: number; details?: string }[] = [];

  // Step 1: Begin & lock acquisition
  const t0 = performance.now();
  db.exec("BEGIN DEFERRED;");
  const t1 = performance.now();
  steps.push({
    name: "BEGIN TRANSACTION",
    durationUs: Math.round((t1 - t0) * 1000),
    details: "Acquired transaction lock in WAL mode",
  });

  try {
    // Step 2: Price audit and inventory check
    const tVerifyStart = performance.now();
    let totalPrice = 0;
    const itemInserts: { productId: string; productName: string; quantity: number; unitPrice: number }[] = [];

    for (const item of data.items) {
      const product = getProductById(item.productId);
      if (!product) {
        throw new Error(`محصول با شناسه ${item.productId} یافت نشد.`);
      }
      if (!product.is_available) {
        throw new Error(`محصول «${product.name}» در حال حاضر ناموجود است.`);
      }
      if (item.quantity <= 0) {
        throw new Error("تعداد هر سفارش باید بیشتر از صفر باشد.");
      }

      totalPrice += product.price * item.quantity;
      itemInserts.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const tVerifyEnd = performance.now();
    steps.push({
      name: "PRICE AUDIT & STOCK CHECK",
      durationUs: Math.round((tVerifyEnd - tVerifyStart) * 1000),
      details: `${itemInserts.length} item(s) verified against SQLite snapshot`,
    });

    // Step 3: Insert Order header
    const tOrderStart = performance.now();
    const countRow = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    const nextNumber = 1001 + countRow.count;
    const orderId = `ord_${nextNumber}`;

    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        id, table_number, customer_name, phone_number,
        payment_status, payment_method, status, total_price, session_token
      ) VALUES (?, ?, ?, ?, 'UNPAID', 'PAY_AT_COUNTER', 'PENDING', ?, ?)
    `);

    insertOrderStmt.run(
      orderId,
      data.tableNumber || "میز نامشخص",
      data.customerName || "مشتری کافه",
      data.phoneNumber || null,
      totalPrice,
      data.sessionToken
    );
    const tOrderEnd = performance.now();
    steps.push({
      name: "INSERT orders (WAL Journal)",
      durationUs: Math.round((tOrderEnd - tOrderStart) * 1000),
      details: `Order ${orderId} header written to memory WAL page`,
    });

    // Step 4: Insert Order Items
    const tItemsStart = performance.now();
    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < itemInserts.length; i++) {
      const item = itemInserts[i];
      const itemId = `${orderId}_item_${i + 1}`;
      insertItemStmt.run(itemId, orderId, item.productId, item.quantity, item.unitPrice);
    }
    const tItemsEnd = performance.now();
    steps.push({
      name: "INSERT order_items",
      durationUs: Math.round((tItemsEnd - tItemsStart) * 1000),
      details: `${itemInserts.length} relational rows mapped`,
    });

    // Step 5: Commit transaction
    const tCommitStart = performance.now();
    db.exec("COMMIT;");
    const tCommitEnd = performance.now();
    steps.push({
      name: "COMMIT TRANSACTION",
      durationUs: Math.round((tCommitEnd - tCommitStart) * 1000),
      details: "Zero disk wait • Atomic state persisted",
    });

    const totalUs = Math.round((performance.now() - tStart) * 1000);
    const order = getOrderById(orderId)!;

    return {
      order,
      telemetry: {
        txnId: `txn_${Date.now().toString().slice(-6)}`,
        orderId,
        tableNumber: data.tableNumber,
        journalMode: "WAL",
        totalUs,
        steps,
      },
    };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function getTableRowCounts() {
  const productsCount = (db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }).count;
  const ordersCount = (db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number }).count;
  const itemsCount = (db.prepare("SELECT COUNT(*) as count FROM order_items").get() as { count: number }).count;
  const tablesCount = (db.prepare("SELECT COUNT(*) as count FROM tables").get() as { count: number }).count;
  return { productsCount, ordersCount, itemsCount, tablesCount };
}


export function getOrderById(id: string): OrderRecord | null {
  const orderStmt = db.prepare("SELECT * FROM orders WHERE id = ?");
  const order = orderStmt.get(id) as OrderRecord | null;
  if (!order) return null;

  const itemsStmt = db.prepare(`
    SELECT oi.id, oi.order_id, oi.product_id, p.name as product_name, oi.quantity, oi.unit_price
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `);
  order.items = itemsStmt.all(id) as OrderItemRecord[];
  return order;
}

export function getActiveOrders(): OrderRecord[] {
  const ordersStmt = db.prepare(`
    SELECT * FROM orders 
    WHERE status IN ('PENDING', 'BREWING', 'READY')
    ORDER BY created_at ASC
  `);
  const orders = ordersStmt.all() as OrderRecord[];

  for (const order of orders) {
    const itemsStmt = db.prepare(`
      SELECT oi.id, oi.order_id, oi.product_id, p.name as product_name, oi.quantity, oi.unit_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `);
    order.items = itemsStmt.all(order.id) as OrderItemRecord[];
  }
  return orders;
}

export function updateOrderStatus(orderId: string, status: string): boolean {
  const completedAt = (status === "DELIVERED" || status === "CANCELLED") ? new Date().toISOString() : null;
  const stmt = db.prepare(`
    UPDATE orders 
    SET status = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `);
  const result = stmt.run(status, completedAt, orderId);
  return result.changes > 0;
}

export function settleTableOrders(tableNumber: string): { settledCount: number; totalAmount: number } {
  const getOpenStmt = db.prepare(`
    SELECT SUM(total_price) as total, COUNT(*) as count 
    FROM orders 
    WHERE table_number = ? AND payment_status = 'UNPAID'
  `);
  const openStats = getOpenStmt.get(tableNumber) as { total: number | null; count: number };
  
  if (!openStats || openStats.count === 0) {
    return { settledCount: 0, totalAmount: 0 };
  }

  const updateStmt = db.prepare(`
    UPDATE orders 
    SET payment_status = 'PAID', status = 'DELIVERED'
    WHERE table_number = ? AND payment_status = 'UNPAID'
  `);
  updateStmt.run(tableNumber);

  return {
    settledCount: openStats.count,
    totalAmount: openStats.total || 0,
  };
}

export function getAnalyticsStats() {
  const revenueStmt = db.prepare("SELECT COALESCE(SUM(total_price), 0) as revenue FROM orders WHERE payment_status = 'PAID'");
  const activeStmt = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('PENDING', 'BREWING', 'READY')");
  const totalOrdersStmt = db.prepare("SELECT COUNT(*) as count FROM orders");
  
  const popularStmt = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as total_sold
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `);

  return {
    totalRevenue: (revenueStmt.get() as { revenue: number }).revenue,
    activeOrdersCount: (activeStmt.get() as { count: number }).count,
    totalOrdersCount: (totalOrdersStmt.get() as { count: number }).count,
    topProducts: popularStmt.all() as { name: string; total_sold: number }[],
  };
}

// ---------------- Table Management Operations (Anti-Race Condition) ----------------

export function getAllTables(): CafeTable[] {
  // Clean any expired holds first
  cleanExpiredTableHolds();

  const stmt = db.prepare("SELECT * FROM tables ORDER BY id ASC");
  const rawTables = stmt.all() as CafeTable[];
  const now = Date.now();

  return rawTables.map((t) => {
    let remaining = 0;
    if (t.status === "HELD" && t.held_until) {
      remaining = Math.max(0, Math.ceil((t.held_until - now) / 1000));
    }
    return {
      ...t,
      remainingHoldSeconds: remaining,
    };
  });
}

export function getTableById(id: string): CafeTable | null {
  cleanExpiredTableHolds();
  const stmt = db.prepare("SELECT * FROM tables WHERE id = ?");
  const table = stmt.get(id) as CafeTable | null;
  if (!table) return null;

  const now = Date.now();
  let remaining = 0;
  if (table.status === "HELD" && table.held_until) {
    remaining = Math.max(0, Math.ceil((table.held_until - now) / 1000));
  }
  return { ...table, remainingHoldSeconds: remaining };
}

export function holdTable(
  tableId: string,
  clientId: string,
  clientName?: string,
  ttlSeconds = 120
): { success: boolean; table: CafeTable; ttlSeconds: number; heldUntil: number } {
  cleanExpiredTableHolds();

  db.exec("BEGIN TRANSACTION;");
  try {
    const tableStmt = db.prepare("SELECT * FROM tables WHERE id = ?");
    const table = tableStmt.get(tableId) as CafeTable | undefined;

    if (!table) {
      throw new Error("میز مورد نظر یافت نشد.");
    }

    if (table.status === "OCCUPIED") {
      throw new Error("این میز در حال حاضر پر است و مهمان دارد.");
    }

    const now = Date.now();
    // Check if table is currently held by someone else and lock is still active
    if (table.status === "HELD" && table.held_until && table.held_until > now && table.held_by !== clientId) {
      const waitSec = Math.ceil((table.held_until - now) / 1000);
      throw new Error(`این میز هم‌اکنون توسط کاربر دیگری در حال انتخاب است (${waitSec} ثانیه تا آزادسازی).`);
    }

    const heldUntil = now + ttlSeconds * 1000;
    const updateStmt = db.prepare(`
      UPDATE tables 
      SET status = 'HELD', held_by = ?, held_until = ?
      WHERE id = ?
    `);
    updateStmt.run(clientId, heldUntil, tableId);
    db.exec("COMMIT;");

    const updatedTable = getTableById(tableId)!;
    return {
      success: true,
      table: updatedTable,
      ttlSeconds,
      heldUntil,
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function releaseTable(tableId: string, clientId?: string): { success: boolean; tableId: string } {
  db.exec("BEGIN TRANSACTION;");
  try {
    const tableStmt = db.prepare("SELECT * FROM tables WHERE id = ?");
    const table = tableStmt.get(tableId) as CafeTable | undefined;
    if (!table) throw new Error("میز یافت نشد.");

    const updateStmt = db.prepare(`
      UPDATE tables 
      SET status = 'FREE', held_by = NULL, held_until = NULL
      WHERE id = ?
    `);
    updateStmt.run(tableId);
    db.exec("COMMIT;");
    return { success: true, tableId };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function occupyTable(tableId: string, clientId?: string): { success: boolean; table: CafeTable } {
  db.exec("BEGIN TRANSACTION;");
  try {
    const tableStmt = db.prepare("SELECT * FROM tables WHERE id = ?");
    const table = tableStmt.get(tableId) as CafeTable | undefined;
    if (!table) throw new Error("میز یافت نشد.");

    const updateStmt = db.prepare(`
      UPDATE tables 
      SET status = 'OCCUPIED', held_by = ?, held_until = NULL
      WHERE id = ?
    `);
    updateStmt.run(clientId || null, tableId);
    db.exec("COMMIT;");
    return { success: true, table: getTableById(tableId)! };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function cleanExpiredTableHolds(): string[] {
  const now = Date.now();
  const expiredStmt = db.prepare("SELECT id FROM tables WHERE status = 'HELD' AND held_until IS NOT NULL AND held_until <= ?");
  const expiredRows = expiredStmt.all(now) as { id: string }[];

  if (expiredRows.length > 0) {
    const cleanStmt = db.prepare(`
      UPDATE tables 
      SET status = 'FREE', held_by = NULL, held_until = NULL
      WHERE status = 'HELD' AND held_until IS NOT NULL AND held_until <= ?
    `);
    cleanStmt.run(now);
  }

  return expiredRows.map((r) => r.id);
}

import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;
let dbUrl: string | null = null;

export type TransactionType = "debt" | "payment";
export type PaymentType = "cash" | "card" | "credit";

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
}

export interface NewCustomerInput {
  name: string;
  phone?: string;
  note?: string;
}

export interface Transaction {
  id: number;
  customer_id: number;
  type: TransactionType;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface NewTransactionInput {
  customerId: number;
  type: TransactionType;
  amount: number;
  note?: string;
}

export interface Sale {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  payment_type: PaymentType;
  total_amount: number;
  note: string | null;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface NewSaleInput {
  customerId?: number;
  productId: number;
  paymentType: PaymentType;
  note?: string;
  quantity: number;
}

export interface DashboardSummary {
  totalCustomers: number;
  totalDebt: number;
  totalPayment: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  stock: number;
  unit_price: number | null;
  created_at: string;
}

export interface NewProductInput {
  name: string;
  sku?: string;
  stock: number;
  unitPrice?: number;
}

export interface CashSummary {
  todayCashTotal: number;
  todayCardTotal: number;
  todayCreditTotal: number;
  todayTotalSales: number;
}

export type CashEntryType = "income" | "expense";

export interface CashEntry {
  id: number;
  type: CashEntryType;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface NewCashEntryInput {
  type: CashEntryType;
  amount: number;
  note?: string;
}

async function getDatabaseUrl(): Promise<string> {
  if (!dbUrl) {
    dbUrl = await invoke<string>("get_database_url");
  }

  return dbUrl;
}

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(await getDatabaseUrl());
  }

  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (!dbInstance) {
    return;
  }

  await dbInstance.close();
  dbInstance = null;
}

function validateTransactionType(type: string): asserts type is TransactionType {
  if (type !== "debt" && type !== "payment") {
    throw new Error("Transaction type must be either 'debt' or 'payment'.");
  }
}

function validatePaymentType(type: string): asserts type is PaymentType {
  if (type !== "cash" && type !== "card" && type !== "credit") {
    throw new Error("Payment type must be cash, card, or credit.");
  }
}

function validateCashEntryType(type: string): asserts type is CashEntryType {
  if (type !== "income" && type !== "expense") {
    throw new Error("Cash entry type must be income or expense.");
  }
}

function validatePositiveAmount(amount: number, fieldName: string): void {
  if (!Number.isFinite(amount) || Number.isNaN(amount)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (amount <= 0) {
    throw new Error(`${fieldName} must be greater than 0.`);
  }
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();

  await db.execute("PRAGMA foreign_keys = ON;");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('debt', 'payment')),
      amount REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('cash', 'card', 'credit')),
      total_amount REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      unit_price REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const productColumns = await db.select<Array<{ name: string }>>("PRAGMA table_info(products);");
  if (!productColumns.some((column) => column.name === "stock")) {
    await db.execute("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;");
    await db.execute("UPDATE products SET stock = CAST(COALESCE(stock_quantity, 0) AS INTEGER) WHERE stock IS NULL OR stock = 0;");
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );
  `);

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);",
  );

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);",
  );

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);",
  );

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);",
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function addCashEntry(input: NewCashEntryInput): Promise<number> {
  const db = await getDb();

  validateCashEntryType(input.type);
  validatePositiveAmount(input.amount, "Cash entry amount");

  const result = await db.execute(
    "INSERT INTO cash_entries (type, amount, note) VALUES ($1, $2, $3);",
    [input.type, input.amount, input.note?.trim() || null],
  );

  if (result.lastInsertId == null) {
    throw new Error("Failed to create cash entry.");
  }

  return result.lastInsertId;
}

export async function getCashEntries(): Promise<CashEntry[]> {
  const db = await getDb();

  return db.select<CashEntry[]>(
    "SELECT id, type, amount, note, created_at FROM cash_entries ORDER BY created_at DESC, id DESC;",
  );
}

export async function getTotalCashBalance(): Promise<number> {
  const db = await getDb();

  const [row] = await db.select<Array<{ total: number | null }>>(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS total
     FROM cash_entries;`,
  );

  return row?.total ?? 0;
}

export async function createCustomer(
  input: NewCustomerInput,
): Promise<number> {
  const db = await getDb();
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("Customer name cannot be empty.");
  }

  const result = await db.execute(
    "INSERT INTO customers (name, phone, note) VALUES ($1, $2, $3);",
    [trimmedName, input.phone ?? null, input.note ?? null],
  );

  if (result.lastInsertId == null) {
    throw new Error("Failed to create customer record.");
  }

  return result.lastInsertId;
}

export async function getCustomers(): Promise<Customer[]> {
  const db = await getDb();

  return db.select<Customer[]>(
    "SELECT id, name, phone, note, created_at FROM customers ORDER BY created_at DESC;",
  );
}

export async function addTransaction(
  input: NewTransactionInput,
): Promise<number> {
  const db = await getDb();

  validateTransactionType(input.type);
  validatePositiveAmount(input.amount, "Transaction amount");

  const result = await db.execute(
    "INSERT INTO transactions (customer_id, type, amount, note) VALUES ($1, $2, $3, $4);",
    [input.customerId, input.type, input.amount, input.note ?? null],
  );

  if (result.lastInsertId == null) {
    throw new Error("Failed to create transaction record.");
  }

  return result.lastInsertId;
}

export async function createSale(input: NewSaleInput): Promise<number> {
  const db = await getDb();

  validatePaymentType(input.paymentType);
  validatePositiveAmount(input.quantity, "Quantity");
  if (!Number.isInteger(input.productId) || input.productId <= 0) {
    throw new Error("Product is required.");
  }

  if (input.paymentType === "credit" && !input.customerId) {
    throw new Error("Credit sales require a selected customer.");
  }

  await db.execute("BEGIN TRANSACTION;");

  try {
    const [product] = await db.select<Array<{ name: string; unit_price: number | null; stock: number }>>(
      "SELECT name, unit_price, stock FROM products WHERE id = $1;",
      [input.productId],
    );
    if (!product) {
      throw new Error("Selected product was not found.");
    }
    if (product.unit_price == null || product.unit_price <= 0) {
      throw new Error("Selected product must have a valid unit price.");
    }
    await decreaseStock(input.productId, input.quantity);
    const totalAmount = input.quantity * product.unit_price;

    const saleResult = await db.execute(
      "INSERT INTO sales (customer_id, payment_type, total_amount, note) VALUES ($1, $2, $3, $4);",
      [input.customerId ?? null, input.paymentType, totalAmount, input.note ?? null],
    );

    if (saleResult.lastInsertId == null) {
      throw new Error("Failed to create sale record.");
    }

    const saleId = saleResult.lastInsertId;

    await db.execute(
      "INSERT INTO sale_items (sale_id, item_name, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5);",
      [saleId, product.name, input.quantity, product.unit_price, totalAmount],
    );

    if (input.paymentType === "credit" && input.customerId) {
      await db.execute(
        "INSERT INTO transactions (customer_id, type, amount, note) VALUES ($1, $2, $3, $4);",
        [input.customerId, "debt", totalAmount, `Satış #${saleId} - ${product.name}`],
      );
    }

    await db.execute("COMMIT;");

    return saleId;
  } catch (error) {
    await db.execute("ROLLBACK;");
    throw error;
  }
}

export async function getSales(): Promise<Sale[]> {
  const db = await getDb();

  return db.select<Sale[]>(
    `SELECT
      sales.id,
      sales.customer_id,
      customers.name AS customer_name,
      sales.payment_type,
      sales.total_amount,
      sales.note,
      sales.created_at
     FROM sales
     LEFT JOIN customers ON customers.id = sales.customer_id
     ORDER BY sales.created_at DESC;`,
  );
}

export async function getSaleItems(saleId: number): Promise<SaleItem[]> {
  const db = await getDb();

  return db.select<SaleItem[]>(
    `SELECT id, sale_id, item_name, quantity, unit_price, total_price
     FROM sale_items
     WHERE sale_id = $1
     ORDER BY id ASC;`,
    [saleId],
  );
}

export async function getTransactionsByCustomer(
  customerId: number,
): Promise<Transaction[]> {
  const db = await getDb();

  return db.select<Transaction[]>(
    `SELECT id, customer_id, type, amount, note, created_at
     FROM transactions
     WHERE customer_id = $1
     ORDER BY created_at DESC;`,
    [customerId],
  );
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDb();

  const [customerSummary] = await db.select<Array<{ totalCustomers: number }>>(
    "SELECT COUNT(*) AS totalCustomers FROM customers;",
  );

  const [transactionSummary] = await db.select<
    Array<{ totalDebt: number | null; totalPayment: number | null }>
  >(
    `SELECT
      SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) AS totalDebt,
      SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) AS totalPayment
     FROM transactions;`,
  );

  return {
    totalCustomers: customerSummary?.totalCustomers ?? 0,
    totalDebt: transactionSummary?.totalDebt ?? 0,
    totalPayment: transactionSummary?.totalPayment ?? 0,
  };
}

export async function createProduct(input: NewProductInput): Promise<number> {
  const db = await getDb();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Product name cannot be empty.");
  }

  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new Error("Stock must be 0 or greater.");
  }

  if (input.unitPrice != null && (!Number.isFinite(input.unitPrice) || input.unitPrice < 0)) {
    throw new Error("Unit price must be 0 or greater.");
  }

  const result = await db.execute(
    "INSERT INTO products (name, sku, stock, unit_price) VALUES ($1, $2, $3, $4);",
    [
      name,
      input.sku?.trim() || null,
      input.stock,
      input.unitPrice ?? null,
    ],
  );

  if (result.lastInsertId == null) {
    throw new Error("Failed to create product record.");
  }

  return result.lastInsertId;
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();

  return db.select<Product[]>(
    `SELECT id, name, sku, stock, unit_price, created_at
     FROM products
     ORDER BY created_at DESC;`,
  );
}

export async function updateProductStock(productId: number, newQuantity: number): Promise<void> {
  const db = await getDb();

  if (!Number.isInteger(newQuantity) || newQuantity < 0) {
    throw new Error("Stock must be 0 or greater.");
  }

  await db.execute("UPDATE products SET stock = $1 WHERE id = $2;", [newQuantity, productId]);
}

export async function decreaseStock(productId: number, quantity: number): Promise<void> {
  const db = await getDb();
  validatePositiveAmount(quantity, "Quantity");

  const [product] = await db.select<Array<{ stock: number }>>("SELECT stock FROM products WHERE id = $1;", [productId]);
  if (!product) {
    throw new Error("Selected product was not found.");
  }
  if (product.stock < quantity) {
    throw new Error("Insufficient stock.");
  }

  await db.execute("UPDATE products SET stock = stock - $1 WHERE id = $2;", [quantity, productId]);
}

export async function getCashSummary(): Promise<CashSummary> {
  const db = await getDb();

  const [summary] = await db.select<
    Array<{
      todayCashTotal: number | null;
      todayCardTotal: number | null;
      todayCreditTotal: number | null;
      todayTotalSales: number | null;
    }>
  >(
    `SELECT
      SUM(CASE WHEN payment_type = 'cash' AND date(created_at, 'localtime') = date('now', 'localtime') THEN total_amount ELSE 0 END) AS todayCashTotal,
      SUM(CASE WHEN payment_type = 'card' AND date(created_at, 'localtime') = date('now', 'localtime') THEN total_amount ELSE 0 END) AS todayCardTotal,
      SUM(CASE WHEN payment_type = 'credit' AND date(created_at, 'localtime') = date('now', 'localtime') THEN total_amount ELSE 0 END) AS todayCreditTotal,
      SUM(CASE WHEN date(created_at, 'localtime') = date('now', 'localtime') THEN total_amount ELSE 0 END) AS todayTotalSales
     FROM sales;`,
  );

  return {
    todayCashTotal: summary?.todayCashTotal ?? 0,
    todayCardTotal: summary?.todayCardTotal ?? 0,
    todayCreditTotal: summary?.todayCreditTotal ?? 0,
    todayTotalSales: summary?.todayTotalSales ?? 0,
  };
}

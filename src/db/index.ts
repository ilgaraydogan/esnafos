import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;

export type TransactionType = "debt" | "payment";

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

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:esnafos.db");
  }

  return dbInstance;
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

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);",
  );
}

export async function createCustomer(
  input: NewCustomerInput,
): Promise<number> {
  const db = await getDb();

  const result = await db.execute(
    "INSERT INTO customers (name, phone, note) VALUES ($1, $2, $3);",
    [input.name, input.phone ?? null, input.note ?? null],
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

  const result = await db.execute(
    "INSERT INTO transactions (customer_id, type, amount, note) VALUES ($1, $2, $3, $4);",
    [input.customerId, input.type, input.amount, input.note ?? null],
  );

  if (result.lastInsertId == null) {
    throw new Error("Failed to create transaction record.");
  }

  return result.lastInsertId;
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

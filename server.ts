import express from "express";
import path from "path";
import Database from "better-sqlite3";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Set up JSON body parser with generous limit for bulk excel imports
app.use(express.json({ limit: "15mb" }));

import fs from "fs";

// Initialize SQLite database path from config or defaults
const dbConfigPath = path.join(process.cwd(), "db_config.json");
let dbPath = path.join(process.cwd(), "inventory.db");

if (fs.existsSync(dbConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(dbConfigPath, "utf-8"));
    if (config.db_path) {
      dbPath = path.isAbsolute(config.db_path) ? config.db_path : path.join(process.cwd(), config.db_path);
    }
  } catch (err) {
    console.error("Error reading db_config.json, using default path:", err);
  }
}

// Ensure database parent directory exists
try {
  const parentDir = path.dirname(dbPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
} catch (err) {
  console.error("Error creating database path directory:", err);
}

let db = new Database(dbPath);

function initDbTablesAndMigrations(databaseInstance: typeof db) {
  // Enable Foreign Key constraints for cascades
  databaseInstance.pragma("foreign_keys = ON");

  // Create Tables if not exist
  databaseInstance.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      category TEXT DEFAULT 'عمومی',
      min_stock REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_headers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('incoming', 'outgoing')) NOT NULL,
      date TEXT NOT NULL,
      person_id INTEGER NOT NULL,
      description TEXT,
      FOREIGN KEY(person_id) REFERENCES persons(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS document_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      FOREIGN KEY(document_id) REFERENCES document_headers(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      activity_field TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contractor_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      gross_amount REAL NOT NULL,
      retention_bond REAL NOT NULL,
      insurance REAL NOT NULL,
      net_amount REAL NOT NULL,
      FOREIGN KEY(contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contractor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      FOREIGN KEY(contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS machinery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_name TEXT NOT NULL,
      machine_type TEXT NOT NULL,
      license_plate TEXT NOT NULL,
      contract_type TEXT NOT NULL,
      base_rent REAL NOT NULL,
      machine_category TEXT DEFAULT 'سنگین'
    );

    CREATE TABLE IF NOT EXISTS machine_performances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      month_name TEXT NOT NULL,
      month_index INTEGER NOT NULL,
      performance_value REAL NOT NULL,
      total_calculated_amount REAL NOT NULL,
      rate_used REAL,
      FOREIGN KEY(machine_id) REFERENCES machinery(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS machine_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      FOREIGN KEY(machine_id) REFERENCES machinery(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default settings
  const insertSetting = databaseInstance.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  insertSetting.run("doc_prefix", "");
  insertSetting.run("doc_start_no", "1");
  insertSetting.run("product_prefix", "PR-");
  insertSetting.run("enterprise_name", "دفتر فنی الوان");
  insertSetting.run("logo_text", "الوان");
  insertSetting.run("project_name", "پروژه مسکن ملی پرند");

  // Safe migrations to add columns if database already exists without them
  try { databaseInstance.exec("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'عمومی'"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE products ADD COLUMN min_stock REAL DEFAULT 0"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN machine_category TEXT DEFAULT 'سنگین'"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machine_performances ADD COLUMN rate_used REAL"); } catch (e) {}

  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN retention_rate REAL DEFAULT 10"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN insurance_rate REAL DEFAULT 5"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN is_tax_and_insurance_exempt INTEGER DEFAULT 0"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN has_tax_val INTEGER DEFAULT 0"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN contract_no TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN appendix_no TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN contract_start TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN contract_end TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractors ADD COLUMN initial_amount REAL"); } catch (e) {}

  try { databaseInstance.exec("ALTER TABLE contractor_invoices ADD COLUMN is_final INTEGER DEFAULT 0"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractor_invoices ADD COLUMN retention_rate_used REAL DEFAULT 10"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractor_invoices ADD COLUMN insurance_rate_used REAL DEFAULT 5"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE contractor_invoices ADD COLUMN tax_value_used REAL DEFAULT 0"); } catch (e) {}

  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN contract_no TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN appendix_no TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN contract_start TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN contract_end TEXT"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN leap_year_adjusted INTEGER DEFAULT 0"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN appendix_rent REAL DEFAULT NULL"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machinery ADD COLUMN appendix_start_month INTEGER DEFAULT NULL"); } catch (e) {}
  try { databaseInstance.exec("ALTER TABLE machine_performances ADD COLUMN year INTEGER DEFAULT 1405"); } catch (e) {}
  try { databaseInstance.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('logo_img', '')").run(); } catch (e) {}

  // Seed initial data if tables are empty
  const productCount = databaseInstance.prepare("SELECT count(*) as count FROM products").get() as { count: number };
  if (productCount.count === 0) {
    // Insert initial products
    const insertProduct = databaseInstance.prepare("INSERT INTO products (code, name, unit, category, min_stock) VALUES (?, ?, ?, ?, ?)");
    insertProduct.run("PR-101", "کابل برق ۳ در ۲.۵ افشان البرز", "متر", "تجهیزات برقی", 200);
    insertProduct.run("PR-102", "کلید مینیاتوری تک فاز ۱۶ آمپر هیوندای", "عدد", "تجهیزات برقی", 10);
    insertProduct.run("PR-103", "لوله گالوانیزه ۲ اینچ فوق سنگین ساوه", "شاخه", "لوله و اتصالات", 15);
    insertProduct.run("PR-104", "الکترود جوشکاری ۳ میلی‌متر میکا", "کیلوگرم", "ابزار مصرفی", 20);
    insertProduct.run("PR-105", "پمپ آب دو اسب بشقابی پنتاکس", "دستگاه", "ماشین‌آلات", 2);

    // Insert initial persons
    const insertPerson = databaseInstance.prepare("INSERT INTO persons (name, role) VALUES (?, ?)");
    insertPerson.run("شرکت رویان کابل البرز", "تأمین‌کننده");
    insertPerson.run("مهندس رضایی - سرپرست کارگاه", "تحویل‌گیرنده");
    insertPerson.run("کالای برق شریعتی", "تأمین‌کننده");
    insertPerson.run("واحد نگهداری و تعمیرات سوله ۴", "بخش مصرف‌کننده");

    // Get generated IDs
    const rPerson = databaseInstance.prepare("SELECT id FROM persons WHERE name = ?").get("شرکت رویان کابل البرز") as { id: number };
    const rReceiver = databaseInstance.prepare("SELECT id FROM persons WHERE name = ?").get("مهندس رضایی - سرپرست کارگاه") as { id: number };

    const rP1 = databaseInstance.prepare("SELECT id FROM products WHERE code = ?").get("PR-101") as { id: number };
    const rP2 = databaseInstance.prepare("SELECT id FROM products WHERE code = ?").get("PR-102") as { id: number };
    const rP3 = databaseInstance.prepare("SELECT id FROM products WHERE code = ?").get("PR-103") as { id: number };

    // Insert initial Document Header (Incoming)
    const insertHeader = databaseInstance.prepare("INSERT INTO document_headers (type, date, person_id, description) VALUES (?, ?, ?, ?)");
    const header1Result = insertHeader.run("incoming", "1405/03/01", rPerson.id, "خرید مستقیم کالا بابت تجهيز اولیه کارگاه");
    const doc1Id = header1Result.lastInsertRowid;

    // Insert rows for Doc 1
    const insertRow = databaseInstance.prepare("INSERT INTO document_rows (document_id, product_id, quantity) VALUES (?, ?, ?)");
    insertRow.run(doc1Id, rP1.id, 500); // 500 meters
    insertRow.run(doc1Id, rP2.id, 80);  // 80 pieces
    insertRow.run(doc1Id, rP3.id, 30);  // 30 shafts

    // Insert initial Document Header (Outgoing)
    const header2Result = insertHeader.run("outgoing", "1405/03/05", rReceiver.id, "تحویل اقلام سیم‌کشی سیستم روشنایی سوله شماره ۲");
    const doc2Id = header2Result.lastInsertRowid;

    // Insert rows for Doc 2
    insertRow.run(doc2Id, rP1.id, 120); // 120 meters used
    insertRow.run(doc2Id, rP2.id, 15);  // 15 pieces used
  }

  // Seed contractors, machinery, and notifications if they are empty
  const contractorCount = databaseInstance.prepare("SELECT count(*) as count FROM contractors").get() as { count: number };
  if (contractorCount.count === 0) {
    const insertCont = databaseInstance.prepare("INSERT INTO contractors (name, activity_field) VALUES (?, ?)");
    const c1 = insertCont.run("آرماتوربندی برادران مرادی", "اسکلت بتنی و فونداسیون").lastInsertRowid;
    const c2 = insertCont.run("تأسیسات الکتریکی پارس نو", "سیم‌کشی و روشنایی صنعتی").lastInsertRowid;

    const insertContInv = databaseInstance.prepare(`
      INSERT INTO contractor_invoices (contractor_id, invoice_number, gross_amount, retention_bond, insurance, net_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertContInv.run(c1, "ص-مرادی-۰۱", 450000000, 45000000, 22500000, 382500000);
    insertContInv.run(c1, "ص-مرادی-۰۲", 600000000, 60000000, 30000000, 510000000);
    insertContInv.run(c2, "ص-پارس-۱۰۱", 300000000, 30000000, 15000000, 255000000);

    const insertContPay = databaseInstance.prepare(`
      INSERT INTO contractor_payments (contractor_id, payment_date, amount, description)
      VALUES (?, ?, ?, ?)
    `);
    insertContPay.run(c1, "1405/03/02", 200000000, "پیش‌پرداخت اول قالب‌بندی اسکلت");
    insertContPay.run(c1, "1405/03/10", 350000000, "مساعده بابت تسویه آرماتور بتنی فاز ۱");
    insertContPay.run(c2, "1405/03/06", 150000000, "پیش‌پرداخت خرید کابل و کلید مینیاتوری");
  }

  const machineryCount = databaseInstance.prepare("SELECT count(*) as count FROM machinery").get() as { count: number };
  if (machineryCount.count === 0) {
    const insertMach = databaseInstance.prepare("INSERT INTO machinery (owner_name, machine_type, license_plate, contract_type, base_rent) VALUES (?, ?, ?, ?, ?)");
    const m1 = insertMach.run("مهندس جمشیدی", "گریدر کاترپیلار ۱۴۰H", "۴۵ د ۸۷۶ ایران ۲۳", "hourly", 4500000).lastInsertRowid;
    const m2 = insertMach.run("حاج ابراهیمی", "بولدوزر کوماتسو D155", "۱۲ ع ۵۴۳ ایران ۹۲", "daily", 180000000).lastInsertRowid;

    const insertMachPerf = databaseInstance.prepare(`
      INSERT INTO machine_performances (machine_id, month_name, month_index, performance_value, total_calculated_amount)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertMachPerf.run(m1, "فروردین", 1, 120, 120 * 4500000);
    insertMachPerf.run(m1, "اردیبهشت", 2, 160, 160 * 4500000);
    insertMachPerf.run(m2, "فروردین", 1, 20, Math.round(20 * (180000000 / 31)));
    insertMachPerf.run(m2, "اردیبهشت", 2, 25, Math.round(25 * (180000000 / 31)));

    const insertMachPay = databaseInstance.prepare(`
      INSERT INTO machine_payments (machine_id, payment_date, amount, description)
      VALUES (?, ?, ?, ?)
    `);
    insertMachPay.run(m1, "1405/03/01", 300000000, "واریز نقدی بابت کارکرد سنگین فروردین ماه");
    insertMachPay.run(m2, "1405/03/05", 100000000, "پیش‌پرداخت اول اجاره ماهانه فروردین");
  }

  const notificationsCount = databaseInstance.prepare("SELECT count(*) as count FROM notifications").get() as { count: number };
  if (notificationsCount.count === 0) {
    const insertNotif = databaseInstance.prepare("INSERT INTO notifications (title, message, type, is_read, date) VALUES (?, ?, ?, ?, ?)");
    insertNotif.run("سررسید چک آرماتوربندی", "موعد پاس شدن چک تضمین آرماتور فاز ۱ به مبلغ ۲۵۰ میلیون ریال", "reminder", 0, "1405/03/15");
    insertNotif.run("کسورات صورت‌وضعیت نهایی", "کسورات قانونی صورت‌وضعیت جدید برادران مرادی با موفقیت محاسبه گردید.", "invoice", 0, "1405/03/02");
  }
}

// Initial initialization
initDbTablesAndMigrations(db);

// Endpoints for configurable DB Path
app.get("/api/db-path", (req, res) => {
  try {
    res.json({ db_path: dbPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db-path", (req, res) => {
  try {
    const { new_path } = req.body;
    if (!new_path || typeof new_path !== "string") {
      return res.status(400).json({ error: "مسیر وارد شده نامعتبر است." });
    }

    const resolvedPath = path.isAbsolute(new_path) ? new_path : path.join(process.cwd(), new_path);

    // Create container dir if not exists
    const containerDir = path.dirname(resolvedPath);
    if (!fs.existsSync(containerDir)) {
      fs.mkdirSync(containerDir, { recursive: true });
    }

    // Try closing existing connection safely
    try {
      db.close();
    } catch (err) {
      console.warn("Could not close previous database:", err);
    }

    // Open new database connection
    dbPath = resolvedPath;
    db = new Database(dbPath);

    // Run table creations and seeding
    initDbTablesAndMigrations(db);

    // Write persistence configuration to db_config.json
    fs.writeFileSync(dbConfigPath, JSON.stringify({ db_path: dbPath }, null, 2), "utf-8");

    res.json({ message: "پایگاه داده با موفقیت تغییر کرد.", db_path: dbPath });
  } catch (err: any) {
    res.status(500).json({ error: "خطا در برقراری اتصال دیتابیس جدید: " + err.message });
  }
});

// ---------------------- API PATHS ----------------------

// 0. SETTINGS
// GET settings map
app.get("/api/settings", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM settings").all() as { key: string; value: string }[];
    const settingsMap: Record<string, string> = {};
    rows.forEach(r => {
      settingsMap[r.key] = r.value;
    });
    res.json(settingsMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST update settings
app.post("/api/settings", (req, res) => {
  try {
    const { doc_prefix, doc_start_no, product_prefix, enterprise_name, logo_text, project_name } = req.body;
    const update = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    if (doc_prefix !== undefined) update.run("doc_prefix", String(doc_prefix).trim());
    if (doc_start_no !== undefined) update.run("doc_start_no", String(doc_start_no).trim());
    if (product_prefix !== undefined) update.run("product_prefix", String(product_prefix).trim());
    if (enterprise_name !== undefined) update.run("enterprise_name", String(enterprise_name).trim());
    if (logo_text !== undefined) update.run("logo_text", String(logo_text).trim());
    if (project_name !== undefined) update.run("project_name", String(project_name).trim());
    res.json({ message: "تنظیمات با موفقیت بروزرسانی شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. PRODUCTS
// GET products with calculated stock
app.get("/api/products", (req, res) => {
  try {
    const query = `
      SELECT p.*,
        COALESCE((
          SELECT SUM(r.quantity) 
          FROM document_rows r 
          JOIN document_headers h ON r.document_id = h.id 
          WHERE r.product_id = p.id AND h.type = 'incoming'
        ), 0) - 
        COALESCE((
          SELECT SUM(r.quantity) 
          FROM document_rows r 
          JOIN document_headers h ON r.document_id = h.id 
          WHERE r.product_id = p.id AND h.type = 'outgoing'
        ), 0) AS current_inventory
      FROM products p
      ORDER BY p.id DESC
    `;
    const products = db.prepare(query).all();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST single/multiple products (supports bulk creation)
app.post("/api/products", (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    
    const insert = db.prepare(`
      INSERT INTO products (code, name, unit, category, min_stock) 
      VALUES (@code, @name, @unit, COALESCE(@category, 'عمومی'), COALESCE(@min_stock, 0))
    `);
    
    const createItems = db.transaction((productList) => {
      const results = [];
      for (const item of productList) {
        if (!item.code || !item.name || !item.unit) {
          throw new Error("وارد کردن تمام مقادیر کد کالا، نام و واحد سنجش الزامی است.");
        }
        item.code = String(item.code).trim();
        const resObj = insert.run({
          code: item.code,
          name: item.name.trim(),
          unit: item.unit.trim(),
          category: item.category ? item.category.trim() : "عمومی",
          min_stock: item.min_stock !== undefined ? Number(item.min_stock) : 0
        });
        results.push({ id: resObj.lastInsertRowid, ...item });
      }
      return results;
    });

    const results = createItems(items);
    res.status(201).json(results);
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "خطا: کد کالا تکراری است. لطفاً کد جدیدی تعیین کنید." });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT update product
app.put("/api/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, unit, category, min_stock } = req.body;
    if (!code || !name || !unit) {
      return res.status(400).json({ error: "نام کالا، کد و واحد سنجش الزامی هستند." });
    }

    const stmt = db.prepare(`
      UPDATE products 
      SET code = ?, name = ?, unit = ?, category = ?, min_stock = ? 
      WHERE id = ?
    `);
    const info = stmt.run(code, name, unit, category || "عمومی", min_stock !== undefined ? Number(min_stock) : 0, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "کالا یافت نشد." });
    }
    res.json({ id, code, name, unit, category, min_stock });
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "خطا: کد کالا تکراری است. لطفاً کد دیگری انتخاب کنید." });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET Product Cardex Ledger
app.get("/api/products/:id/cardex", (req, res) => {
  try {
    const { id } = req.params;
    
    // Check product
    const p = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
    if (!p) {
      return res.status(404).json({ error: "کالای مورد نظر یافت نشد." });
    }

    // Get all rows for this product ordered chronologically
    const rows = db.prepare(`
      SELECT r.quantity, h.type, h.date, h.id as document_id, p.name as person_name, p.role as person_role
      FROM document_rows r
      JOIN document_headers h ON r.document_id = h.id
      JOIN persons p ON h.person_id = p.id
      WHERE r.product_id = ?
      ORDER BY h.date ASC, h.id ASC
    `).all(id) as any[];

    // Calculate running balance (مانده)
    let balance = 0;
    const cardex = rows.map(r => {
      const q = Number(r.quantity);
      if (r.type === "incoming") {
        balance += q;
      } else {
        balance -= q;
      }
      return {
        ...r,
        running_balance: balance
      };
    });

    res.json({
      product: p,
      cardex
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
app.delete("/api/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product is featured in transactions
    const checkStmt = db.prepare("SELECT count(*) as count FROM document_rows WHERE product_id = ?").get(id) as { count: number };
    if (checkStmt.count > 0) {
      return res.status(400).json({ 
        error: "امکان حذف این کالا وجود ندارد؛ زیرا در اسناد ثبت شده استفاده شده است. ابتدا ردیف‌های اسناد مربوطه را حذف کنید." 
      });
    }

    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "کالا یافت نشد." });
    }
    res.json({ message: "کالا با موفقیت حذف شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 2. PERSONS (طرف‌های حساب)
// GET list of persons
app.get("/api/persons", (req, res) => {
  try {
    const persons = db.prepare("SELECT * FROM persons ORDER BY id DESC").all();
    res.json(persons);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create person
app.post("/api/persons", (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "نام شخص/سازمان و نوع نقش الزامی است." });
    }
    const stmt = db.prepare("INSERT INTO persons (name, role) VALUES (?, ?)");
    const info = stmt.run(name, role);
    res.status(201).json({ id: info.lastInsertRowid, name, role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update person
app.put("/api/persons/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "نام شخص/سازمان و نقش الزامی است." });
    }
    const stmt = db.prepare("UPDATE persons SET name = ?, role = ? WHERE id = ?");
    const info = stmt.run(name, role, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "شخص یافت نشد." });
    }
    res.json({ id, name, role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE person
app.delete("/api/persons/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if restricted
    const countCheck = db.prepare("SELECT count(*) as count FROM document_headers WHERE person_id = ?").get(id) as { count: number };
    if (countCheck.count > 0) {
      return res.status(400).json({ 
        error: "امکان حذف این شخص وجود ندارد؛ زیرا برای او اسناد انبار ثبت شده است." 
      });
    }

    const stmt = db.prepare("DELETE FROM persons WHERE id = ?");
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "شخص یافت نشد." });
    }
    res.json({ message: "پروفایل شخص با موفقیت حذف شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET Person Ledger / Cardex
app.get("/api/persons/:id/cardex", (req, res) => {
  try {
    const { id } = req.params;
    
    // Check person
    const person = db.prepare("SELECT * FROM persons WHERE id = ?").get(id) as any;
    if (!person) {
      return res.status(404).json({ error: "شخص یا شرکت مورد نظر یافت نشد." });
    }

    // Get all rows
    const rows = db.prepare(`
      SELECT 
        r.id as row_id,
        r.quantity,
        h.id as document_id,
        h.type as document_type,
        h.date as document_date,
        h.description as document_description,
        p.id as product_id,
        p.code as product_code,
        p.name as product_name,
        p.unit as product_unit,
        p.category as product_category
      FROM document_rows r
      JOIN document_headers h ON r.document_id = h.id
      JOIN products p ON r.product_id = p.id
      WHERE h.person_id = ?
      ORDER BY h.date ASC, h.id ASC
    `).all(id) as any[];

    res.json({
      person,
      rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 3. DOCUMENT HEADERS & ROWS (ثبت اسناد انبارداری)
// GET list of documents
app.get("/api/documents", (req, res) => {
  try {
    const query = `
      SELECT h.*, p.name as person_name, p.role as person_role,
        (SELECT count(*) FROM document_rows WHERE document_id = h.id) as item_count,
        (SELECT SUM(quantity) FROM document_rows WHERE document_id = h.id) as total_quantity
      FROM document_headers h
      JOIN persons p ON h.person_id = p.id
      ORDER BY h.id DESC
    `;
    const documents = db.prepare(query).all();
    res.json(documents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET detailed document by ID
app.get("/api/documents/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const header = db.prepare(`
      SELECT h.*, p.name as person_name, p.role as person_role 
      FROM document_headers h
      JOIN persons p ON h.person_id = p.id
      WHERE h.id = ?
    `).get(id) as any;

    if (!header) {
      return res.status(404).json({ error: "سند انبار یافت نشد." });
    }

    const rows = db.prepare(`
      SELECT r.*, p.name as product_name, p.code as product_code, p.unit as product_unit
      FROM document_rows r
      JOIN products p ON r.product_id = p.id
      WHERE r.document_id = ?
      ORDER BY r.id ASC
    `).all(id);

    res.json({
      ...header,
      rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create document (including details as a transaction)
app.post("/api/documents", (req, res) => {
  try {
    const { type, date, person_id, description, rows } = req.body;
    
    if (!type || !date || !person_id || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "فرم سند ناقص است. مشخصات سربرگ و حداقل یک ردیف کالا لازم است." });
    }

    // Verify type
    if (type !== "incoming" && type !== "outgoing") {
      return res.status(400).json({ error: "نوع سند نامعتبر است." });
    }

    // Verification: if type is outgoing (خروج), let's optionally verify we have enough quantities,
    // or report warning, but let's allow it so things can go negative if they start without full initial state.
    // However, we should check that each quantity > 0
    for (const r of rows) {
      if (!r.product_id || isNaN(Number(r.quantity)) || Number(r.quantity) <= 0) {
        return res.status(400).json({ error: "مقدار کالا در تمام ردیف‌ها باید عددی مثبت و بزرگ‌تر از صفر باشد." });
      }
    }

    // Save with precise transaction
    const createDoc = db.transaction((headerData, rowList) => {
      // 1. Insert header
      const insertHeader = db.prepare(`
        INSERT INTO document_headers (type, date, person_id, description) 
        VALUES (?, ?, ?, ?)
      `);
      const hResult = insertHeader.run(headerData.type, headerData.date, headerData.person_id, headerData.description || "");
      const docId = hResult.lastInsertRowid;

      // 2. Insert rows
      const insertRow = db.prepare(`
        INSERT INTO document_rows (document_id, product_id, quantity) 
        VALUES (?, ?, ?)
      `);
      for (const row of rowList) {
        insertRow.run(docId, row.product_id, Number(row.quantity));
      }

      return docId;
    });

    const newDocId = createDoc({ type, date, person_id, description }, rows);
    res.status(201).json({ id: newDocId, message: "سند انبار با موفقیت ذخیره گردید." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE document (triggers delete cascade for rows)
app.delete("/api/documents/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM document_headers WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "سند انبار یافت نشد." });
    }
    res.json({ message: "سند انبار و ردیف‌های مربوطه با موفقیت حذف گردیدند." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 4. BACKUP (دانلود فایل دیتابیس SQLite)
app.get("/api/backup", (req, res) => {
  try {
    res.download(dbPath, "inventory-backup.db", (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(500).json({ error: "خطا در بارگیری فایل پشتیبان دیتابیس." });
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 5. NOTIFICATIONS
app.get("/api/notifications", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM notifications ORDER BY id DESC").all();
    res.json(rows.map((r: any) => ({ ...r, is_read: !!r.is_read })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/:id/read", (req, res) => {
  try {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/read-all", (req, res) => {
  try {
    db.prepare("UPDATE notifications SET is_read = 1").run();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM notifications WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications", (req, res) => {
  try {
    const { title, message, type, date } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "عنوان و متن یادآور الزامی است." });
    }
    const stmt = db.prepare("INSERT INTO notifications (title, message, type, date) VALUES (?, ?, ?, ?)");
    stmt.run(title, message, type || "reminder", date || "");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 6. CONTRACTORS
app.get("/api/contractors", (req, res) => {
  try {
    const contractors = db.prepare("SELECT * FROM contractors ORDER BY id DESC").all() as any[];
    const resList = contractors.map(c => {
      const invoices = db.prepare("SELECT * FROM contractor_invoices WHERE contractor_id = ?").all(c.id) as any[];
      const payments = db.prepare("SELECT * FROM contractor_payments WHERE contractor_id = ?").all(c.id) as any[];

      const total_gross = invoices.reduce((sum, inv) => sum + (inv.gross_amount || 0), 0);
      const total_retention = invoices.reduce((sum, inv) => sum + (inv.retention_bond || 0), 0);
      const total_insurance = invoices.reduce((sum, inv) => sum + (inv.insurance || 0), 0);
      const total_net = invoices.reduce((sum, inv) => sum + (inv.net_amount || 0), 0);
      const total_paid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
      const remaining_balance = total_net - total_paid;

      return {
        ...c,
        total_gross,
        total_retention,
        total_insurance,
        total_net,
        total_paid,
        remaining_balance
      };
    });
    res.json(resList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contractors/:id", (req, res) => {
  try {
    const { id } = req.params;
    const c = db.prepare("SELECT * FROM contractors WHERE id = ?").get(id) as any;
    if (!c) {
      return res.status(404).json({ error: "پیمانکار یافت نشد" });
    }
    const invoices = db.prepare("SELECT * FROM contractor_invoices WHERE contractor_id = ? ORDER BY id DESC").all(id) as any[];
    const payments = db.prepare("SELECT * FROM contractor_payments WHERE contractor_id = ? ORDER BY id DESC").all(id) as any[];

    const total_gross = invoices.reduce((sum, inv) => sum + (inv.gross_amount || 0), 0);
    const total_retention = invoices.reduce((sum, inv) => sum + (inv.retention_bond || 0), 0);
    const total_insurance = invoices.reduce((sum, inv) => sum + (inv.insurance || 0), 0);
    const total_net = invoices.reduce((sum, inv) => sum + (inv.net_amount || 0), 0);
    const total_paid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const remaining_balance = total_net - total_paid;

    res.json({
      ...c,
      total_gross,
      total_retention,
      total_insurance,
      total_net,
      total_paid,
      remaining_balance,
      invoices,
      payments
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contractors", (req, res) => {
  try {
    const { 
      name, 
      activity_field, 
      retention_rate, 
      insurance_rate, 
      is_tax_and_insurance_exempt, 
      has_tax_val, 
      contract_no, 
      appendix_no, 
      contract_start, 
      contract_end, 
      initial_amount 
    } = req.body;

    if (!name || !activity_field) {
      return res.status(400).json({ error: "نام و زمینه فعالیت تخصصی الزامی است" });
    }

    const stmt = db.prepare(`
      INSERT INTO contractors (
        name, activity_field, retention_rate, insurance_rate, 
        is_tax_and_insurance_exempt, has_tax_val, contract_no, 
        appendix_no, contract_start, contract_end, initial_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      name, 
      activity_field, 
      retention_rate !== undefined ? Number(retention_rate) : 10,
      insurance_rate !== undefined ? Number(insurance_rate) : 5,
      is_tax_and_insurance_exempt ? 1 : 0,
      has_tax_val ? 1 : 0,
      contract_no || null,
      appendix_no || null,
      contract_start || null,
      contract_end || null,
      initial_amount !== undefined ? Number(initial_amount) : null
    );
    
    db.prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)")
      .run("پیمانکار جدید", `پرونده مالی پیمانکار جزء جدید "${name}" با رسته "${activity_field}" در سیستم ثبت گردید.`, "credit_warning");

    res.status(201).json({ id: info.lastInsertRowid, name, activity_field });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contractors/:id
app.put("/api/contractors/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      activity_field, 
      retention_rate, 
      insurance_rate, 
      is_tax_and_insurance_exempt, 
      has_tax_val, 
      contract_no, 
      appendix_no, 
      contract_start, 
      contract_end, 
      initial_amount 
    } = req.body;

    if (!name || !activity_field) {
      return res.status(400).json({ error: "نام و رسته فعالیت پیمانکار الزامی است" });
    }

    const stmt = db.prepare(`
      UPDATE contractors 
      SET 
        name = ?, 
        activity_field = ?, 
        retention_rate = ?, 
        insurance_rate = ?, 
        is_tax_and_insurance_exempt = ?, 
        has_tax_val = ?, 
        contract_no = ?, 
        appendix_no = ?, 
        contract_start = ?, 
        contract_end = ?, 
        initial_amount = ?
      WHERE id = ?
    `);

    stmt.run(
      name, 
      activity_field, 
      retention_rate !== undefined ? Number(retention_rate) : 10,
      insurance_rate !== undefined ? Number(insurance_rate) : 5,
      is_tax_and_insurance_exempt ? 1 : 0,
      has_tax_val ? 1 : 0,
      contract_no || null,
      appendix_no || null,
      contract_start || null,
      contract_end || null,
      initial_amount !== undefined && initial_amount !== "" ? Number(initial_amount) : null,
      id
    );

    // Recalculate all net amounts for invoices of this contractor based on new rates
    const invoices = db.prepare("SELECT * FROM contractor_invoices WHERE contractor_id = ?").all(id) as any[];
    for (const inv of invoices) {
      const r_rate = retention_rate !== undefined ? Number(retention_rate) : 10;
      const i_rate = insurance_rate !== undefined ? Number(insurance_rate) : 5;
      
      let r_bond = 0;
      if (!is_tax_and_insurance_exempt) {
        r_bond = inv.gross_amount * (r_rate / 100);
      }
      let ins = 0;
      if (!is_tax_and_insurance_exempt) {
        ins = inv.gross_amount * (i_rate / 100);
      }
      let tax = 0;
      if (has_tax_val) {
        tax = inv.gross_amount * 0.10;
      }
      const net = inv.gross_amount - r_bond - ins + tax;

      db.prepare(`
        UPDATE contractor_invoices 
        SET retention_bond = ?, insurance = ?, net_amount = ?, retention_rate_used = ?, insurance_rate_used = ?, tax_value_used = ?
        WHERE id = ?
      `).run(r_bond, ins, net, r_rate, is_tax_and_insurance_exempt ? 0 : i_rate, tax, inv.id);
    }

    res.json({ success: true, message: "اطلاعات پیمانکار با موفقیت ویرایش و کلیه ترازها بروزرسانی شدند." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contractors/:id", (req, res) => {
  try {
    const { id } = req.params;
    const c = db.prepare("SELECT name FROM contractors WHERE id = ?").get(id) as any;
    const stmt = db.prepare("DELETE FROM contractors WHERE id = ?");
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "پیمانکار یافت نشد" });
    }
    if (c) {
      db.prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)")
        .run("حذف پیمانکار", `پرونده مالی پیمانکار "${c.name}" و کلیه سوابق آن به طور کامل لغو شد.`, "credit_warning");
    }
    res.json({ success: true, message: "پیمانکار با موفقیت حذف گردید." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contractors/:id/invoices", (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_number, gross_amount, is_final } = req.body;
    if (!invoice_number || !gross_amount || isNaN(Number(gross_amount))) {
      return res.status(400).json({ error: "اطلاعات صورت‌وضعیت الزامی است" });
    }

    const c = db.prepare("SELECT * FROM contractors WHERE id = ?").get(id) as any;
    if (!c) {
      return res.status(404).json({ error: "پیمانکار یافت نشد" });
    }

    const is_final_val = is_final ? 1 : 0;
    const r_rate = c.retention_rate !== undefined && c.retention_rate !== null ? Number(c.retention_rate) : 10;
    const i_rate = c.insurance_rate !== undefined && c.insurance_rate !== null ? Number(c.insurance_rate) : 5;
    const is_exempt = c.is_tax_and_insurance_exempt ? 1 : 0;

    let retention_bond = 0;
    if (!is_exempt) {
      retention_bond = Number(gross_amount) * (r_rate / 100);
    }
    let insurance = 0;
    if (!is_exempt) {
      insurance = Number(gross_amount) * (i_rate / 100);
    }
    let tax_value = 0;
    if (c.has_tax_val) {
      tax_value = Number(gross_amount) * 0.10;
    }

    const net_amount = Number(gross_amount) - retention_bond - insurance + tax_value;

    db.prepare(`
      INSERT INTO contractor_invoices (contractor_id, invoice_number, gross_amount, retention_bond, insurance, net_amount, is_final, retention_rate_used, insurance_rate_used, tax_value_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, invoice_number, Number(gross_amount), retention_bond, insurance, net_amount, is_final_val, r_rate, is_exempt ? 0 : i_rate, tax_value);

    db.prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)")
      .run("ثبت صورت‌وضعیت", `صورت‌وضعیت شماره "${invoice_number}" برای پیمانکار "${c.name}" به مبلغ خالص ${net_amount.toLocaleString("fa-IR")} ریال ثبت شد.`, "invoice");

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contractors/invoices/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM contractor_invoices WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contractors/invoices/:id
app.put("/api/contractors/invoices/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_number, gross_amount, is_final } = req.body;
    if (!invoice_number || !gross_amount || isNaN(Number(gross_amount))) {
      return res.status(400).json({ error: "اطلاعات صورت‌وضعیت ناقص است" });
    }

    const inv = db.prepare("SELECT * FROM contractor_invoices WHERE id = ?").get(id) as any;
    if (!inv) {
      return res.status(404).json({ error: "صورت‌وضعیت یافت نشد" });
    }

    const c = db.prepare("SELECT * FROM contractors WHERE id = ?").get(inv.contractor_id) as any;
    if (!c) {
      return res.status(404).json({ error: "پیمانکار مربوطه یافت نشد" });
    }

    const is_final_val = is_final ? 1 : 0;
    const r_rate = c.retention_rate !== undefined && c.retention_rate !== null ? Number(c.retention_rate) : 10;
    const i_rate = c.insurance_rate !== undefined && c.insurance_rate !== null ? Number(c.insurance_rate) : 5;
    const is_exempt = c.is_tax_and_insurance_exempt ? 1 : 0;

    let retention_bond = 0;
    if (!is_exempt) {
      retention_bond = Number(gross_amount) * (r_rate / 100);
    }
    let insurance = 0;
    if (!is_exempt) {
      insurance = Number(gross_amount) * (i_rate / 100);
    }
    let tax_value = 0;
    if (c.has_tax_val) {
      tax_value = Number(gross_amount) * 0.10;
    }

    const net_amount = Number(gross_amount) - retention_bond - insurance + tax_value;

    db.prepare(`
      UPDATE contractor_invoices 
      SET invoice_number = ?, gross_amount = ?, retention_bond = ?, insurance = ?, net_amount = ?, is_final = ?, retention_rate_used = ?, insurance_rate_used = ?, tax_value_used = ?
      WHERE id = ?
    `).run(invoice_number, Number(gross_amount), retention_bond, insurance, net_amount, is_final_val, r_rate, is_exempt ? 0 : i_rate, tax_value, id);

    res.json({ success: true, message: "صورت‌وضعیت با موفقیت ویرایش و موازنه مالی بروز گردید." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contractors/:id/payments", (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, amount, description } = req.body;
    if (!payment_date || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "مبلغ و تاریخ پرداخت الزامی است" });
    }

    const c = db.prepare("SELECT name FROM contractors WHERE id = ?").get(id) as any;
    if (!c) {
      return res.status(404).json({ error: "پیمانکار یافت نشد" });
    }

    db.prepare(`
      INSERT INTO contractor_payments (contractor_id, payment_date, amount, description)
      VALUES (?, ?, ?, ?)
    `).run(id, payment_date, Number(amount), description || "");

    db.prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)")
      .run("ثبت حواله واریز", `واریز مبلغ ${Number(amount).toLocaleString("fa-IR")} ریال به حساب "${c.name}" بابت "${description || 'مساعده'}" صادر شد.`, "payment");

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contractors/payments/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM contractor_payments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contractors/payments/:id
app.put("/api/contractors/payments/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, amount, description } = req.body;
    if (!payment_date || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "اطلاعات پرداخت ناقص است" });
    }
    db.prepare(`
      UPDATE contractor_payments 
      SET payment_date = ?, amount = ?, description = ?
      WHERE id = ?
    `).run(payment_date, Number(amount), description || "", id);
    res.json({ success: true, message: "سند پرداخت با موفقیت ویرایش شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. MACHINERY
app.get("/api/machinery", (req, res) => {
  try {
    const machinery = db.prepare("SELECT * FROM machinery ORDER BY id DESC").all() as any[];
    const resList = machinery.map(m => {
      const performances = db.prepare("SELECT * FROM machine_performances WHERE machine_id = ?").all(m.id) as any[];
      const payments = db.prepare("SELECT * FROM machine_payments WHERE machine_id = ?").all(m.id) as any[];

      const total_performance = performances.reduce((sum, p) => sum + (p.performance_value || 0), 0);
      const total_calculated = performances.reduce((sum, p) => sum + (p.total_calculated_amount || 0), 0);
      const total_paid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
      const remaining_balance = total_calculated - total_paid;

      return {
        ...m,
        total_performance,
        total_calculated,
        total_paid,
        remaining_balance
      };
    });
    res.json(resList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/machinery/:id", (req, res) => {
  try {
    const { id } = req.params;
    const m = db.prepare("SELECT * FROM machinery WHERE id = ?").get(id) as any;
    if (!m) {
      return res.status(404).json({ error: "دستگاه یافت نشد" });
    }
    const performance = db.prepare("SELECT * FROM machine_performances WHERE machine_id = ? ORDER BY month_index ASC").all(id) as any[];
    const payments = db.prepare("SELECT * FROM machine_payments WHERE machine_id = ? ORDER BY id DESC").all(id) as any[];

    const total_performance = performance.reduce((sum, p) => sum + (p.performance_value || 0), 0);
    const total_calculated = performance.reduce((sum, p) => sum + (p.total_calculated_amount || 0), 0);
    const total_paid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const remaining_balance = total_calculated - total_paid;

    res.json({
      ...m,
      total_performance,
      total_calculated,
      total_paid,
      remaining_balance,
      performance,
      payments
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create machinery device
app.post("/api/machinery", (req, res) => {
  try {
    const {
      owner_name, machine_type, license_plate, contract_type, base_rent, machine_category,
      contract_no, appendix_no, contract_start, contract_end, leap_year_adjusted, appendix_rent, appendix_start_month
    } = req.body;

    if (!owner_name || !machine_type || !license_plate || !contract_type || base_rent === undefined) {
      return res.status(400).json({ error: "اطلاعات دستگاه ناقص است" });
    }

    const info = db.prepare(`
      INSERT INTO machinery (
        owner_name, machine_type, license_plate, contract_type, base_rent, machine_category,
        contract_no, appendix_no, contract_start, contract_end, leap_year_adjusted, appendix_rent, appendix_start_month
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      owner_name, machine_type, license_plate, contract_type, Number(base_rent), machine_category || "سنگین",
      contract_no || null, appendix_no || null, contract_start || null, contract_end || null,
      leap_year_adjusted ? 1 : 0,
      appendix_rent !== undefined && appendix_rent !== null ? Number(appendix_rent) : null,
      appendix_start_month !== undefined && appendix_start_month !== null ? Number(appendix_start_month) : null
    );

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit machinery configurations (cascades and recalculates monthly performances recursively)
app.put("/api/machinery/:id", (req, res) => {
  try {
    const { id } = req.params;
    const {
      owner_name, machine_type, license_plate, contract_type, base_rent, machine_category,
      contract_no, appendix_no, contract_start, contract_end, leap_year_adjusted, appendix_rent, appendix_start_month
    } = req.body;

    if (!owner_name || !machine_type || !license_plate || !contract_type || base_rent === undefined) {
      return res.status(400).json({ error: "اطلاعات دستگاه ناقص است" });
    }

    db.prepare(`
      UPDATE machinery 
      SET owner_name = ?, machine_type = ?, license_plate = ?, contract_type = ?, base_rent = ?, machine_category = ?,
          contract_no = ?, appendix_no = ?, contract_start = ?, contract_end = ?, leap_year_adjusted = ?,
          appendix_rent = ?, appendix_start_month = ?
      WHERE id = ?
    `).run(
      owner_name, machine_type, license_plate, contract_type, Number(base_rent), machine_category || "سنگین",
      contract_no || null, appendix_no || null, contract_start || null, contract_end || null,
      leap_year_adjusted ? 1 : 0,
      appendix_rent !== undefined && appendix_rent !== null ? Number(appendix_rent) : null,
      appendix_start_month !== undefined && appendix_start_month !== null ? Number(appendix_start_month) : null,
      id
    );

    // Dynamic cascade recalculation for any recorded monthly performances
    const performances = db.prepare("SELECT * FROM machine_performances WHERE machine_id = ?").all(id) as any[];
    for (const p of performances) {
      let activeRent = Number(base_rent);
      if (appendix_rent !== undefined && appendix_rent !== null && appendix_start_month !== undefined && appendix_start_month !== null) {
        if (p.month_index >= Number(appendix_start_month)) {
          activeRent = Number(appendix_rent);
        }
      }
      if (p.rate_used !== undefined && p.rate_used !== null && p.rate_used > 0) {
        activeRent = Number(p.rate_used);
      }

      let total_calculated_amount = 0;
      if (contract_type === "hourly") {
        total_calculated_amount = p.performance_value * activeRent;
      } else if (contract_type === "daily") {
        total_calculated_amount = p.performance_value * activeRent;
      } else { // monthly
        const days = p.month_index <= 6 ? 31 : (p.month_index === 12 ? (leap_year_adjusted ? 30 : 29) : 30);
        total_calculated_amount = Math.round(p.performance_value * (activeRent / days));
      }

      db.prepare(`
        UPDATE machine_performances 
        SET total_calculated_amount = ? 
        WHERE id = ?
      `).run(total_calculated_amount, p.id);
    }

    res.json({ success: true, message: "اطلاعات دستگاه با موفقیت ویرایش شد و کلیه کارکردها بروزرسانی گردید." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete machinery 
app.delete("/api/machinery/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM machinery WHERE id = ?").run(id);
    res.json({ success: true, message: "دستگاه و کلیه کارکردها و اسناد پرداخت متناظر با آن حذف شدند." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create machinery performance
app.post("/api/machinery/:id/performance", (req, res) => {
  try {
    const { id } = req.params;
    const { month_name, month_index, performance_value, rate_used, year } = req.body;

    if (!month_name || month_index === undefined || performance_value === undefined) {
      return res.status(400).json({ error: "اطلاعات کارکرد ناقص است" });
    }

    const m = db.prepare("SELECT * FROM machinery WHERE id = ?").get(id) as any;
    if (!m) {
      return res.status(404).json({ error: "دستگاه انتخاب شده یافت نشد" });
    }

    // Annex Rates Logic
    let activeRent = m.base_rent;
    if (m.appendix_rent !== null && m.appendix_rent !== undefined && m.appendix_start_month !== null && m.appendix_start_month !== undefined) {
      if (Number(month_index) >= Number(m.appendix_start_month)) {
        activeRent = m.appendix_rent;
      }
    }
    if (rate_used !== undefined && rate_used !== null && rate_used > 0) {
      activeRent = Number(rate_used);
    }

    let total_calculated_amount = 0;
    if (m.contract_type === "hourly") {
      total_calculated_amount = Number(performance_value) * activeRent;
    } else if (m.contract_type === "daily") {
      total_calculated_amount = Number(performance_value) * activeRent;
    } else { // monthly
      const days = Number(month_index) <= 6 ? 31 : (Number(month_index) === 12 ? (m.leap_year_adjusted ? 30 : 29) : 30);
      total_calculated_amount = Math.round(Number(performance_value) * (activeRent / days));
    }

    db.prepare(`
      INSERT INTO machine_performances (machine_id, month_name, month_index, performance_value, total_calculated_amount, rate_used, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, month_name, Number(month_index), Number(performance_value), total_calculated_amount, rate_used !== undefined ? Number(rate_used) : null, year || 1405);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit machinery performance (PUT)
app.put("/api/machinery/performance/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { month_name, month_index, performance_value, rate_used, year } = req.body;

    if (!month_name || month_index === undefined || performance_value === undefined) {
      return res.status(400).json({ error: "اطلاعات کارکرد ناقص است" });
    }

    const p = db.prepare("SELECT * FROM machine_performances WHERE id = ?").get(id) as any;
    if (!p) {
      return res.status(404).json({ error: "کارکرد یافت نشد" });
    }

    const m = db.prepare("SELECT * FROM machinery WHERE id = ?").get(p.machine_id) as any;
    if (!m) {
      return res.status(404).json({ error: "دستگاه مربوطه یافت نشد" });
    }

    // Annex Rates Logic
    let activeRent = m.base_rent;
    if (m.appendix_rent !== null && m.appendix_rent !== undefined && m.appendix_start_month !== null && m.appendix_start_month !== undefined) {
      if (Number(month_index) >= Number(m.appendix_start_month)) {
        activeRent = m.appendix_rent;
      }
    }
    if (rate_used !== undefined && rate_used !== null && rate_used > 0) {
      activeRent = Number(rate_used);
    }

    let total_calculated_amount = 0;
    if (m.contract_type === "hourly") {
      total_calculated_amount = Number(performance_value) * activeRent;
    } else if (m.contract_type === "daily") {
      total_calculated_amount = Number(performance_value) * activeRent;
    } else { // monthly
      const days = Number(month_index) <= 6 ? 31 : (Number(month_index) === 12 ? (m.leap_year_adjusted ? 30 : 29) : 30);
      total_calculated_amount = Math.round(Number(performance_value) * (activeRent / days));
    }

    db.prepare(`
      UPDATE machine_performances 
      SET month_name = ?, month_index = ?, performance_value = ?, total_calculated_amount = ?, rate_used = ?, year = ?
      WHERE id = ?
    `).run(month_name, Number(month_index), Number(performance_value), total_calculated_amount, rate_used !== undefined ? Number(rate_used) : null, year || 1405, id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete machinery performance (DELETE)
app.delete("/api/machinery/performance/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM machine_performances WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/machinery/:id/payments", (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, amount, description } = req.body;
    if (!payment_date || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "مبلغ و تاریخ پرداخت الزامی است" });
    }

    const m = db.prepare("SELECT machine_type, owner_name FROM machinery WHERE id = ?").get(id) as any;
    if (!m) {
      return res.status(404).json({ error: "دستگاه یافت نشد" });
    }

    db.prepare(`
      INSERT INTO machine_payments (machine_id, payment_date, amount, description)
      VALUES (?, ?, ?, ?)
    `).run(id, payment_date, Number(amount), description || "");

    db.prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)")
      .run("تسویه ماشین‌آلات", `واریز ${Number(amount).toLocaleString("fa-IR")} ریال به حساب "${m.owner_name}" مالک "${m.machine_type}" بابت "${description || 'مساعده'}" انجام شد.`, "payment");

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/machinery/payments/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM machine_payments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/machinery/payments/:id
app.put("/api/machinery/payments/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, amount, description } = req.body;
    if (!payment_date || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "اطلاعات پرداخت ناقص است" });
    }
    db.prepare(`
      UPDATE machine_payments 
      SET payment_date = ?, amount = ?, description = ?
      WHERE id = ?
    `).run(payment_date, Number(amount), description || "", id);
    res.json({ success: true, message: "سند پرداخت ماشین‌آلات با موفقیت ویرایش شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contractor Export/Backup JSON
app.get("/api/contractors/export", (req, res) => {
  try {
    const contractors = db.prepare("SELECT * FROM contractors").all();
    const invoices = db.prepare("SELECT * FROM contractor_invoices").all();
    const payments = db.prepare("SELECT * FROM contractor_payments").all();
    res.json({ contractors, invoices, payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contractor Import/Restore JSON
app.post("/api/contractors/import", (req, res) => {
  try {
    const { contractors, invoices, payments } = req.body;
    if (!Array.isArray(contractors)) {
      return res.status(400).json({ error: "فرمت پرونده نامعتبر است." });
    }
    
    db.transaction(() => {
      // Clear
      db.prepare("DELETE FROM contractor_invoices").run();
      db.prepare("DELETE FROM contractor_payments").run();
      db.prepare("DELETE FROM contractors").run();

      const insertContractor = db.prepare(`
        INSERT INTO contractors (
          id, name, activity_field, retention_rate, insurance_rate, 
          is_tax_and_insurance_exempt, has_tax_val, contract_no, 
          appendix_no, contract_start, contract_end, initial_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of contractors) {
        insertContractor.run(
          c.id, c.name, c.activity_field, 
          c.retention_rate !== undefined ? c.retention_rate : 10,
          c.insurance_rate !== undefined ? c.insurance_rate : 5,
          c.is_tax_and_insurance_exempt ? 1 : 0,
          c.has_tax_val ? 1 : 0,
          c.contract_no || null,
          c.appendix_no || null,
          c.contract_start || null,
          c.contract_end || null,
          c.initial_amount !== undefined ? c.initial_amount : null
        );
      }

      if (Array.isArray(invoices)) {
        const insertInvoice = db.prepare(`
          INSERT INTO contractor_invoices (
            id, contractor_id, invoice_number, gross_amount, retention_bond, insurance, net_amount, 
            is_final, retention_rate_used, insurance_rate_used, tax_value_used
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const i of invoices) {
          insertInvoice.run(
            i.id, i.contractor_id, i.invoice_number, i.gross_amount, i.retention_bond, i.insurance, i.net_amount,
            i.is_final ? 1 : 0,
            i.retention_rate_used !== undefined ? i.retention_rate_used : 10,
            i.insurance_rate_used !== undefined ? i.insurance_rate_used : 5,
            i.tax_value_used !== undefined ? i.tax_value_used : 0
          );
        }
      }

      if (Array.isArray(payments)) {
        const insertPayment = db.prepare(`
          INSERT INTO contractor_payments (id, contractor_id, payment_date, amount, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of payments) {
          insertPayment.run(p.id, p.contractor_id, p.payment_date, p.amount, p.description || "");
        }
      }
    })();

    res.json({ success: true, message: "پشتیبان اطلاعات پیمانکاران با موفقیت بازیابی شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Machinery Export/Backup JSON
app.get("/api/machinery/export", (req, res) => {
  try {
    const machinery = db.prepare("SELECT * FROM machinery").all();
    const performances = db.prepare("SELECT * FROM machine_performances").all();
    const payments = db.prepare("SELECT * FROM machine_payments").all();
    res.json({ machinery, performances, payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Machinery Import/Restore JSON
app.post("/api/machinery/import", (req, res) => {
  try {
    const { machinery, performances, payments } = req.body;
    if (!Array.isArray(machinery)) {
      return res.status(400).json({ error: "فرمت پرونده نامعتبر است." });
    }

    db.transaction(() => {
      // Clear
      db.prepare("DELETE FROM machine_performances").run();
      db.prepare("DELETE FROM machine_payments").run();
      db.prepare("DELETE FROM machinery").run();

      const insertMachine = db.prepare(`
        INSERT INTO machinery (
          id, owner_name, machine_type, license_plate, contract_type, base_rent, machine_category,
          contract_no, appendix_no, contract_start, contract_end, leap_year_adjusted, appendix_rent, appendix_start_month
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of machinery) {
        insertMachine.run(
          m.id, m.owner_name, m.machine_type, m.license_plate, m.contract_type, m.base_rent, m.machine_category || "سنگین",
          m.contract_no || null, m.appendix_no || null, m.contract_start || null, m.contract_end || null, m.leap_year_adjusted ? 1 : 0,
          m.appendix_rent !== undefined ? m.appendix_rent : null, m.appendix_start_month !== undefined ? m.appendix_start_month : null
        );
      }

      if (Array.isArray(performances)) {
        const insertPerf = db.prepare(`
          INSERT INTO machine_performances (id, machine_id, month_name, month_index, performance_value, total_calculated_amount, rate_used, year)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of performances) {
          insertPerf.run(p.id, p.machine_id, p.month_name, p.month_index, p.performance_value, p.total_calculated_amount, p.rate_used !== undefined ? p.rate_used : null, p.year || 1405);
        }
      }

      if (Array.isArray(payments)) {
        const insertPayment = db.prepare(`
          INSERT INTO machine_payments (id, machine_id, payment_date, amount, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of payments) {
          insertPayment.run(p.id, p.machine_id, p.payment_date, p.amount, p.description || "");
        }
      }
    })();

    res.json({ success: true, message: "پشتیبان کارکرد و حساب ماشین‌آلات با موفقیت بازیابی شد." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 8. RESET DATABASE & TABLES
app.post("/api/reset-database", (req, res) => {
  try {
    // Drop all tables
    db.exec(`
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS document_rows;
      DROP TABLE IF EXISTS document_headers;
      DROP TABLE IF EXISTS persons;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS contractors;
      DROP TABLE IF EXISTS contractor_invoices;
      DROP TABLE IF EXISTS contractor_payments;
      DROP TABLE IF EXISTS machinery;
      DROP TABLE IF EXISTS machine_performances;
      DROP TABLE IF EXISTS machine_payments;
      DROP TABLE IF EXISTS notifications;
    `);

    // Recreate and seed using the unified setup function
    initDbTablesAndMigrations(db);

    res.json({ message: "پایگاه داده به طور کامل ریست شد و آماده به کار است." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 9. JSON EXPORT FOR WAREHOUSE
app.get("/api/warehouse/export-json", (req, res) => {
  try {
    const products = db.prepare("SELECT * FROM products").all();
    const persons = db.prepare("SELECT * FROM persons").all();
    const document_headers = db.prepare("SELECT * FROM document_headers").all();
    const document_rows = db.prepare("SELECT * FROM document_rows").all();
    res.json({ products, persons, document_headers, document_rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 10. JSON IMPORT FOR WAREHOUSE
app.post("/api/warehouse/import-json", (req, res) => {
  try {
    const { products, persons, document_headers, document_rows } = req.body;
    if (!Array.isArray(products) || !Array.isArray(persons) || !Array.isArray(document_headers) || !Array.isArray(document_rows)) {
      return res.status(400).json({ error: "ساختار فایل پشتیبان انبار صحیح نیست." });
    }

    const transaction = db.transaction(() => {
      db.pragma("foreign_keys = OFF");
      
      db.prepare("DELETE FROM document_rows").run();
      db.prepare("DELETE FROM document_headers").run();
      db.prepare("DELETE FROM persons").run();
      db.prepare("DELETE FROM products").run();

      const insertProduct = db.prepare(`
        INSERT INTO products (id, code, name, unit, category, min_stock)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const p of products) {
        insertProduct.run(p.id, p.code, p.name, p.unit, p.category, p.min_stock);
      }

      const insertPerson = db.prepare(`
        INSERT INTO persons (id, name, role)
        VALUES (?, ?, ?)
      `);
      for (const pr of persons) {
        insertPerson.run(pr.id, pr.name, pr.role);
      }

      const insertHeader = db.prepare(`
        INSERT INTO document_headers (id, type, date, person_id, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const h of document_headers) {
        insertHeader.run(h.id, h.type, h.date, h.person_id, h.description);
      }

      const insertRow = db.prepare(`
        INSERT INTO document_rows (id, document_id, product_id, quantity)
        VALUES (?, ?, ?, ?)
      `);
      for (const r of document_rows) {
        insertRow.run(r.id, r.document_id, r.product_id, r.quantity);
      }

      db.pragma("foreign_keys = ON");
    });

    transaction();
    res.json({ success: true, message: "پایگاه داده انبارداری (JSON) با موفقیت بازیابی شد." });
  } catch (err: any) {
    db.pragma("foreign_keys = ON");
    res.status(500).json({ error: err.message });
  }
});


// 11. RESTORE FULL SQLITE DB FILE
app.post("/api/restore-db", express.raw({ type: "application/octet-stream", limit: "50mb" }), (req, res) => {
  try {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: "بدنه درخواست خالی است یا فایل برای بازگردانی ارسال نشده است." });
    }
    
    // Close existing connection
    db.close();
    
    // Write new backup over database file
    fs.writeFileSync(dbPath, req.body);
    
    // Re-open DB
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    
    res.json({ success: true, message: "فایل دیتابیس یکپارچه با موفقیت بازیابی و پیکربندی سیستم بارگذاری شد." });
  } catch (err: any) {
    try {
      db = new Database(dbPath);
      db.pragma("foreign_keys = ON");
    } catch (e) {}
    res.status(500).json({ error: err.message || "خطا در عملیات بازگردانی فایل دیتابیس" });
  }
});



// ----------------- VITE DEVELOPMENT & PRODUCTION HANDLING -----------------

async function startServer() {
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
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

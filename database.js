const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'karam.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Run queries and return Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Get all rows
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Initialize tables
async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('SAR', 'USD')),
      avatar TEXT DEFAULT 'avatar1',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL, -- 'debit' or 'credit'
      is_recurring INTEGER DEFAULT 0,
      is_anomaly INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      interval TEXT NOT NULL, -- 'weekly', 'monthly', 'yearly'
      next_renewal TEXT NOT NULL,
      utility_score REAL DEFAULT 1.0,
      is_active INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      current_price REAL NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ml_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL UNIQUE,
      balance REAL NOT NULL,
      linked_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      day_of_month INTEGER NOT NULL,
      last_posted_month TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS financial_qa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL,
      lang TEXT NOT NULL,
      keywords TEXT NOT NULL
    )
  `);

  await run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS financial_qa_fts USING fts5(question, answer, category, lang, keywords)
  `);

  try {
    const ftsCount = await get('SELECT COUNT(*) as count FROM financial_qa_fts');
    const qaCount = await get('SELECT COUNT(*) as count FROM financial_qa');
    if (ftsCount.count < qaCount.count) {
      console.log('Syncing financial_qa to FTS5 virtual table...');
      await run('DELETE FROM financial_qa_fts');
      await run('INSERT INTO financial_qa_fts SELECT question, answer, category, lang, keywords FROM financial_qa');
      console.log('Sync complete!');
    }
  } catch (e) {
    console.error('Failed to sync FTS5 virtual table:', e.message);
  }

  // Migration for profile avatar column
  try {
    await run("ALTER TABLE profile ADD COLUMN avatar TEXT DEFAULT 'avatar1'");
  } catch (e) {
    // Column already exists, ignore
  }

  // Seed badges if empty
  const badgeCount = await get('SELECT COUNT(*) as count FROM badges');
  if (badgeCount.count === 0) {
    console.log('Seeding default system badges...');
    await run(`
      INSERT INTO badges (title, description, unlocked) VALUES
      ('Tuwaiq Peak', 'Maintain dynamic savings rate above 15% for current month.', 0),
      ('Alinma Elite', 'Successfully link bank account via Open Banking.', 0),
      ('Tadawul Bull', 'Own stocks in the portfolio worth more than 5,000 SAR.', 0),
      ('Cost Slayer', 'Deactivate at least one low-utility subscription.', 0)
    `);
  }
}

module.exports = {
  db,
  run,
  all,
  get,
  initDatabase
};

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'karam.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
    process.exit(1);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

async function seed() {
  console.log('Resetting existing database tables...');
  
  // Drop tables to clear data without unlinking file (which is locked by active Express server)
  await run('DROP TABLE IF EXISTS transactions');
  await run('DROP TABLE IF EXISTS subscriptions');
  await run('DROP TABLE IF EXISTS savings_goals');
  await run('DROP TABLE IF EXISTS stocks');
  await run('DROP TABLE IF EXISTS ml_state');
  await run('DROP TABLE IF EXISTS bank_accounts');
  await run('DROP TABLE IF EXISTS badges');

  console.log('Initializing database tables...');
  
  // 1. Transactions
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      is_anomaly INTEGER DEFAULT 0
    )
  `);

  // 2. Subscriptions
  await run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      interval TEXT NOT NULL,
      next_renewal TEXT NOT NULL,
      utility_score REAL DEFAULT 1.0,
      is_active INTEGER DEFAULT 1
    )
  `);

  // 3. Savings Goals
  await run(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT
    )
  `);

  // 4. Stocks
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

  // 5. ML State
  await run(`
    CREATE TABLE IF NOT EXISTS ml_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 6. Bank Accounts (Open Banking)
  await run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL UNIQUE,
      balance REAL NOT NULL,
      linked_at TEXT NOT NULL
    )
  `);

  // 7. Badges (Gamification achievements)
  await run(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT
    )
  `);

  console.log('Seeding achievements...');

  // Seed badges (Gamification)
  await run(`
    INSERT INTO badges (title, description, unlocked, unlocked_at) VALUES
    ('Tuwaiq Peak', 'Maintain dynamic savings rate above 15% for current month.', 0, NULL),
    ('Alinma Elite', 'Successfully link bank account via Open Banking.', 0, NULL),
    ('Cost-Slayer', 'Cancel a low-utility subscription.', 0, NULL),
    ('Vision 2030 Legend', 'Unlocking all badges and achieving 10%+ savings rate.', 0, NULL)
  `);

  console.log('Seeding bank accounts...');
  await run(`
    INSERT INTO bank_accounts (bank_name, account_number, balance, linked_at) VALUES
    ('Alinma Bank', 'SA10200000123456789012', 24500.00, '2026-06-01'),
    ('SNB Bank', 'SA40100000987654321098', 8200.00, '2026-06-10'),
    ('Al Rajhi Bank', 'SA80300000112233445566', 52430.00, '2026-05-15')
  `);

  console.log('Skipping default subscriptions seeding (letting customer enter manually)...');

  console.log('Seeding savings goals...');
  await run(`
    INSERT INTO savings_goals (title, target_amount, current_amount, target_date) VALUES
    ('Wedding', 150000.00, 95000.00, '2027-06-01'),
    ('Emergency Fund', 50000.00, 32000.00, '2026-12-31'),
    ('New Car (Lucid Air)', 320000.00, 45000.00, '2028-12-31')
  `);

  console.log('Seeding stock portfolio...');
  await run(`
    INSERT INTO stocks (symbol, name, quantity, purchase_price, current_price) VALUES
    ('1150', 'Alinma Bank', 500.0, 31.50, 34.20),
    ('2222', 'Saudi Aramco', 800.0, 28.90, 30.45),
    ('7010', 'STC', 300.0, 38.20, 39.10),
    ('2010', 'SABIC', 150.0, 78.50, 81.30),
    ('CONV', 'Conventional Mock Bank', 100.0, 45.00, 42.50)
  `);

  console.log('Seeding credit/debit transactions...');
  await run(`
    INSERT INTO transactions (date, description, amount, category, type, is_recurring, is_anomaly) VALUES
    ('2026-04-27', 'Salary Payout Alinma', 18000.00, 'Salary', 'credit', 1, 0),
    ('2026-05-27', 'Salary Payout Alinma', 18000.00, 'Salary', 'credit', 1, 0),
    ('2026-06-27', 'Salary Payout Alinma', 18000.00, 'Salary', 'credit', 1, 0),
    
    ('2026-05-02', 'Spotify subscription', -23.00, 'Entertainment', 'debit', 1, 0),
    ('2026-06-02', 'Spotify subscription', -23.00, 'Entertainment', 'debit', 1, 0),
    
    ('2026-05-05', 'Tuwaiq Fitness Gym', -350.00, 'Health & Fitness', 'debit', 1, 0),
    ('2026-06-05', 'Tuwaiq Fitness Gym', -350.00, 'Health & Fitness', 'debit', 1, 0),
    
    ('2026-05-10', 'Netflix subscription', -56.00, 'Entertainment', 'debit', 1, 0),
    ('2026-06-10', 'Netflix subscription', -56.00, 'Entertainment', 'debit', 1, 0),
    
    ('2026-06-01', 'Starbucks Coffee', -24.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-04', 'Starbucks Coffee', -28.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-08', 'Starbucks Coffee', -24.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-12', 'Starbucks Coffee', -24.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-16', 'Starbucks Coffee', -28.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-20', 'Starbucks Coffee', -24.00, 'Food & Dining', 'debit', 0, 0),
    
    ('2026-06-02', 'STC Fiber Internet', -287.50, 'Utilities', 'debit', 1, 0),
    ('2026-06-18', 'Saudi Electric Company Bill', -520.00, 'Utilities', 'debit', 1, 0),
    
    ('2026-06-03', 'Uber ride', -45.00, 'Transportation', 'debit', 0, 0),
    ('2026-06-07', 'Uber ride', -35.00, 'Transportation', 'debit', 0, 0),
    ('2026-06-11', 'Uber ride', -40.00, 'Transportation', 'debit', 0, 0),
    ('2026-06-14', 'Aldrees Gas Station', -65.00, 'Transportation', 'debit', 0, 0),
    
    ('2026-06-05', 'Albaik Restaurant', -34.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-10', 'McDonalds Dining', -42.00, 'Food & Dining', 'debit', 0, 0),
    ('2026-06-22', 'Maestro Pizza', -58.00, 'Food & Dining', 'debit', 0, 0),
    
    ('2026-06-06', 'Amazon.sa Online Order', -120.00, 'Shopping', 'debit', 0, 0),
    ('2026-06-12', 'Noon.com Purchase', -85.00, 'Shopping', 'debit', 0, 0),
    
    ('2026-06-15', 'Jarir Bookstore Electronic Device', -6500.00, 'Shopping', 'debit', 0, 1),
    ('2026-06-20', 'Luxury Watches Al-Batha', -12000.00, 'Shopping', 'debit', 0, 1)
  `);

  console.log('✅ SQLite Database successfully reset and initialized with achievements and rich live mock data!');
  db.close();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  db.close();
});

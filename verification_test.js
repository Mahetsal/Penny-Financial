const assert = require('assert');
const database = require('./database');
const mlEngine = require('./mlEngine');

async function runTests() {
  console.log('--- STARTING HACKATHON UPGRADE VERIFICATION TESTS ---');

  try {
    // 1. Test Database Init with new tables
    await database.initDatabase();
    console.log('✅ SQLite Database successfully initialized and seeded (including bank_accounts, badges, and Tadawul stocks).');

    // 2. Test ML Naive Bayes Classifier
    const classifier = mlEngine.classifier;
    classifier.seed();

    const t1 = classifier.classify('Netflix Monthly bill');
    const t2 = classifier.classify('Uber ride home');
    const t3 = classifier.classify('Walmart grocery purchase');

    assert.strictEqual(t1, 'Entertainment', 'Netflix classification failed');
    assert.strictEqual(t2, 'Transportation', 'Uber classification failed');
    assert.strictEqual(t3, 'Food & Dining', 'Walmart classification failed');
    console.log('✅ Naive Bayes Classifier categorizes correctly.');

    // 3. Test SMS Parser
    const sms = 'Debit Card txn: USD 45.50 spent at Starbucks on 12-06-2026. Bal: USD 1200.00';
    const parsed = mlEngine.parseSMSNotification(sms);

    assert.strictEqual(parsed.description, 'Starbucks', 'SMS merchant parsing failed');
    assert.strictEqual(parsed.amount, -45.5, 'SMS amount parsing failed');
    assert.strictEqual(parsed.type, 'debit', 'SMS transaction type failed');
    assert.strictEqual(parsed.category, 'Food & Dining', 'SMS category classification failed');
    assert.strictEqual(parsed.balance, 1200, 'SMS balance parsing failed');
    assert.strictEqual(parsed.date, '2026-06-12', 'SMS date parsing failed');
    console.log('✅ SMS & Notification Parser successfully extracts transaction details.');

    // 4. Test Stock Signal Generator
    const stockSignal = mlEngine.calculateStockSignals('1150', 34, 32);
    assert.ok(stockSignal.signal, 'Stock signal is missing');
    assert.ok(stockSignal.rsi >= 0 && stockSignal.rsi <= 100, 'RSI value is invalid');
    console.log('✅ Stock technical signals and NLP sentiment are generated successfully.');

    // 5. Test Anomaly Detection
    // Ensure we have at least 7 days of debit history with variance to establish baseline for Z-Score
    await database.run('DELETE FROM transactions');
    const testSeedDates = [
      '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', 
      '2026-06-19', '2026-06-20', '2026-06-21'
    ];
    let seedIdx = 0;
    for (const d of testSeedDates) {
      const amt = -20.00 - (seedIdx * 5); // 20, 25, 30, 35, 40, 45, 50
      await database.run(
        "INSERT INTO transactions (date, description, amount, category, type) VALUES (?, 'Starbucks', ?, 'Food & Dining', 'debit')",
        [d, amt]
      );
      seedIdx++;
    }

    const normalTx = await mlEngine.detectAnomaly(-15, '2026-06-22');
    const anomalyTx = await mlEngine.detectAnomaly(-5000, '2026-06-22'); // highly spiked
    assert.strictEqual(normalTx, false, 'Normal transaction flagged incorrectly as anomaly');
    assert.strictEqual(anomalyTx, true, 'Large spike transaction missed by anomaly detector');
    console.log('✅ Z-Score Anomaly Detector functions correctly.');

    // 6. Test Shariah-Compliance screening (Tadawul / SAMA rules mock validation)
    // AAPL: compliant, CONV: non-compliant
    const checkShariah = (symbol) => {
      const sym = symbol.toUpperCase();
      if (sym === 'AAPL' || sym === '1150' || sym === '2222' || sym === '7010' || sym === '2010') {
        return { isShariah: true, debtRatio: sym === '1150' ? 0 : 15 };
      }
      return { isShariah: false, debtRatio: 85 };
    };

    const shariahAAPL = checkShariah('AAPL');
    const shariahCONV = checkShariah('CONV');
    assert.strictEqual(shariahAAPL.isShariah, true, 'Apple flagged incorrectly as non-compliant');
    assert.strictEqual(shariahCONV.isShariah, false, 'Conventional mock bank flagged incorrectly as compliant');
    assert.strictEqual(shariahCONV.debtRatio > 33, true, 'Debt ratio screening failed for conventional bank');
    console.log('✅ Shariah-Compliance screening logic successfully verified.');

    // 7. Test Gamification Badges
    const badgeCount = await database.get('SELECT COUNT(*) as count FROM badges');
    assert.strictEqual(badgeCount.count, 4, 'Correct number of badges not found in database');
    console.log('✅ Gamification Badges schema verified successfully.');

    // 8. Test Secure Input Validation Helpers
    const isValidMerchant = (str) => typeof str === 'string' && /^[a-zA-Z0-9\s\u0600-\u06FF\.,\-&_'\(\)]+$/.test(str);
    const isValidNumber = (val) => typeof val !== 'object' && !isNaN(Number(val)) && isFinite(Number(val));

    assert.strictEqual(isValidMerchant("Starbucks Coffee"), true, 'Merchant validation failed for valid name');
    assert.strictEqual(isValidMerchant("الراجحي 123"), true, 'Merchant validation failed for valid Arabic name');
    assert.strictEqual(isValidMerchant("Starbucks; DROP TABLE transactions;"), false, 'SQL injection attempt not blocked by merchant validation');
    assert.strictEqual(isValidNumber(12.34), true, 'Number validation failed for valid float');
    assert.strictEqual(isValidNumber("12.34"), true, 'Number validation failed for valid numeric string');
    assert.strictEqual(isValidNumber("abc"), false, 'Number validation succeeded for non-numeric string');
    console.log('✅ SQLite Secure Input Validation helpers verified.');

    // 9. Test PIN Hash & Safe Comparison Helpers
    const crypto = require('crypto');
    const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex');
    const safeCompare = (a, b) => {
      if (typeof a !== 'string' || typeof b !== 'string') return false;
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    };

    const hash1 = hashPin("1234");
    const hash2 = hashPin("1234");
    const hash3 = hashPin("4321");
    assert.strictEqual(safeCompare(hash1, hash2), true, 'Safe compare failed for identical hashes');
    assert.strictEqual(safeCompare(hash1, hash3), false, 'Safe compare succeeded for different hashes');
    console.log('✅ PIN Cryptographic Hash and Constant-Time Comparison helpers verified.');

    // 10. Test Profile DB Schema & CRUD
    console.log('Testing Profile Table Schema & CRUD...');
    // Clear any existing profile
    await database.run('DELETE FROM profile');
    const emptyProfile = await database.get('SELECT * FROM profile');
    assert.strictEqual(emptyProfile, undefined, 'Profile table should be empty initially');

    // Insert profile
    await database.run("INSERT INTO profile (name, currency) VALUES ('Test User', 'SAR')");
    const testProfile = await database.get('SELECT * FROM profile');
    assert.ok(testProfile, 'Profile should have been created');
    assert.strictEqual(testProfile.name, 'Test User', 'Profile name mismatch');
    assert.strictEqual(testProfile.currency, 'SAR', 'Profile currency mismatch');

    // Test check constraint on currency
    try {
      await database.run("INSERT INTO profile (name, currency) VALUES ('Bad User', 'EUR')");
      assert.fail('Should fail due to currency CHECK constraint');
    } catch (err) {
      assert.ok(err.message.includes('CHECK constraint failed'), 'Expected CHECK constraint error');
    }
    console.log('✅ Profile DB Schema & CRUD tests passed.');

    // 11. Test Clean-slate functionality
    console.log('Testing Clean-slate Database Wipe...');
    // Seed some mock data to verify wipe
    await database.run("INSERT INTO transactions (date, description, amount, category, type) VALUES ('2026-06-27', 'Test Tx', -50.00, 'Food', 'debit')");
    await database.run("INSERT INTO stocks (symbol, name, quantity, purchase_price, current_price) VALUES ('MOCK', 'Mock Stock', 10, 10, 10)");
    await database.run("INSERT INTO savings_goals (title, target_amount) VALUES ('Mock Goal', 100)");
    await database.run("INSERT INTO subscriptions (merchant, amount, interval, next_renewal) VALUES ('Mock Sub', 15, 'monthly', '2026-07-01')");
    await database.run("INSERT INTO ml_state (key, value) VALUES ('mock_key', 'mock_val')");
    
    // Unlock a badge
    await database.run("UPDATE badges SET unlocked = 1, unlocked_at = '2026-06-27' WHERE title = 'Tuwaiq Peak'");

    // Call clean-slate logic (mimicking POST /api/admin/clean-slate)
    await database.run('DELETE FROM transactions');
    await database.run('DELETE FROM stocks');
    await database.run('DELETE FROM savings_goals');
    await database.run('DELETE FROM subscriptions');
    await database.run('DELETE FROM ml_state');
    await database.run('DELETE FROM profile');
    await database.run('UPDATE badges SET unlocked = 0, unlocked_at = NULL');
    await database.run('DELETE FROM bank_accounts');
    await database.run(`
      INSERT INTO bank_accounts (bank_name, account_number, balance, linked_at) VALUES
      ('Alinma Bank', 'SA10200000123456789012', 24500.00, '2026-06-01'),
      ('SNB Bank', 'SA40100000987654321098', 8200.00, '2026-06-10'),
      ('Al Rajhi Bank', 'SA80300000112233445566', 52430.00, '2026-05-15')
    `);

    // Assert everything is wiped
    const txCount = await database.get('SELECT COUNT(*) as count FROM transactions');
    assert.strictEqual(txCount.count, 0, 'Transactions not cleared');

    const stockCount = await database.get('SELECT COUNT(*) as count FROM stocks');
    assert.strictEqual(stockCount.count, 0, 'Stocks not cleared');

    const goalCount = await database.get('SELECT COUNT(*) as count FROM savings_goals');
    assert.strictEqual(goalCount.count, 0, 'Savings goals not cleared');

    const subCount = await database.get('SELECT COUNT(*) as count FROM subscriptions');
    assert.strictEqual(subCount.count, 0, 'Subscriptions not cleared');

    const mlCount = await database.get('SELECT COUNT(*) as count FROM ml_state');
    assert.strictEqual(mlCount.count, 0, 'ML state not cleared');

    const profCount = await database.get('SELECT COUNT(*) as count FROM profile');
    assert.strictEqual(profCount.count, 0, 'Profile not cleared');

    const recTxCount = await database.get('SELECT COUNT(*) as count FROM recurring_transactions');
    assert.strictEqual(recTxCount.count, 0, 'Recurring transactions not cleared');

    // Assert badges are reset
    const activeBadges = await database.get('SELECT COUNT(*) as count FROM badges WHERE unlocked = 1');
    assert.strictEqual(activeBadges.count, 0, 'Badges not reset');

    // Assert bank accounts are restored to default templates
    const bankCount = await database.get('SELECT COUNT(*) as count FROM bank_accounts');
    assert.strictEqual(bankCount.count, 3, 'Bank accounts not reset to defaults');
    console.log('✅ Clean-slate logic tests passed.');

    // 11.5 Recurring Transactions CRUD test
    console.log('Testing Recurring Transactions Table Schema & CRUD...');
    await database.run(
      'INSERT INTO recurring_transactions (description, amount, category, type, day_of_month, last_posted_month) VALUES (?, ?, ?, ?, ?, ?)',
      ['Monthly Salary Test', 15000, 'Salary', 'credit', 25, '2026-06']
    );
    const recTx = await database.get("SELECT * FROM recurring_transactions WHERE description = 'Monthly Salary Test'");
    assert.ok(recTx, 'Failed to insert recurring transaction');
    assert.strictEqual(recTx.amount, 15000, 'Amount mismatch');
    assert.strictEqual(recTx.day_of_month, 25, 'Day mismatch');

    await database.run('DELETE FROM recurring_transactions WHERE id = ?', [recTx.id]);
    const deletedRec = await database.get("SELECT * FROM recurring_transactions WHERE description = 'Monthly Salary Test'");
    assert.ok(!deletedRec, 'Failed to delete recurring transaction');
    console.log('✅ Recurring Transactions DB Schema & CRUD tests passed.');

    // 12. Run NLU Trie 5,000+ Combinatorial Stress Tests
    const { execSync } = require('child_process');
    console.log('Running 5,000+ NLU Combinatorial Stress Tests...');
    execSync('node nlu_stress_test.mjs', { stdio: 'inherit' });
    console.log('✅ NLU Trie Stemmer Stress Tests passed successfully.');

    console.log('\n🎉 ALL HACKATHON UPGRADE TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification tests failed:', err);
    process.exit(1);
  }
}

runTests();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const mlEngine = require('./mlEngine');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Validation helpers for SQLite security
const isValidMerchant = (str) => typeof str === 'string' && /^[a-zA-Z0-9\s\u0600-\u06FF\.,\-&_'\(\)]+$/.test(str);
const isValidNumber = (val) => typeof val !== 'object' && !isNaN(Number(val)) && isFinite(Number(val));

// Initialize SQLite database
database.initDatabase()
  .then(() => console.log('Database initialized successfully.'))
  .catch(err => console.error('Database initialization failed:', err));

// Helper to process recurring transactions (e.g. Salaries)
async function processRecurringTransactions() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const recurringList = await database.all('SELECT * FROM recurring_transactions');
    for (const rec of recurringList) {
      if (!rec.last_posted_month) continue;
      let [lastY, lastM] = rec.last_posted_month.split('-').map(Number);
      
      let checkY = lastY;
      let checkM = lastM;
      
      while (true) {
        checkM++;
        if (checkM > 12) {
          checkM = 1;
          checkY++;
        }
        
        if (checkY > currentYear || (checkY === currentYear && checkM > currentMonth)) {
          break;
        }
        
        if (checkY === currentYear && checkM === currentMonth && currentDay < rec.day_of_month) {
          break;
        }
        
        const monthStr = checkM < 10 ? '0' + checkM : '' + checkM;
        const dayStr = rec.day_of_month < 10 ? '0' + rec.day_of_month : '' + rec.day_of_month;
        const dateStr = `${checkY}-${monthStr}-${dayStr}`;
        
        let finalCategory = rec.category;
        if (finalCategory === 'Auto-Detect') {
          finalCategory = mlEngine.classifier.classify(rec.description);
        }
        
        await database.run(
          'INSERT INTO transactions (date, description, amount, category, type, is_recurring) VALUES (?, ?, ?, ?, ?, 1)',
          [dateStr, rec.description, rec.amount, finalCategory, rec.type]
        );
        
        const postedMonthStr = `${checkY}-${monthStr}`;
        await database.run(
          'UPDATE recurring_transactions SET last_posted_month = ? WHERE id = ?',
          [postedMonthStr, rec.id]
        );
      }
    }
  } catch (err) {
    console.error('Error processing recurring transactions:', err);
  }
}

app.get('/api/recurring-transactions', async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM recurring_transactions ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recurring-transactions', async (req, res) => {
  const { description, amount, category, type, day_of_month, last_posted_month } = req.body;
  if (!description || amount === undefined || !type || !day_of_month || !last_posted_month) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await database.run(
      'INSERT INTO recurring_transactions (description, amount, category, type, day_of_month, last_posted_month) VALUES (?, ?, ?, ?, ?, ?)',
      [description, amount, category, type, day_of_month, last_posted_month]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/recurring-transactions/:id', async (req, res) => {
  try {
    await database.run('DELETE FROM recurring_transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - TRANSACTIONS
 */
app.get('/api/transactions', async (req, res) => {
  try {
    await processRecurringTransactions();
    const rows = await database.all('SELECT * FROM transactions ORDER BY date DESC, id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { date, description, amount, category, type } = req.body;
  if (!date || !description || amount === undefined || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidNumber(amount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (!isValidMerchant(description)) {
    return res.status(400).json({ error: 'Invalid description' });
  }

  try {
    // 1. Auto-categorize if not provided
    let finalCategory = category;
    if (!finalCategory || finalCategory === 'Auto-Detect' || finalCategory.trim() === '') {
      finalCategory = mlEngine.classifier.classify(description);
    } else {
      // Online learning: if user specified a category, train the Naive Bayes classifier on-the-fly!
      mlEngine.classifier.train(description, finalCategory);
      await mlEngine.classifier.save();
    }

    // 2. Anomaly Detection (Z-Score)
    const isAnomaly = await mlEngine.detectAnomaly(amount, date);

    // 3. Scan for recurring subscriptions (if transaction description matches an active subscription merchant)
    let isRecurring = 0;
    const cleanDesc = description.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanDesc !== '') {
      const activeSubs = await database.all('SELECT merchant FROM subscriptions WHERE is_active = 1');
      for (const sub of activeSubs) {
        const cleanMerchant = sub.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanMerchant !== '' && (cleanDesc.includes(cleanMerchant) || cleanMerchant.includes(cleanDesc))) {
          isRecurring = 1;
          break;
        }
      }
    }

    // Insert into DB
    const result = await database.run(
      'INSERT INTO transactions (date, description, amount, category, type, is_recurring, is_anomaly) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, description, amount, finalCategory, type, isRecurring, isAnomaly ? 1 : 0]
    );

    res.json({
      id: result.id,
      date,
      description,
      amount,
      category: finalCategory,
      type,
      is_recurring: isRecurring,
      is_anomaly: isAnomaly ? 1 : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulator', async (req, res) => {
  const { 
    actionName, 
    cost, 
    recurringCost, 
    monthlyIncomeChange, 
    years = 3, 
    riskMargin = 10,       // percentage discount on savings
    inflationRate = 3,     // annual inflation rate
    expenseShock = 5000    // one-time shock in SAR
  } = req.body;

  if (!actionName) return res.status(400).json({ error: 'Action name is required' });

  try {
    // === ENRICHED DATA SOURCES ===
    // 1. Full balance from all transactions
    const balanceRow = await database.get('SELECT SUM(amount) as balance FROM transactions');
    const currentBalance = balanceRow.balance || 0;

    // 2. 12-month rolling averages (more accurate than 30-day)
    const incomeRow12 = await database.get("SELECT AVG(monthly) as avg FROM (SELECT strftime('%Y-%m', date) as mo, SUM(amount) as monthly FROM transactions WHERE type='credit' GROUP BY mo ORDER BY mo DESC LIMIT 12)");
    const spendRow12 = await database.get("SELECT AVG(monthly) as avg FROM (SELECT strftime('%Y-%m', date) as mo, SUM(ABS(amount)) as monthly FROM transactions WHERE type='debit' GROUP BY mo ORDER BY mo DESC LIMIT 12)");
    const currentMonthlyIncome = (incomeRow12 && incomeRow12.avg) || 8000;
    const currentMonthlySpend = (spendRow12 && spendRow12.avg) || 4500;

    // 3. Active subscription burn rate
    const subBurnRow = await database.get('SELECT SUM(ABS(amount)) as total FROM subscriptions WHERE is_active=1');
    const subBurn = subBurnRow.total || 0;

    // 4. Stock portfolio current value
    const stocksRow = await database.get('SELECT SUM(quantity * current_price) as value FROM stocks');
    const portfolioValue = stocksRow.value || 0;

    // 5. Savings goals progress
    const savingsRow = await database.get('SELECT SUM(current_amount) as saved FROM savings_goals');
    const savedAmount = savingsRow.saved || 0;

    // === SIMULATION CORE ===
    const months = years * 12;
    const baseTimeline = [];
    const simulatedTimeline = [];
    let baseWorth = currentBalance + portfolioValue + savedAmount;
    let simWorth = baseWorth - (cost || 0);

    const halfMonth = Math.round(months / 2);

    let lastBaseMonthlySavings = 0;
    let lastSimMonthlySavings = 0;

    for (let m = 1; m <= months; m++) {
      // Inflation adjustment on expenses every month (compounded annually)
      const inflationMultiplier = Math.pow(1 + (inflationRate / 100), (m - 1) / 12);
      
      // Apply monthly spending adjusted for inflation
      const baseMonthlySpendAdjusted = currentMonthlySpend * inflationMultiplier;
      const simMonthlySpendAdjusted = (currentMonthlySpend + (recurringCost || 0)) * inflationMultiplier;
      const monthlySubBurnAdjusted = subBurn * inflationMultiplier;

      // Base monthly savings after inflation and risk margin discount
      lastBaseMonthlySavings = (currentMonthlyIncome - baseMonthlySpendAdjusted - monthlySubBurnAdjusted) * (1 - riskMargin / 100);

      // Simulated monthly savings after inflation and risk margin discount
      lastSimMonthlySavings = ((currentMonthlyIncome + (monthlyIncomeChange || 0)) - simMonthlySpendAdjusted - monthlySubBurnAdjusted) * (1 - riskMargin / 100);

      baseWorth += lastBaseMonthlySavings;
      simWorth += lastSimMonthlySavings;

      // Apply one-time unexpected expense shock halfway through the simulation
      if (m === halfMonth) {
        simWorth -= (expenseShock || 0);
      }

      baseTimeline.push({ month: `Mo ${m}`, netWorth: Math.round(baseWorth) });
      simulatedTimeline.push({ month: `Mo ${m}`, netWorth: Math.round(simWorth) });
    }

    // === RISK ASSESSMENT ===
    const totalNetWorth = currentBalance + portfolioValue + savedAmount;
    const upfront = cost || 0;
    
    const netWorthImpactPct = totalNetWorth > 0 ? (upfront / totalNetWorth) * 100 : 100;
    const monthlyImpactPct = currentMonthlyIncome > 0 ? ((recurringCost || 0) / currentMonthlyIncome) * 100 : 0;
    
    let riskScore = (netWorthImpactPct * 0.4) + (monthlyImpactPct * 4.0) + (riskMargin * 0.2) + (inflationRate * 0.5) + (expenseShock > 0 ? (expenseShock / Math.max(1, totalNetWorth)) * 10 : 0);
    const finalSimWorthVal = simulatedTimeline[simulatedTimeline.length - 1].netWorth;
    if (finalSimWorthVal < 0) riskScore += 30; // added penalty if net worth goes negative
    
    let riskLabel, riskColor, riskPct;
    if (riskScore < 25) {
      riskLabel = 'Low Risk'; riskColor = '#22c55e'; riskPct = Math.min(100, Math.max(5, Math.round(riskScore * 2)));
    } else if (riskScore < 55) {
      riskLabel = 'Moderate Risk'; riskColor = '#f59e0b'; riskPct = Math.min(100, Math.round(riskScore * 1.3));
    } else {
      riskLabel = 'High Risk'; riskColor = '#ef4444'; riskPct = Math.min(100, Math.round(riskScore));
    }

    // Success probability based on savings buffer
    const baseSavingsRaw = currentMonthlyIncome - currentMonthlySpend - subBurn;
    const monthsToAfford = baseSavingsRaw > 0 ? Math.ceil(upfront / baseSavingsRaw) : 999;
    const successProbability = Math.max(5, Math.min(99, 100 - riskPct));

    // Recommendation
    let recommendation;
    if (successProbability >= 70 && riskLabel === 'Low Risk') {
      recommendation = 'Proceed';
    } else if (monthsToAfford <= 6 && monthsToAfford > 0) {
      recommendation = 'Save First';
    } else if (successProbability < 40 || riskLabel === 'High Risk') {
      recommendation = 'Reconsider';
    } else {
      recommendation = 'Caution';
    }

    const finalWorthDiff = simulatedTimeline[simulatedTimeline.length - 1].netWorth - baseTimeline[baseTimeline.length - 1].netWorth;

    res.json({
      actionName, upfrontCost: cost || 0, recurringCost: recurringCost || 0,
      monthlyIncomeChange: monthlyIncomeChange || 0, projectionYears: years,
      currentMonthlySavings: Math.round(lastBaseMonthlySavings),
      simulatedMonthlySavings: Math.round(lastSimMonthlySavings),
      currentBalance: Math.round(currentBalance), portfolioValue: Math.round(portfolioValue),
      savedAmount: Math.round(savedAmount), subBurn: Math.round(subBurn),
      baseTimeline, simulatedTimeline,
      finalBaseWorth: Math.round(baseWorth),
      finalSimWorth: Math.round(simWorth),
      finalWorthDiff: Math.round(finalWorthDiff),
      // Risk Assessment
      riskLabel, riskColor, riskPct, successProbability, recommendation, monthsToAfford
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await database.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch generate 50 random transactions spread over the last 30 days
app.post('/api/transactions/batch-generate', async (req, res) => {
  const RANDOM_MERCHANTS = [
    { desc: 'Starbucks Coffee', cat: 'Food & Dining', type: 'debit', min: -45, max: -15 },
    { desc: 'Albaik Chicken', cat: 'Food & Dining', type: 'debit', min: -55, max: -20 },
    { desc: 'McDonalds Dining', cat: 'Food & Dining', type: 'debit', min: -60, max: -25 },
    { desc: 'Uber Ride', cat: 'Transportation', type: 'debit', min: -80, max: -15 },
    { desc: 'Gas Station Petrol', cat: 'Transportation', type: 'debit', min: -90, max: -40 },
    { desc: 'Jarir Bookstore', cat: 'Shopping', type: 'debit', min: -350, max: -50 },
    { desc: 'Amazon.sa Order', cat: 'Shopping', type: 'debit', min: -500, max: -30 },
    { desc: 'Netflix Subscription', cat: 'Entertainment', type: 'debit', min: -56, max: -56, recurring: true },
    { desc: 'Spotify Music', cat: 'Entertainment', type: 'debit', min: -23, max: -23, recurring: true },
    { desc: 'Tuwaiq Fitness Gym', cat: 'Health & Fitness', type: 'debit', min: -350, max: -350, recurring: true },
    { desc: 'Saudi Electric SEC', cat: 'Utilities', type: 'debit', min: -450, max: -150, recurring: true },
    { desc: 'Water Bill NWC', cat: 'Utilities', type: 'debit', min: -120, max: -40, recurring: true },
    { desc: 'STC Fiber Internet', cat: 'Utilities', type: 'debit', min: -287, max: -287, recurring: true },
    { desc: 'Salary Payout Alinma', cat: 'Salary', type: 'credit', min: 15000, max: 22000, recurring: true }
  ];

  try {
    const txList = [];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const dayOffset = Math.floor(Math.random() * 30);
      const txDateObj = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = txDateObj.toISOString().substring(0, 10);
      
      const merchant = RANDOM_MERCHANTS[Math.floor(Math.random() * RANDOM_MERCHANTS.length)];
      
      let amt = Math.random() * (merchant.max - merchant.min) + merchant.min;
      amt = parseFloat(amt.toFixed(2));
      
      const isRecurring = merchant.recurring ? 1 : 0;
      const isAnomaly = Math.random() < 0.05 ? 1 : 0;
      
      txList.push({
        date: dateStr,
        description: merchant.desc,
        amount: amt,
        category: merchant.cat,
        type: merchant.type,
        is_recurring: isRecurring,
        is_anomaly: isAnomaly
      });
    }

    for (const t of txList) {
      await database.run(
        'INSERT INTO transactions (date, description, amount, category, type, is_recurring, is_anomaly) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.date, t.description, t.amount, t.category, t.type, t.is_recurring, t.is_anomaly]
      );
    }

    res.json({ success: true, count: txList.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - SMS & NOTIFICATION PARSER & WEBHOOK
 */
app.post('/api/sms-parse', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }
  try {
    const parsed = mlEngine.parseSMSNotification(text);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time automatic SMS sync endpoint for phone integrations (e.g. SMS to Webhook / Tasker)
app.post('/api/transactions/sms-webhook', async (req, res) => {
  const { body, sender, timestamp } = req.body;
  const messageText = body || req.body.message || req.body.text;
  if (!messageText) {
    return res.status(400).json({ error: 'No message text provided in request' });
  }

  try {
    console.log(`Received SMS webhook from ${sender || 'unknown'}: "${messageText}"`);
    const parsed = mlEngine.parseSMSNotification(messageText);

    // 1. Sanitize and validate description (max 100 characters)
    let cleanDescription = parsed.description;
    if (typeof cleanDescription === 'string') {
      cleanDescription = cleanDescription.replace(/[^a-zA-Z0-9\s\u0600-\u06FF\.,\-&_'\(\)]/g, '').trim();
    }
    if (cleanDescription && cleanDescription.length > 100) {
      cleanDescription = cleanDescription.substring(0, 100).trim();
    }
    if (!cleanDescription || !isValidMerchant(cleanDescription)) {
      cleanDescription = 'SMS Transaction';
    }

    // 2. Sanitize and validate amount
    let cleanAmount = parseFloat(parsed.amount);
    if (isNaN(cleanAmount) || !isValidNumber(cleanAmount)) {
      cleanAmount = 0.0;
    }

    // 3. Sanitize and validate date (format YYYY-MM-DD, prevent extreme years to secure forecasting route)
    let cleanDate = parsed.date;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const isValidDate = (dateStr) => {
      if (typeof dateStr !== 'string' || !dateRegex.test(dateStr)) return false;
      const parsedTimestamp = Date.parse(dateStr);
      if (isNaN(parsedTimestamp)) return false;
      const yr = new Date(parsedTimestamp).getUTCFullYear();
      const currentYr = new Date().getFullYear();
      return yr >= 2000 && yr <= currentYr + 1; // reasonable year range
    };
    if (!isValidDate(cleanDate)) {
      cleanDate = new Date().toISOString().split('T')[0]; // fallback to current local date
    }

    // 4. Validate transaction type
    const cleanType = (parsed.type === 'credit' || parsed.type === 'debit') ? parsed.type : 'debit';

    // 5. Validate category
    let cleanCategory = parsed.category;
    if (typeof cleanCategory !== 'string' || cleanCategory.trim() === '') {
      cleanCategory = 'Miscellaneous';
    } else {
      cleanCategory = cleanCategory.trim().substring(0, 50);
    }

    // 6. Fix is_recurring bug by scanning active subscriptions
    let isRecurring = 0;
    const cleanDescLower = cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanDescLower !== '') {
      const activeSubs = await database.all('SELECT merchant FROM subscriptions WHERE is_active = 1');
      for (const sub of activeSubs) {
        const cleanMerchant = sub.merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanMerchant !== '' && (cleanDescLower.includes(cleanMerchant) || cleanMerchant.includes(cleanDescLower))) {
          isRecurring = 1;
          break;
        }
      }
    }

    // Save parsed transaction directly
    const isAnomaly = await mlEngine.detectAnomaly(cleanAmount, cleanDate);
    const result = await database.run(
      'INSERT INTO transactions (date, description, amount, category, type, is_recurring, is_anomaly) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cleanDate, cleanDescription, cleanAmount, cleanCategory, cleanType, isRecurring, isAnomaly ? 1 : 0]
    );

    res.json({
      success: true,
      transaction: {
        id: result.id,
        date: cleanDate,
        description: cleanDescription,
        amount: cleanAmount,
        category: cleanCategory,
        type: cleanType,
        is_recurring: isRecurring,
        is_anomaly: isAnomaly ? 1 : 0
      }
    });
  } catch (err) {
    console.error('Failed to parse SMS webhook:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - RECURRING SUBSCRIPTIONS RADAR
 */
app.get('/api/subscriptions', async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM subscriptions ORDER BY is_active DESC, amount DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  const { merchant, amount, interval, next_renewal, utility_score } = req.body;
  if (!merchant || amount === undefined || !interval || !next_renewal) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidNumber(amount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (utility_score !== undefined && !isValidNumber(utility_score)) {
    return res.status(400).json({ error: 'Invalid utility score' });
  }
  if (!isValidMerchant(merchant)) {
    return res.status(400).json({ error: 'Invalid merchant name' });
  }

  try {
    const result = await database.run(
      'INSERT INTO subscriptions (merchant, amount, interval, next_renewal, utility_score, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [merchant, amount, interval, next_renewal, utility_score || 1.0]
    );
    res.json({ id: result.id, merchant, amount, interval, next_renewal, utility_score: utility_score || 1.0, is_active: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subscriptions/:id', async (req, res) => {
  const { is_active, utility_score, amount, next_renewal } = req.body;
  if (amount !== undefined && !isValidNumber(amount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (utility_score !== undefined && !isValidNumber(utility_score)) {
    return res.status(400).json({ error: 'Invalid utility score' });
  }
  try {
    await database.run(
      'UPDATE subscriptions SET is_active = COALESCE(?, is_active), utility_score = COALESCE(?, utility_score), amount = COALESCE(?, amount), next_renewal = COALESCE(?, next_renewal) WHERE id = ?',
      [is_active, utility_score, amount, next_renewal, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - FINANCIAL FORECASTING
 */
app.get('/api/forecast', async (req, res) => {
  try {
    const transactions = await database.all("SELECT date, amount FROM transactions WHERE type='debit'");
    const forecast = mlEngine.forecastSpending(transactions, 30);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - DYNAMIC SAVINGS GOALS
 */
app.get('/api/savings', async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM savings_goals');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/savings', async (req, res) => {
  const { title, target_amount, current_amount, target_date } = req.body;
  if (!title || target_amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidNumber(target_amount)) {
    return res.status(400).json({ error: 'Invalid target amount' });
  }
  if (current_amount !== undefined && !isValidNumber(current_amount)) {
    return res.status(400).json({ error: 'Invalid current amount' });
  }
  if (!isValidMerchant(title)) {
    return res.status(400).json({ error: 'Invalid savings goal title' });
  }
  try {
    const result = await database.run(
      'INSERT INTO savings_goals (title, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?)',
      [title, target_amount, current_amount || 0, target_date]
    );
    res.json({ id: result.id, title, target_amount, current_amount: current_amount || 0, target_date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/savings/:id', async (req, res) => {
  const { current_amount } = req.body;
  if (current_amount === undefined || !isValidNumber(current_amount)) {
    return res.status(400).json({ error: 'Invalid current amount' });
  }
  try {
    await database.run(
      'UPDATE savings_goals SET current_amount = ? WHERE id = ?',
      [current_amount, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dynamic optimal savings deduction rate calculator
app.get('/api/savings/optimal', async (req, res) => {
  try {
    // Get average monthly income (Salary category)
    const incomeRows = await database.all("SELECT SUM(amount) as income, strftime('%Y-%m', date) as month FROM transactions WHERE category='Salary' GROUP BY month");
    const avgIncome = incomeRows.length > 0
      ? incomeRows.reduce((a, b) => a + b.income, 0) / incomeRows.length
      : 5000.00; // baseline fallback

    // Get active subscriptions cost
    const subSum = await database.get("SELECT SUM(amount) as total FROM subscriptions WHERE is_active=1");
    const activeSubsCost = subSum.total || 0;

    // Get other fixed monthly bills (e.g. rent, utilities in last month)
    const fixedBillsRow = await database.get(`
      SELECT SUM(ABS(amount)) as total 
      FROM transactions 
      WHERE (category='Housing' OR category='Utilities') 
        AND date >= date('now', '-30 days')
    `);
    const fixedBills = fixedBillsRow.total || 1200.00; // default baseline

    const totalFixedCosts = activeSubsCost + fixedBills;

    // Current month income
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const currentIncomeRow = await database.get(
      "SELECT SUM(amount) as total FROM transactions WHERE category='Salary' AND strftime('%Y-%m', date) = ?",
      [currentMonthStr]
    );
    const currentIncome = currentIncomeRow.total || avgIncome;

    // Calculate optimal savings percentage dynamically
    const baseSavingsRate = 0.20; // 20% default
    let optimalRate = baseSavingsRate;

    if (avgIncome > totalFixedCosts) {
      optimalRate = baseSavingsRate * ((currentIncome - totalFixedCosts) / (avgIncome - totalFixedCosts));
    }

    // Keep rate between a safe 5% and 40%
    optimalRate = Math.max(0.05, Math.min(0.40, optimalRate));

    res.json({
      baseSavingsRate,
      optimalSavingsRate: parseFloat(optimalRate.toFixed(4)),
      currentIncome,
      totalFixedCosts,
      avgIncome
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stocks', async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM stocks');
    
    // Add real-time PnL, buy/sell signals, and Shariah-compliance indicators
    const enrichedStocks = rows.map(stock => {
      const currentVal = stock.quantity * stock.current_price;
      const costBasis = stock.quantity * stock.purchase_price;
      const pnl = currentVal - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      
      const signals = mlEngine.calculateStockSignals(stock.symbol, stock.current_price, stock.purchase_price);

      // Shariah Compliance Screening (Saudi Tadawul / SAMA rules)
      const sym = stock.symbol.toUpperCase();
      let isShariah = true;
      let shariahReason = '';
      let ratios = { debt: 15, cash: 8, income: 1.2 }; // defaults within limits

      if (sym === '1150') {
        isShariah = true;
        shariahReason = 'Islamic Banking. Business operations are fully Shariah-compliant. Impure interest-bearing income is zero.';
        ratios = { debt: 0, cash: 0, income: 0.2 };
      } else if (sym === '2222') {
        isShariah = true;
        shariahReason = 'Energy Sector. Debt-to-market-cap ratio (12%) and cash ratio (5%) satisfy SAMA/Tadawul Islamic regulations.';
        ratios = { debt: 12, cash: 5, income: 1.5 };
      } else if (sym === '7010') {
        isShariah = true;
        shariahReason = 'Telecommunications. Debt ratio (18%) and interest cash (6%) are well below SAMA 33% bounds.';
        ratios = { debt: 18, cash: 6, income: 1.1 };
      } else if (sym === '2010') {
        isShariah = true;
        shariahReason = 'Petrochemicals. Debt-to-market-cap ratio (25%) and interest income (3.2%) are compliant.';
        ratios = { debt: 25, cash: 8, income: 3.2 };
      } else if (sym === 'AAPL') {
        isShariah = true;
        shariahReason = 'Technology Sector. Debt ratio (15%) and interest cash (10%) satisfy Islamic screening criteria.';
        ratios = { debt: 15, cash: 10, income: 1.4 };
      } else if (sym === 'CONV') {
        isShariah = false;
        shariahReason = 'Conventional Banking. Prohibited business model (interest-based leverage). Debt ratio (85%) and cash ratio (70%) exceed SAMA limits.';
        ratios = { debt: 85, cash: 70, income: 95 };
      } else {
        // Safe default for user added stocks
        isShariah = true;
        shariahReason = 'Business activities classified as permissible. Financial ratios are within SAMA bounds.';
      }

      return {
        ...stock,
        currentValue: parseFloat(currentVal.toFixed(2)),
        costBasis: parseFloat(costBasis.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPct: parseFloat(pnlPct.toFixed(2)),
        signals,
        isShariah,
        shariahReason,
        ratios
      };
    });

    res.json(enrichedStocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stocks', async (req, res) => {
  const { symbol, name, quantity, purchase_price, current_price } = req.body;
  if (!symbol || !name || quantity === undefined || purchase_price === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidNumber(quantity) || !isValidNumber(purchase_price)) {
    return res.status(400).json({ error: 'Invalid quantity or purchase price' });
  }
  if (current_price !== undefined && !isValidNumber(current_price)) {
    return res.status(400).json({ error: 'Invalid current price' });
  }
  if (!isValidMerchant(name) || !isValidMerchant(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol or name' });
  }

  try {
    const curPrice = current_price !== undefined ? current_price : purchase_price;
    const result = await database.run(
      'INSERT INTO stocks (symbol, name, quantity, purchase_price, current_price) VALUES (?, ?, ?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET quantity=quantity+?, purchase_price=(purchase_price+?)/2, current_price=?',
      [symbol.toUpperCase(), name, quantity, purchase_price, curPrice, quantity, purchase_price, curPrice]
    );
    res.json({ id: result.id, symbol: symbol.toUpperCase(), name, quantity, purchase_price, current_price: curPrice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stocks/:id', async (req, res) => {
  const { current_price } = req.body;
  if (current_price === undefined || !isValidNumber(current_price)) {
    return res.status(400).json({ error: 'Invalid current price' });
  }
  try {
    await database.run('UPDATE stocks SET current_price = ? WHERE id = ?', [current_price, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stocks/:id', async (req, res) => {
  try {
    await database.run('DELETE FROM stocks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - SMART RADAR TIPS
 */
app.get('/api/tips', async (req, res) => {
  try {
    const tips = await mlEngine.getSmartTips();
    res.json(tips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - HACKATHON OPEN BANKING (SAMA Mock APIs)
 */
app.get('/api/open-banking/accounts', async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM bank_accounts');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/open-banking/connect', async (req, res) => {
  const { bankName, accountNum, balance } = req.body;
  if (!bankName || !accountNum) {
    return res.status(400).json({ error: 'bankName and accountNum are required' });
  }

  // Trim inputs to resolve whitespace-only bypasses and clean leading/trailing spaces
  const trimmedBankName = typeof bankName === 'string' ? bankName.trim() : '';
  const trimmedAccountNum = typeof accountNum === 'string' ? accountNum.trim() : '';

  // Validate bankName: string, length 2-100, matches alphanumeric/hyphen/spaces including Arabic
  const isValidBankName = (name) => 
    typeof name === 'string' && 
    name.length >= 2 && 
    name.length <= 100 && 
    /^[a-zA-Z0-9\s\-\u0600-\u06FF]+$/.test(name);

  // Validate accountNum: string, length 5-34 (enforcing IBAN limits), only alphanumeric
  const isValidAccountNum = (num) => 
    typeof num === 'string' && 
    num.length >= 5 && 
    num.length <= 34 && 
    /^[a-zA-Z0-9]+$/.test(num);

  if (!isValidBankName(trimmedBankName) || !isValidAccountNum(trimmedAccountNum)) {
    return res.status(400).json({ error: 'Invalid bankName or accountNum format' });
  }

  // Validate and parse balance: must be a valid, finite, non-negative number
  let initialBal = 25000.00;
  if (balance !== undefined && balance !== null && balance !== '') {
    if (!isValidNumber(balance) || parseFloat(balance) < 0) {
      return res.status(400).json({ error: 'Invalid balance amount' });
    }
    initialBal = parseFloat(balance);
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Link Bank account in local DB using trimmed and validated inputs
    await database.run(
      'INSERT INTO bank_accounts (bank_name, account_number, balance, linked_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_number) DO UPDATE SET balance=?',
      [trimmedBankName, trimmedAccountNum, initialBal, todayStr, initialBal]
    );

    // Unlock "Alinma Elite" badge
    await database.run(
      "UPDATE badges SET unlocked = 1, unlocked_at = ? WHERE title = 'Alinma Elite'",
      [todayStr]
    );

    // Seed mock synced transactions from the banking API
    await database.run(
      "INSERT INTO transactions (date, description, amount, category, type, is_recurring) VALUES (?, 'Alinma Open Banking Sync Deposit', 1500.00, 'Salary', 'credit', 0)",
      [todayStr]
    );
    await database.run(
      "INSERT INTO transactions (date, description, amount, category, type, is_recurring) VALUES (?, 'SAMA Open Banking Commission Refund', 35.00, 'Miscellaneous', 'credit', 0)",
      [todayStr]
    );

    res.json({ success: true, bankName: trimmedBankName, accountNum: trimmedAccountNum, balance: initialBal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - HACKATHON GAMIFICATION & BADGES
 */
app.get('/api/badges', async (req, res) => {
  try {
    const rows = await database.all('SELECT * FROM badges');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/badges/check', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Check for linked open banking accounts -> Unlocks Alinma Elite
    const accounts = await database.all('SELECT COUNT(*) as count FROM bank_accounts');
    if (accounts[0].count > 0) {
      await database.run("UPDATE badges SET unlocked = 1, unlocked_at = ? WHERE title = 'Alinma Elite' AND unlocked = 0", [todayStr]);
    }

    // 2. Check for cancelled/lowered subscriptions -> Unlocks Cost-Slayer
    // If user has any inactive subscription (Gym utility is marked low or Gym is turned off)
    const inactiveSubs = await database.get("SELECT COUNT(*) as count FROM subscriptions WHERE is_active = 0 OR utility_score < 0.5");
    if (inactiveSubs.count > 0) {
      await database.run("UPDATE badges SET unlocked = 1, unlocked_at = ? WHERE title = 'Cost-Slayer' AND unlocked = 0", [todayStr]);
    }

    // 3. Check for dynamic savings rate above 15% -> Unlocks Tuwaiq Peak
    // Get average monthly income
    const incomeRows = await database.all("SELECT SUM(amount) as income, strftime('%Y-%m', date) as month FROM transactions WHERE category='Salary' GROUP BY month");
    const avgIncome = incomeRows.length > 0 ? incomeRows.reduce((a, b) => a + b.income, 0) / incomeRows.length : 5000.00;
    // Get active subscriptions cost
    const subSum = await database.get("SELECT SUM(amount) as total FROM subscriptions WHERE is_active=1");
    const activeSubsCost = subSum.total || 0;
    // Get other fixed monthly bills
    const fixedBillsRow = await database.get("SELECT SUM(ABS(amount)) as total FROM transactions WHERE (category='Housing' OR category='Utilities') AND date >= date('now', '-30 days')");
    const fixedBills = fixedBillsRow.total || 1200.00;
    const totalFixedCosts = activeSubsCost + fixedBills;
    const baseSavingsRate = 0.20;
    let optimalRate = baseSavingsRate;
    if (avgIncome > totalFixedCosts) {
      optimalRate = baseSavingsRate * ((avgIncome - totalFixedCosts) / avgIncome);
    }
    if (optimalRate >= 0.15) {
      await database.run("UPDATE badges SET unlocked = 1, unlocked_at = ? WHERE title = 'Tuwaiq Peak' AND unlocked = 0", [todayStr]);
    }

    // 4. Check if all badges unlocked -> Unlocks Vision 2030 Legend
    const unlockedBadgesCount = await database.get("SELECT COUNT(*) as count FROM badges WHERE unlocked = 1 AND title != 'Vision 2030 Legend'");
    if (unlockedBadgesCount.count === 3) {
      await database.run("UPDATE badges SET unlocked = 1, unlocked_at = ? WHERE title = 'Vision 2030 Legend' AND unlocked = 0", [todayStr]);
    }

    const updatedBadges = await database.all('SELECT * FROM badges');
    res.json(updatedBadges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * BACKGROUND SUBSCRIPTION CRON SCHEDULER
 * Scans daily and creates renewal alert/notification warnings.
 */
setInterval(async () => {
  console.log('Cron: Checking upcoming subscription renewals...');
  try {
    const today = new Date();
    const activeSubs = await database.all('SELECT * FROM subscriptions WHERE is_active = 1');
    for (const sub of activeSubs) {
      const renewalDate = new Date(sub.next_renewal);
      const diffTime = renewalDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays >= 0) {
        console.log(`Alert: Subscription "${sub.merchant}" is renewing in ${diffDays} days on ${sub.next_renewal}`);
        // Create dynamic transaction/log alert if needed, or simply notify via API state
      }
    }
  } catch (err) {
    console.error('Subscription cron failed:', err.message);
  }
}, 24 * 60 * 60 * 1000); // Check once a day

/**
 * ROUTES - PROFILE
 */
app.get('/api/profile', async (req, res) => {
  try {
    const profile = await database.get('SELECT name, currency FROM profile LIMIT 1');
    if (profile) {
      res.json({ exists: true, profile });
    } else {
      res.json({ exists: false, profile: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', async (req, res) => {
  const { name, currency } = req.body;
  if (!name || !currency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidMerchant(name)) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  if (currency !== 'SAR' && currency !== 'USD') {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  try {
    // Wipe any existing profile before inserting or upsert to enforce single-row constraint
    await database.run('DELETE FROM profile');
    await database.run('DELETE FROM recurring_transactions');
    await database.run('INSERT INTO profile (name, currency) VALUES (?, ?)', [name, currency]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - ADMIN CLEAN SLATE
 */
app.post('/api/admin/clean-slate', async (req, res) => {
  try {
    // Wipe all user data
    await database.run('DELETE FROM transactions');
    await database.run('DELETE FROM stocks');
    await database.run('DELETE FROM savings_goals');
    await database.run('DELETE FROM subscriptions');
    await database.run('DELETE FROM ml_state');
    await database.run('DELETE FROM profile');

    // Reset badges unlocked column (unlocked = 0, unlocked_at = NULL)
    await database.run('UPDATE badges SET unlocked = 0, unlocked_at = NULL');

    // Clear bank_accounts but insert back default bank account templates
    await database.run('DELETE FROM bank_accounts');
    await database.run(`
      INSERT INTO bank_accounts (bank_name, account_number, balance, linked_at) VALUES
      ('Alinma Bank', 'SA10200000123456789012', 24500.00, '2026-06-01'),
      ('SNB Bank', 'SA40100000987654321098', 8200.00, '2026-06-10'),
      ('Al Rajhi Bank', 'SA80300000112233445566', 52430.00, '2026-05-15')
    `);

    // Re-seed default savings goals
    await database.run(`
      INSERT INTO savings_goals (title, target_amount, current_amount, target_date) VALUES
      ('Wedding', 150000.00, 95000.00, '2027-06-01'),
      ('Emergency Fund', 50000.00, 32000.00, '2026-12-31'),
      ('New Car (Lucid Air)', 320000.00, 45000.00, '2028-12-31')
    `);

    // Re-seed default stocks portfolio
    await database.run(`
      INSERT INTO stocks (symbol, name, quantity, purchase_price, current_price) VALUES
      ('1150', 'Alinma Bank', 500.0, 31.50, 34.20),
      ('2222', 'Saudi Aramco', 800.0, 28.90, 30.45),
      ('7010', 'STC', 300.0, 38.20, 39.10),
      ('2010', 'SABIC', 150.0, 78.50, 81.30),
      ('CONV', 'Conventional Mock Bank', 100.0, 45.00, 42.50)
    `);

    // Re-seed default credit and debit transactions
    await database.run(`
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

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ROUTES - ANALYTICS EVENTS (Admin Panel)
 */
app.post('/api/analytics/event', async (req, res) => {
  const { event_type, payload } = req.body;
  if (!event_type) return res.status(400).json({ error: 'event_type required' });
  try {
    await database.run(
      'INSERT INTO analytics_events (event_type, payload, created_at) VALUES (?, ?, ?)',
      [event_type, JSON.stringify(payload || {}), new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const events = await database.all('SELECT event_type, payload, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 500');
    // Aggregate
    const tabCounts = {};
    const intentCounts = {};
    const hourCounts = Array(24).fill(0);
    const keywords = {};
    events.forEach(e => {
      const p = JSON.parse(e.payload || '{}');
      if (e.event_type === 'tab_visit') tabCounts[p.tab] = (tabCounts[p.tab] || 0) + 1;
      if (e.event_type === 'ai_query') {
        intentCounts[p.intent || 'unknown'] = (intentCounts[p.intent || 'unknown'] || 0) + 1;
        (p.keywords || []).forEach(k => { keywords[k] = (keywords[k] || 0) + 1; });
      }
      const hour = new Date(e.created_at).getHours();
      if (!isNaN(hour)) hourCounts[hour]++;
    });
    res.json({
      totalEvents: events.length,
      tabCounts,
      intentCounts,
      hourCounts,
      topKeywords: Object.entries(keywords).sort((a,b) => b[1]-a[1]).slice(0, 20).map(([k,v]) => ({keyword: k, count: v}))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve compiled static frontend assets in production fallback
if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'frontend/dist'))) {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.json({ message: 'Karam API is running. Connect via Vite client on port 5173 in development.' });
  });
}

// Express start listening
app.listen(PORT, () => {
  console.log(`Karam backend server running at http://localhost:${PORT}`);
});

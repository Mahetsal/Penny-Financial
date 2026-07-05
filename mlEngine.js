const db = require('./database');
const http = require('http');

/**
 * 1. NAIVE BAYES TRANSACTION CLASSIFIER
 */
class NaiveBayesClassifier {
  constructor() {
    this.categories = new Set();
    this.docCount = {};
    this.totalDocs = 0;
    this.wordCount = {};
    this.wordCountPerCat = {};
    this.vocabulary = new Set();
  }

  // Basic Tokenizer
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 1 && !this.isStopWord(token));
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'a', 'of', 'to', 'for', 'in', 'on', 'at', 'with', 'from', 'by', 'an', 'is', 'this', 'that',
      'bill', 'payment', 'pay', 'txn', 'transaction', 'purchase', 'card', 'spent', 'online', 'store', 'merchant',
      'debit', 'credit', 'amount', 'balance', 'bal', 'date', 'monthly', 'weekly', 'yearly', 'annual', 'fee', 'charge'
    ]);
    return stopWords.has(word);
  }

  // Pre-seed the model with basic financial data
  seed() {
    this.categories = new Set();
    this.docCount = {};
    this.totalDocs = 0;
    this.wordCount = {};
    this.wordCountPerCat = {};
    this.vocabulary = new Set();

    const trainingData = [
      { text: 'Walmart Target Costco groceries supermarket food whole foods market kroger shoprite aldi', category: 'Food & Dining' },
      { text: 'Uber Lyft Taxi Subway Transit Rail bus ticket gas shell chevron petrol fuel Exxon Mobil ride commute cab fare commuter drive flight travel', category: 'Transportation' },
      { text: 'Netflix Spotify Youtube Premium HBO Disney gym membership fitness club concert theater cinema hulu paramount', category: 'Entertainment' },
      { text: 'Rent mortgage apartment lease housing maintenance homedepot depot IKEA furniture landlord real estate', category: 'Housing' },
      { text: 'Electric bill water power gas waste utility Comcast AT&T Internet Verizon wifi broadband cellular tmobile mobile bill', category: 'Utilities' },
      { text: 'Amazon eBay shopping clothes Nike Zara shoes Macy Nordstrom retail store gift walmart target costco buying online checkout', category: 'Shopping' },
      { text: 'Salary deposit paycheck payroll direct deposit transfer bonus dividend income earnings payout', category: 'Salary' },
      { text: 'Robinhood ETrade Fidelity stock investment crypto bitcoin buying assets portfolio index fund trade brokerage', category: 'Investment' },
      { text: 'Pharmacy CVS Walgreens hospital doctor clinic dentist medicine prescription health care insurance medical wellness optometry', category: 'Health & Fitness' }
    ];

    for (const item of trainingData) {
      this.train(item.text, item.category);
    }

    // Programmatically train 10,800+ data samples for high-precision transaction classification
    const categoriesKeywords = {
      'Food & Dining': ['restaurant', 'cafe', 'coffee', 'kitchen', 'grill', 'bakery', 'market', 'foods', 'pizza', 'burger', 'sushi', 'diner', 'bistro', 'steakhouse', 'donut', 'starbucks', 'mcdonalds', 'kfc', 'subway', 'dunkin', 'walmart', 'costco', 'target', 'groceries', 'supermarket', 'aldi', 'whole foods'],
      'Transportation': ['taxi', 'cab', 'ride', 'uber', 'lyft', 'transit', 'metro', 'subway', 'bus', 'train', 'flight', 'airline', 'airways', 'gas', 'fuel', 'petrol', 'chevron', 'shell', 'exxon', 'mobil'],
      'Entertainment': ['netflix', 'spotify', 'disney', 'hulu', 'hbo', 'youtube', 'gym', 'fitness', 'cinema', 'theater', 'club', 'games', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'concert', 'stadium'],
      'Housing': ['mortgage', 'rent', 'lease', 'apartment', 'realty', 'home', 'depot', 'ikea', 'furniture', 'landlord', 'maintenance', 'hoa', 'property', 'living', 'suites'],
      'Utilities': ['electric', 'water', 'power', 'gas', 'comcast', 'verizon', 'att', 'telecom', 'mobile', 'internet', 'broadband', 'wifi', 'cellular', 'utility', 'energy'],
      'Shopping': ['amazon', 'ebay', 'nike', 'adidas', 'zara', 'h&m', 'nordstrom', 'macys', 'retail', 'outlet', 'mall', 'boutique', 'fashion', 'goods', 'store', 'shop'],
      'Salary': ['salary', 'payroll', 'paycheck', 'dividend', 'interest', 'bonus', 'earnings', 'payout', 'employer', 'direct deposit', 'income', 'transfer'],
      'Investment': ['robinhood', 'etrade', 'fidelity', 'vanguard', 'schwab', 'coinbase', 'crypto', 'bitcoin', 'stock', 'share', 'bond', 'brokerage', 'assets', 'invest', 'portfolio'],
      'Health & Fitness': ['cvs', 'walgreens', 'pharmacy', 'hospital', 'clinic', 'dentist', 'doctor', 'physician', 'medical', 'dental', 'vision', 'health', 'insurance', 'care', 'wellness']
    };

    const branches = ['branch', 'store', 'outlet', 'express', 'station', 'location', 'sub', 'center', 'mart', 'market'];

    for (const [category, keywords] of Object.entries(categoriesKeywords)) {
      for (const kw of keywords) {
        for (let i = 1; i <= 80; i++) {
          const branch = branches[i % branches.length];
          const text = `${kw} ${branch} ${i}`;
          this.train(text, category);
        }
      }
    }
  }

  train(text, category) {
    const tokens = this.tokenize(text);
    this.categories.add(category);
    this.docCount[category] = (this.docCount[category] || 0) + 1;
    this.totalDocs += 1;

    if (!this.wordCountPerCat[category]) {
      this.wordCountPerCat[category] = 0;
    }

    for (const token of tokens) {
      this.vocabulary.add(token);
      if (!this.wordCount[token]) {
        this.wordCount[token] = {};
      }
      this.wordCount[token][category] = (this.wordCount[token][category] || 0) + 1;
      this.wordCountPerCat[category] += 1;
    }
  }

  classify(text) {
    const tokens = this.tokenize(text);
    if (tokens.length === 0 || this.totalDocs === 0) {
      return 'Miscellaneous';
    }

    let bestCategory = 'Miscellaneous';
    let maxScore = -Infinity;

    for (const category of this.categories) {
      // Prior probability log P(C)
      let score = Math.log(this.docCount[category] / this.totalDocs);

      // Word likelihood log P(W|C)
      for (const token of tokens) {
        const count = (this.wordCount[token] && this.wordCount[token][category]) || 0;
        // Laplace smoothing
        const likelihood = (count + 1) / (this.wordCountPerCat[category] + this.vocabulary.size);
        score += Math.log(likelihood);
      }

      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  // Load from DB
  async load() {
    try {
      const row = await db.get("SELECT value FROM ml_state WHERE key = 'naive_bayes_model'");
      if (row) {
        const state = JSON.parse(row.value);
        this.categories = new Set(state.categories);
        this.docCount = state.docCount;
        this.totalDocs = state.totalDocs;
        this.wordCount = state.wordCount;
        this.wordCountPerCat = state.wordCountPerCat;
        this.vocabulary = new Set(state.vocabulary);
      } else {
        this.seed();
        await this.save();
      }
    } catch (err) {
      console.error('Failed to load classifier state, seeding default:', err.message);
      this.seed();
    }
  }

  // Save to DB
  async save() {
    const state = {
      categories: Array.from(this.categories),
      docCount: this.docCount,
      totalDocs: this.totalDocs,
      wordCount: this.wordCount,
      wordCountPerCat: this.wordCountPerCat,
      vocabulary: Array.from(this.vocabulary)
    };
    await db.run(
      "INSERT OR REPLACE INTO ml_state (key, value) VALUES ('naive_bayes_model', ?)",
      [JSON.stringify(state)]
    );
  }
}

const classifier = new NaiveBayesClassifier();

// Initialize classifier
classifier.load();

/**
 * 2. SMS & BANK NOTIFICATION PARSER
 */
function parseSMSNotification(smsText) {
  const text = smsText.trim();
  let type = 'debit';
  let amount = 0;
  let merchant = 'Unknown Merchant';
  let balance = null;
  let date = new Date().toISOString().split('T')[0];

  // Try to determine transaction type (Bilingual support)
  const creditKeywords = /credit|credited|received|deposit|deposited|refund|إيداع|تم إيداع|دخل|مقبوضات/i;
  const debitKeywords = /debit|debited|spent|purchase|paid|withdrew|withdrawn|charged|خصم|شراء|سحب|مصروف/i;

  if (creditKeywords.test(text) && !debitKeywords.test(text)) {
    type = 'credit';
  }

  // Extract amount
  // e.g. "USD 120.50", "$15.00", "50.00 AED", "45.00 ريال", "120.00 SAR"
  const amountRegex = /(?:USD|AED|EUR|GBP|EGP|Rs\.?|\$|SAR|ريال|ريالاً)\s*([\d,]+\.?\d*)|([\d,]+\.?\d*)\s*(?:USD|AED|EUR|GBP|EGP|Rs\.?|\$|SAR|ريال|ريالاً)/i;
  const matchAmount = text.match(amountRegex);
  if (matchAmount) {
    const rawVal = matchAmount[1] || matchAmount[2];
    amount = parseFloat(rawVal.replace(/,/g, ''));
  }

  // Extract merchant (Bilingual triggers: at, to, in, from, لدى, في, من)
  const merchantRegex = /(?:at|to|in|from|store|merchant|payee|لدى|في|من)\s+([A-Za-z0-9\u0600-\u06FF\s'&.-]{2,30})/i;
  const matchMerchant = text.match(merchantRegex);
  if (matchMerchant) {
    merchant = matchMerchant[1].trim();
    // Clean up trailing prepositions or filler words
    merchant = merchant.replace(/\s+(on|date|bal|balance|with|available|في|بتاريخ|الرصيد|رصيد).*/i, '').trim();
  }

  // Extract balance (Bilingual triggers: bal, balance, الرصيد, رصيد)
  const balanceRegex = /(?:bal|balance|avail\s+bal|الرصيد|رصيد)(?:\s+is|\:)?\s*(?:USD|AED|EUR|GBP|EGP|Rs\.?|\$|SAR|ريال|ريالاً)?\s*([\d,]+\.?\d*)/i;
  const matchBalance = text.match(balanceRegex);
  if (matchBalance) {
    balance = parseFloat(matchBalance[1].replace(/,/g, ''));
  }

  // Extract date if mentioned (e.g. "on 22-06-2026", "date 2026/05/12", "بتاريخ 24-06-2026")
  const dateRegex = /(?:on|date|بتاريخ|في)\s+([\d/-]{8,10})/i;
  const matchDate = text.match(dateRegex);
  if (matchDate) {
    const rawDate = matchDate[1];
    const parts = rawDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY
        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // Automatically classify using our local classifier
  const category = classifier.classify(merchant);

  return {
    date,
    description: merchant,
    amount: type === 'debit' ? -amount : amount,
    category,
    type,
    balance
  };
}

/**
 * 3. TIME-SERIES FORECASTER (Holt-Linear Double Exponential Smoothing)
 */
function forecastSpending(transactions, daysToForecast = 30) {
  // Aggregate transactions by date to get daily spend
  const dailySpend = {};
  const debits = transactions.filter(t => t.amount < 0);
  
  if (debits.length < 5) {
    return { forecast: [], message: 'Insufficient data for projection' };
  }

  debits.forEach(t => {
    const d = t.date;
    dailySpend[d] = (dailySpend[d] || 0) + Math.abs(t.amount);
  });

  const sortedDates = Object.keys(dailySpend).sort();
  const series = sortedDates.map(d => dailySpend[d]);

  // Parameters
  const alpha = 0.2;
  const beta = 0.15;

  let level = series[0];
  let trend = series[1] - series[0];

  for (let i = 1; i < series.length; i++) {
    const prevLevel = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Forecast future days
  const forecasts = [];
  const lastDateStr = sortedDates[sortedDates.length - 1];
  let lastDate = new Date(lastDateStr);

  for (let h = 1; h <= daysToForecast; h++) {
    lastDate.setDate(lastDate.getDate() + 1);
    const dateStr = lastDate.toISOString().split('T')[0];
    const val = Math.max(0, level + h * trend);
    forecasts.push({ date: dateStr, amount: parseFloat(val.toFixed(2)) });
  }

  return forecasts;
}

/**
 * 4. SPENDING ANOMALY DETECTION (Z-Score)
 */
async function detectAnomaly(amount, date) {
  // Fetch historical daily spending totals
  const dailyTotals = await db.all(`
    SELECT date, SUM(ABS(amount)) as total 
    FROM transactions 
    WHERE type = 'debit' 
    GROUP BY date
  `);

  if (dailyTotals.length < 7) {
    return false; // Not enough history to establish baseline
  }

  const totals = dailyTotals.map(d => d.total);
  const n = totals.length;
  const mean = totals.reduce((a, b) => a + b, 0) / n;
  const variance = totals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return false;

  const currentSpend = Math.abs(amount);
  const zScore = (currentSpend - mean) / stdDev;

  // Trigger alert if spending is 1.2x standard deviations above rolling average
  return zScore > 1.2;
}

/**
 * 5. SMART STOCK SIGNAL GENERATOR
 */
function calculateStockSignals(symbol, currentPrice, purchasePrice) {
  // Simulate standard technical indicators: RSI, SMA crossover, and mock news sentiment
  // Mock recent historical 15 days price sequence based on a random walk
  const priceHistory = [];
  let tempPrice = currentPrice * 0.95; // start lower
  for (let i = 0; i < 15; i++) {
    tempPrice = tempPrice * (1 + (Math.random() * 0.04 - 0.02)); // walk -2% to +2%
    priceHistory.push(tempPrice);
  }
  priceHistory.push(currentPrice); // today

  // 1. Calculate Simple Moving Average (SMA-5 vs SMA-15)
  const sma5 = priceHistory.slice(-5).reduce((a,b) => a+b, 0) / 5;
  const sma15 = priceHistory.slice(-15).reduce((a,b) => a+b, 0) / 15;
  const smaSignal = sma5 > sma15 ? 'buy' : 'sell';

  // 2. Calculate simple RSI (Relative Strength Index)
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < priceHistory.length; i++) {
    const diff = priceHistory[i] - priceHistory[i-1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const rs = losses === 0 ? 100 : gains / losses;
  const rsi = 100 - (100 / (1 + rs));
  let rsiSignal = 'hold';
  if (rsi < 30) rsiSignal = 'buy';      // Oversold (Buy signal)
  if (rsi > 70) rsiSignal = 'sell';     // Overbought (Sell signal)

  // 3. Mock News Ingestion & Local NLP Sentiment Analysis
  const newsList = [
    { title: `${symbol} beats quarterly earnings estimate, projections surge`, sentiment: 0.8 },
    { title: `Analysts upgrade outlook on ${symbol} citing product demand`, sentiment: 0.7 },
    { title: `Regulatory challenges flag caution for ${symbol} stock performance`, sentiment: -0.4 },
    { title: `Supply chain bottlenecks expected to weigh down ${symbol} revenue`, sentiment: -0.6 },
    { title: `${symbol} announces new AI-powered product lineup for consumers`, sentiment: 0.9 }
  ];
  // Select a random mock news article
  const newsIdx = Math.floor(Math.random() * newsList.length);
  const selectedNews = newsList[newsIdx];

  // Score signal: combine RSI, SMA and Sentiment
  let buyScore = 0;
  if (smaSignal === 'buy') buyScore += 2;
  if (rsiSignal === 'buy') buyScore += 3;
  if (rsiSignal === 'sell') buyScore -= 3;
  buyScore += selectedNews.sentiment * 3;

  let signal = 'HOLD';
  let confidence = 'Medium';
  if (buyScore > 1.5) {
    signal = 'BUY';
    confidence = buyScore > 4 ? 'High' : 'Medium';
  } else if (buyScore < -1.5) {
    signal = 'SELL';
    confidence = buyScore < -4 ? 'High' : 'Medium';
  }

  return {
    symbol,
    signal,
    confidence,
    rsi: Math.round(rsi),
    sma5: parseFloat(sma5.toFixed(2)),
    sma15: parseFloat(sma15.toFixed(2)),
    headline: selectedNews.title,
    sentiment: selectedNews.sentiment
  };
}

/**
 * 6. MONEY LEAK RADAR & OFFLINE DAILY RECOMMENDATIONS
 */
async function generateDailyTips() {
  const tips = [];
  const trans = await db.all("SELECT * FROM transactions WHERE type='debit' ORDER BY date DESC");
  const subs = await db.all("SELECT * FROM subscriptions WHERE is_active=1");

  // Leak Check 1: Inactive/Low-Utility Subscriptions
  const lowUtility = subs.filter(s => s.utility_score < 0.5);
  if (lowUtility.length > 0) {
    tips.push({
      type: 'warning',
      category: 'Subscription Radar',
      title: 'Low Utility Subscription detected',
      message: `Your subscription to "${lowUtility[0].merchant}" (${lowUtility[0].amount} USD/mo) is flagged with low utility score (${lowUtility[0].utility_score}). Consider cancelling it to save funds.`
    });
  }

  // Leak Check 2: High food spending
  const totalSpend = trans.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const foodSpend = trans.filter(t => t.category === 'Food & Dining').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  if (totalSpend > 0 && (foodSpend / totalSpend) > 0.3) {
    const pct = Math.round((foodSpend / totalSpend) * 100);
    tips.push({
      type: 'tip',
      category: 'Smart Expense Analysis',
      title: 'High Dining/Grocery Spending',
      message: `Your food and dining expenses comprise ${pct}% of your total spending. Cooking at home twice more per week could save up to $150/month.`
    });
  }

  // Leak Check 3: Recurring Merchant Spikes
  const merchantCounts = {};
  trans.forEach(t => {
    merchantCounts[t.description] = (merchantCounts[t.description] || 0) + 1;
  });
  const frequentMerchant = Object.keys(merchantCounts).find(m => merchantCounts[m] > 5 && m.toLowerCase().includes('starbucks'));
  if (frequentMerchant) {
    tips.push({
      type: 'leak',
      category: 'Money Leak Radar',
      title: 'Frequent Micro-Transactions',
      message: `You visited ${frequentMerchant} frequently. Cutting back on micro-transactions can save about $50/month.`
    });
  }

  // Base Fallback Tip
  tips.push({
    type: 'tip',
    category: 'Dynamic Savings Goals',
    title: 'Automated Micro-Savings',
    message: 'Try rounding up your transportation transactions and transferring the excess to your Emergency Fund savings goal.'
  });

  return tips;
}

// Quick wrapper to return local tips directly without any Ollama queries
async function getSmartTips() {
  return generateDailyTips();
}

module.exports = {
  classifier,
  parseSMSNotification,
  forecastSpending,
  detectAnomaly,
  calculateStockSignals,
  generateDailyTips,
  getSmartTips
};

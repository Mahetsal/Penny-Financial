const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        body: { error: err.message }
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function audit() {
  console.log('=== STARTING SECURITY & INPUT VALIDATION AUDIT ===\n');

  // --- 1. POST /api/transactions ---
  console.log('--- Endpoint: POST /api/transactions ---');
  
  // A. Empty / Missing fields
  let r = await request('POST', '/api/transactions', {});
  console.log('Empty Payload:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // B. Invalid Amount Type (object)
  r = await request('POST', '/api/transactions', {
    date: '2026-06-28',
    description: 'Starbucks',
    amount: { val: 45.00 },
    type: 'debit'
  });
  console.log('Amount as Object:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // C. Invalid Amount Type (non-numeric string)
  r = await request('POST', '/api/transactions', {
    date: '2026-06-28',
    description: 'Starbucks',
    amount: 'forty-five',
    type: 'debit'
  });
  console.log('Amount as Non-numeric string:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // D. Negative Amount
  r = await request('POST', '/api/transactions', {
    date: '2026-06-28',
    description: 'Starbucks',
    amount: -45.00,
    type: 'debit'
  });
  console.log('Negative Amount:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 200); // Negative is accepted because it\'s a valid number

  // E. SQL Injection in Description
  r = await request('POST', '/api/transactions', {
    date: '2026-06-28',
    description: "Starbucks; DROP TABLE transactions; --",
    amount: 15.00,
    type: 'debit'
  });
  console.log('SQL Injection in Description:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400); // Blocked by isValidMerchant

  // F. Arabic Character Support
  r = await request('POST', '/api/transactions', {
    date: '2026-06-28',
    description: "جرير مكتبة",
    amount: 350.00,
    type: 'debit'
  });
  console.log('Arabic Description:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 200); // Allowed

  // --- 2. POST /api/subscriptions ---
  console.log('\n--- Endpoint: POST /api/subscriptions ---');
  
  // A. Missing fields
  r = await request('POST', '/api/subscriptions', { merchant: 'Netflix' });
  console.log('Missing fields:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // B. SQL Injection in Merchant name
  r = await request('POST', '/api/subscriptions', {
    merchant: "Netflix'; DELETE FROM subscriptions; --",
    amount: 56.00,
    interval: 'monthly',
    next_renewal: '2026-07-01'
  });
  console.log('SQL Injection in Merchant:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // C. Invalid utility score type
  r = await request('POST', '/api/subscriptions', {
    merchant: "Spotify Premium",
    amount: 23.00,
    interval: 'monthly',
    next_renewal: '2026-07-01',
    utility_score: 'high'
  });
  console.log('Invalid utility score:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // --- 3. POST /api/savings ---
  console.log('\n--- Endpoint: POST /api/savings ---');

  // A. Missing target_amount
  r = await request('POST', '/api/savings', { title: 'New Car' });
  console.log('Missing target_amount:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // B. SQL Injection in Goal Title
  r = await request('POST', '/api/savings', {
    title: "Car Fund'; DROP TABLE savings_goals; --",
    target_amount: 50000
  });
  console.log('SQL Injection in Title:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // --- 4. POST /api/stocks ---
  console.log('\n--- Endpoint: POST /api/stocks ---');

  // A. SQL Injection in Symbol
  r = await request('POST', '/api/stocks', {
    symbol: "AAPL'; DROP TABLE stocks; --",
    name: 'Apple Inc',
    quantity: 10,
    purchase_price: 150.00
  });
  console.log('SQL Injection in Symbol:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // B. Valid stock insertion
  r = await request('POST', '/api/stocks', {
    symbol: "AAPL",
    name: 'Apple Inc',
    quantity: 5,
    purchase_price: 175.00
  });
  console.log('Valid Stock:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 200);

  // --- 5. POST /api/open-banking/connect ---
  console.log('\n--- Endpoint: POST /api/open-banking/connect ---');

  // A. Missing Bank Name / Account
  r = await request('POST', '/api/open-banking/connect', { balance: 1000 });
  console.log('Missing bankName/accountNum:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  // B. Parameter check on bankName containing special characters
  r = await request('POST', '/api/open-banking/connect', {
    bankName: "Al Rajhi Bank; DROP TABLE bank_accounts; --",
    accountNum: "SA80300000112233445566",
    balance: 5000.00
  });
  console.log('Special characters in bankName:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400); // SQL injection is prevented, and input validation now blocks invalid characters!

  // --- 6. PUT /api/subscriptions/:id ---
  console.log('\n--- Endpoint: PUT /api/subscriptions/:id ---');

  // Get a valid subscription ID
  r = await request('GET', '/api/subscriptions');
  const subs = r.body;
  if (subs && subs.length > 0) {
    const subId = subs[0].id;
    // Test invalid amount on update
    r = await request('PUT', `/api/subscriptions/${subId}`, { amount: 'invalid-amount' });
    console.log('Invalid amount update:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 400);
  } else {
    console.log('No subscriptions found to test PUT.');
  }

  // --- 7. POST /api/sms-parse ---
  console.log('\n--- Endpoint: POST /api/sms-parse ---');
  r = await request('POST', '/api/sms-parse', {});
  console.log('Empty text body:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 400);

  r = await request('POST', '/api/sms-parse', { text: 'Debit Card txn: USD 100 spent at Amazon on 15-06-2026. Bal: USD 5000' });
  console.log('Valid SMS parsing:', r.statusCode, JSON.stringify(r.body));
  assert.strictEqual(r.statusCode, 200);

  console.log('\n=== AUDIT COMPLETED SUCCESSFULLY ===');
}

audit();

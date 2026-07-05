const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
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
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runWebhookTests() {
  console.log('=== STARTING SMS WEBHOOK ROBUSTNESS TESTS ===\n');

  try {
    // 1. Send typical Arabic AlRajhi SMS
    console.log('Testing Arabic AlRajhi SMS webhook...');
    let r = await request('POST', '/api/transactions/sms-webhook', {
      body: 'خصم مدى: 75.00 ريال لدى هاف مليون في 28-06-2026. الرصيد: 4500.00 ريال',
      sender: 'AlRajhiBank'
    });
    console.log('AlRajhi SMS response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.transaction.description, 'هاف مليون');
    assert.strictEqual(r.body.transaction.amount, -75);
    assert.strictEqual(r.body.transaction.type, 'debit');

    // 2. Send English SNB SMS
    console.log('\nTesting English SNB SMS webhook...');
    r = await request('POST', '/api/transactions/sms-webhook', {
      body: 'Debit Card Purchase: SAR 150.00 at Noon on 28-06-2026. Available Bal: SAR 5000.00',
      sender: 'SNB-Ahli'
    });
    console.log('SNB SMS response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.transaction.description, 'Noon');
    assert.strictEqual(r.body.transaction.amount, -150);
    assert.strictEqual(r.body.transaction.type, 'debit');

    // 3. Send SMS with SQL injection characters in merchant name
    console.log('\nTesting malicious SMS webhook...');
    r = await request('POST', '/api/transactions/sms-webhook', {
      body: "خصم مدى: 45.00 ريال لدى Starbucks; DROP TABLE transactions; -- في 28-06-2026",
      sender: 'AlRajhiBank'
    });
    console.log('Malicious SMS response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.success, true);
    assert.ok(!r.body.transaction.description.includes(';'), 'Semicolon should be sanitized');
    assert.ok(!r.body.transaction.description.includes('--'), 'Dashes/comments should be sanitized');
    assert.strictEqual(r.body.transaction.description, 'Starbucks');

    // 4. Send empty payload
    console.log('\nTesting empty webhook payload...');
    r = await request('POST', '/api/transactions/sms-webhook', {});
    console.log('Empty webhook response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 400);

    // 5. Send SMS where merchant name consists purely of illegal characters (regex fails to match -> defaults to 'Unknown Merchant')
    console.log('\nTesting purely special characters merchant name SMS...');
    r = await request('POST', '/api/transactions/sms-webhook', {
      body: 'Debit Card Purchase: SAR 50.00 at ;;;;; on 28-06-2026'
    });
    console.log('Purely special characters SMS response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.transaction.description, 'Unknown Merchant');

    // 6. Send completely unstructured text SMS with no merchant indicators
    console.log('\nTesting unstructured text SMS...');
    r = await request('POST', '/api/transactions/sms-webhook', {
      body: 'Hello Google DeepMind team, nice meeting you.'
    });
    console.log('Unstructured SMS response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.transaction.description, 'Unknown Merchant');

    // 7. Send SMS that matches an active subscription
    console.log('\nTesting SMS matching active subscription (Netflix)...');
    r = await request('POST', '/api/transactions/sms-webhook', {
      body: 'Debit Card Purchase: SAR 56.00 at Netflix on 28-06-2026.',
      sender: 'Netflix'
    });
    console.log('Netflix SMS response:', r.statusCode, JSON.stringify(r.body));
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.success, true);
    assert.strictEqual(r.body.transaction.description, 'Netflix');
    assert.strictEqual(r.body.transaction.is_recurring, 1);

    console.log('\n🎉 ALL SMS WEBHOOK ROBUSTNESS TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Webhook test failed:', err);
    process.exit(1);
  }
}

runWebhookTests();

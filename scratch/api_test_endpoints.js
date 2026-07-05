const assert = require('assert');
const http = require('http');
const database = require('../database');

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
          headers: res.headers,
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

async function runApiTests() {
  console.log('--- STARTING PROFILE & CLEAN SLATE API ENDPOINT TESTS ---');

  try {
    // Make sure we have a clean/known start
    await database.initDatabase();

    // 1. Test GET /api/profile
    console.log('Testing GET /api/profile...');
    const getRes1 = await request('GET', '/api/profile');
    assert.strictEqual(getRes1.statusCode, 200, 'GET /api/profile failed');
    console.log('GET /api/profile response:', getRes1.body);
    assert.ok('exists' in getRes1.body, 'Response missing exists field');

    // 2. Test POST /api/profile validations
    console.log('Testing POST /api/profile validations...');
    
    // Test missing fields
    const postErr1 = await request('POST', '/api/profile', { name: 'Only Name' });
    assert.strictEqual(postErr1.statusCode, 400, 'Should reject missing currency');
    assert.strictEqual(postErr1.body.error, 'Missing required fields');

    // Test invalid currency
    const postErr2 = await request('POST', '/api/profile', { name: 'Valid Name', currency: 'EUR' });
    assert.strictEqual(postErr2.statusCode, 400, 'Should reject EUR currency');
    assert.strictEqual(postErr2.body.error, 'Invalid currency');

    // Test SQL injection attempt in name
    const postErr3 = await request('POST', '/api/profile', { name: 'Test; DROP TABLE profile;', currency: 'SAR' });
    assert.strictEqual(postErr3.statusCode, 400, 'Should reject SQL injection in name');
    assert.strictEqual(postErr3.body.error, 'Invalid name');

    console.log('✅ POST /api/profile validation checks passed.');

    // 3. Test POST /api/profile with valid data
    console.log('Testing POST /api/profile with valid data...');
    const postOk = await request('POST', '/api/profile', { name: 'Karam User', currency: 'SAR' });
    assert.strictEqual(postOk.statusCode, 200, 'Valid POST failed');
    assert.deepStrictEqual(postOk.body, { success: true });

    // Verify GET /api/profile returns the new profile
    const getRes2 = await request('GET', '/api/profile');
    assert.strictEqual(getRes2.statusCode, 200);
    assert.strictEqual(getRes2.body.exists, true);
    assert.strictEqual(getRes2.body.profile.name, 'Karam User');
    assert.strictEqual(getRes2.body.profile.currency, 'SAR');
    console.log('✅ Profile successfully created and retrieved.');

    // 4. Test POST /api/admin/clean-slate
    console.log('Testing POST /api/admin/clean-slate...');
    const cleanRes = await request('POST', '/api/admin/clean-slate');
    assert.strictEqual(cleanRes.statusCode, 200, 'Clean-slate API failed');
    assert.deepStrictEqual(cleanRes.body, { success: true });
    console.log('✅ Clean-slate API endpoint returned success.');

    // Verify profile is deleted via API
    const getRes3 = await request('GET', '/api/profile');
    assert.strictEqual(getRes3.statusCode, 200);
    assert.strictEqual(getRes3.body.exists, false);
    assert.strictEqual(getRes3.body.profile, null);
    console.log('✅ Profile successfully cleared after clean-slate.');

    // Verify SQLite database state directly
    console.log('Verifying DB tables directly...');
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

    const profileCount = await database.get('SELECT COUNT(*) as count FROM profile');
    assert.strictEqual(profileCount.count, 0, 'Profile not cleared');

    const activeBadges = await database.get('SELECT COUNT(*) as count FROM badges WHERE unlocked = 1');
    assert.strictEqual(activeBadges.count, 0, 'Badges not reset');

    const bankCount = await database.get('SELECT COUNT(*) as count FROM bank_accounts');
    assert.strictEqual(bankCount.count, 3, 'Bank accounts not reset to 3 templates');
    console.log('✅ SQLite direct checks verify database is clean slate.');

    console.log('\n🎉 ALL API ENDPOINT AND SANITIZATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ API verification tests failed:', err);
    process.exit(1);
  }
}

runApiTests();

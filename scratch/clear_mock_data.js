const database = require('../database');

async function cleanSlate() {
  console.log('Starting standalone clean-slate data wipe...');
  try {
    // Make sure tables exist (initDatabase)
    await database.initDatabase();

    // Wipe all user data
    await database.run('DELETE FROM transactions');
    await database.run('DELETE FROM stocks');
    await database.run('DELETE FROM savings_goals');
    await database.run('DELETE FROM subscriptions');
    await database.run('DELETE FROM ml_state');
    await database.run('DELETE FROM profile');
    await database.run('DELETE FROM recurring_transactions');

    // Reset badges unlocked column (unlocked = 0, unlocked_at = NULL)
    await database.run('UPDATE badges SET unlocked = 0, unlocked_at = NULL');

    // Clear bank_accounts
    await database.run('DELETE FROM bank_accounts');

    console.log('✅ Clean-slate standalone script completed successfully.');
    
    // Close database connection to allow clean script termination
    database.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        process.exit(1);
      } else {
        console.log('Database connection closed.');
        process.exit(0);
      }
    });
  } catch (err) {
    console.error('❌ Clean-slate failed:', err);
    process.exit(1);
  }
}

cleanSlate();

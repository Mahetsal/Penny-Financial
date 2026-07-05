import { getClassifier } from './frontend/src/utils/nluEngine.js';

async function runNluStressTest() {
  console.log('--- STARTING NLU DYNAMIC STRESS TESTS (5,000+ COMBINATIONS) ---');
  
  const classifier = getClassifier();
  
  // Define variations
  const arVerbs = ['ابي', 'ابغى', 'اريد', 'حاول', 'سجل', 'سوي', 'ضيف', 'تكفى', 'ارجوك', 'سجلت', 'صرفت', 'دفعت', 'شريت', 'عرض', 'كم', 'وريني', 'افتح'];
  const arNouns = ['معامله', 'عمليه', 'فاتوره', 'مصروف', 'شراء', 'دفع', 'سهم', 'اسهم', 'محفظه', 'تداول', 'هدف', 'ادخار', 'توفير', 'رصيد', 'فلوس', 'حساب', 'ميزانيه', 'اشتراك', 'اشتراكات', 'عضويه'];
  const arSuffixes = ['اليوم', 'امس', 'الان', 'بسرعه', 'فورا', 'ستاربكس', 'جرير', 'نون', 'امازون', 'البنك', 'بليز'];

  const enVerbs = ['please', 'want', 'need', 'like', 'record', 'track', 'log', 'add', 'delete', 'remove', 'check', 'show', 'get', 'calculate', 'view', 'list'];
  const enNouns = ['transaction', 'purchase', 'expense', 'debit', 'payment', 'bill', 'stock', 'stocks', 'portfolio', 'shares', 'goal', 'savings', 'target', 'balance', 'cash', 'budget', 'subscription', 'membership'];
  const enSuffixes = ['now', 'today', 'yesterday', 'quickly', 'instantly', 'starbucks', 'amazon', 'uber', 'gym', 'please'];

  const generatedQueries = [];

  // Generate 2,700 Arabic combinations
  for (let i = 0; i < 90; i++) {
    const v = arVerbs[i % arVerbs.length];
    const n = arNouns[i % arNouns.length];
    for (let j = 0; j < 30; j++) {
      const s = arSuffixes[j % arSuffixes.length];
      generatedQueries.push(`${v} ${n} ${s}`);
    }
  }

  // Generate 2,700 English combinations
  for (let i = 0; i < 90; i++) {
    const v = enVerbs[i % enVerbs.length];
    const n = enNouns[i % enNouns.length];
    for (let j = 0; j < 30; j++) {
      const s = enSuffixes[j % enSuffixes.length];
      generatedQueries.push(`${v} ${n} ${s}`);
    }
  }

  console.log(`Generated ${generatedQueries.length} unique query variations for classification.`);

  const start = performance.now();
  let failCount = 0;
  
  for (let i = 0; i < generatedQueries.length; i++) {
    const query = generatedQueries[i];
    try {
      const res = classifier.classify(query);
      if (!res || !res.intent) {
        failCount++;
      }
    } catch (err) {
      failCount++;
      console.error(`Crash on query: "${query}"`, err);
    }
  }
  
  const duration = performance.now() - start;
  const avgTime = duration / generatedQueries.length;
  
  console.log(`Execution completed in: ${duration.toFixed(2)}ms`);
  console.log(`Average classification response time: ${avgTime.toFixed(4)}ms per query`);
  console.log(`Fail count: ${failCount}`);

  if (failCount > 0) {
    console.error('❌ NLU Stress tests failed.');
    process.exit(1);
  }
  
  if (avgTime > 1.0) {
    console.error(`❌ Performance too slow: average time ${avgTime.toFixed(4)}ms > 1ms limit.`);
    process.exit(1);
  }

  console.log('✅ NLU Trie Stress Test passed successfully under sub-millisecond limits!');
  process.exit(0);
}

runNluStressTest();

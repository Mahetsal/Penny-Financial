const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Path resolution
const rootDir = path.join(__dirname, '..');
const nluEnginePath = path.join(rootDir, 'frontend', 'src', 'utils', 'nluEngine.js');
const localAiPath = path.join(rootDir, 'frontend', 'src', 'components', 'LocalAI.jsx');

// Read LocalAI.jsx to extract functions
const localAiContent = fs.readFileSync(localAiPath, 'utf8');

// Simple parser to extract functions from LocalAI.jsx
function extractFunction(content, functionName) {
  const startIndex = content.indexOf(`const ${functionName} =`);
  if (startIndex === -1) {
    throw new Error(`Function ${functionName} not found in LocalAI.jsx`);
  }
  
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let index = content.indexOf('{', startIndex);
  if (index === -1) {
    throw new Error("Opening brace not found");
  }
  
  braceCount = 1;
  index++;
  
  while (index < content.length && braceCount > 0) {
    const char = content[index];
    if (char === '"' || char === "'" || char === "`") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char && content[index - 1] !== '\\') {
        inString = false;
      }
    }
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
    }
    index++;
  }
  
  return content.substring(startIndex, index);
}

async function runTest() {
  console.log('=== STARTING CHATBOT NLU 5-TYPE AUDIT ===\n');

  // Dynamic import of ES Modules in CommonJS
  const nluModule = await import('file://' + nluEnginePath.replace(/\\/g, '/'));
  const { getClassifier, convertArabicNumerals, normalizeArabic } = nluModule;

  // Extract evaluateMathExpression & _buildSmartResponse
  const evalMathExpressionStr = extractFunction(localAiContent, 'evaluateMathExpression');
  const evaluateMathExpression = new Function(
    'convertArabicNumerals',
    `${evalMathExpressionStr}\nreturn evaluateMathExpression;`
  )(convertArabicNumerals);

  const buildSmartResponseStr = extractFunction(localAiContent, '_buildSmartResponse');
  const _buildSmartResponse = new Function(
    `${buildSmartResponseStr}\nreturn _buildSmartResponse;`
  )();

  const classifier = getClassifier();

  // Mock application state/database statistics
  const mockStats = {
    spending: 2450.00,
    balance: 14750.00,
    income: 8500.00
  };

  const mockTransactions = [
    { id: 1, amount: -150.00, description: 'Starbucks Coffee', category: 'Food & Dining', is_recurring: 0 },
    { id: 2, amount: -56.00, description: 'Netflix Subscription', category: 'Entertainment', is_recurring: 1 },
    { id: 3, amount: -1200.00, description: 'Landlord Monthly Rent', category: 'Housing', is_recurring: 1 },
    { id: 4, amount: 8500.00, description: 'Company Payroll Direct Deposit', category: 'Salary', is_recurring: 1 }
  ];

  // Helper to process user query
  function processQuery(queryText) {
    const normalized = convertArabicNumerals(queryText.toLowerCase().trim());
    const hasArabic = /[\u0600-\u06FF]/.test(queryText);
    const queryIsAr = hasArabic;

    // 1. Classification
    const classification = classifier.classify(queryText);
    let intent = classification.intent;

    // 2. Out of Scope Guards
    const outOfScopePhrases = [
      'time', 'weather', 'clock', 'hour', 'rain', 'temp', 'wind', 'forecast',
      'ساعة', 'ساعه', 'الوقت', 'الطقس', 'مطر', 'امطار', 'حرارة', 'الحرارة',
      'درجة', 'درجه', 'كم الساعة', 'كم الساعه'
    ];
    const isOutOfScope = outOfScopePhrases.some(phrase => normalized.includes(phrase));

    // 3. Math calculation helper checks
    const hasDigits = /[\d٠-٩]/.test(normalized);
    const hasOperators = /[\+\-\*\/%=\^]/.test(normalized);
    const mathKeywords = ['calculate', 'compute', 'plus', 'minus', 'times', 'divided', 'sum', 'add', 'subtract', 'multiply', 'divide', 'percent', 'of', 'احسب', 'ضرب', 'قسمة', 'جمع', 'طرح', 'زائد', 'ناقص', 'بالمئة', 'في المئة', 'من', 'يساوي'];
    const hasMathKeywords = mathKeywords.some(keyword => normalized.includes(keyword));
    const isValidMath = hasDigits && (hasOperators || hasMathKeywords);

    if (isOutOfScope) {
      intent = 'out_of_scope';
    } else if (intent === 'math_calc' && !isValidMath) {
      intent = 'out_of_scope';
    }

    // 4. Response Generation
    let reply = '';
    if (intent === 'out_of_scope') {
      const response = _buildSmartResponse('Out of Scope', queryIsAr, mockStats, mockTransactions, 0);
      reply = response.text;
    } else if (intent === 'math_calc') {
      const mathResult = evaluateMathExpression(normalized);
      const pctMatch = normalized.match(/(\d+)%\s*(?:of|من)\s*(\d+)/);
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1]);
        const total = parseFloat(pctMatch[2]);
        reply = `🧮 ${pct}% ${queryIsAr ? 'من' : 'of'} ${total} = ${((pct/100)*total).toLocaleString()}`;
      } else if (mathResult !== null) {
        reply = `🧮 = ${mathResult.toLocaleString()}`;
      } else {
        reply = queryIsAr ? 'لم أتمكن من حل هذه المعادلة.' : 'Could not parse the calculation.';
      }
    } else if (intent === 'check_balance') {
      const liveBal = mockStats.balance;
      reply = queryIsAr 
        ? `رصيدك الإجمالي المتوفر حالياً هو ${liveBal.toLocaleString()} ريال.`
        : `Your current total balance is ${liveBal.toLocaleString()} SAR.`;
    } else if (intent === 'add_transaction') {
      reply = queryIsAr
        ? `تم تصنيف العملية وإضافتها إلى سجل المعاملات.`
        : `Transaction parsed and added to your ledger successfully.`;
    } else if (intent === 'saving_advice') {
      const response = _buildSmartResponse('Saving Advice', queryIsAr, mockStats, mockTransactions, 0);
      reply = response.text;
    } else if (intent === 'expense_advice') {
      const response = _buildSmartResponse('Expense Reduction', queryIsAr, mockStats, mockTransactions, 0);
      reply = response.text;
    } else {
      const response = _buildSmartResponse('Fallback', queryIsAr, mockStats, mockTransactions, 0);
      reply = response.text;
    }

    return { query: queryText, intent, reply, isArabic: queryIsAr };
  }

  // Define 5 distinct types of inputs
  const testInputs = [
    { type: 'Valid Calculation', query: '15% of 3000' },
    { type: 'Balance Query', query: 'كم رصيدي المتبقي' },
    { type: 'Arabic Command', query: 'سجل مصروف 200 ريال في ستاربكس' },
    { type: 'Out of Scope', query: 'كم الساعة الآن في الرياض' },
    { type: 'Budget Query (Expense Advice)', query: 'how to reduce my expenses' }
  ];

  for (const t of testInputs) {
    const res = processQuery(t.query);
    console.log(`[Type: ${t.type}]`);
    console.log(`  Query:  "${res.query}"`);
    console.log(`  Intent: "${res.intent}" (isArabic: ${res.isArabic})`);
    console.log(`  Reply:  "${res.reply}"`);
    console.log('-'.repeat(50));
  }

  console.log('=== NLU CHATBOT AUDIT COMPLETED ===');
}

runTest();

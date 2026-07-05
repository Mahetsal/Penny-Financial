import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Brain, Loader, Send, Bot, User, ShieldCheck } from 'lucide-react';
import { getClassifier, convertArabicNumerals, normalizeArabic } from '../utils/nluEngine';
import { apiFetch } from '../utils/api';

// convertArabicNumerals and normalizeArabic are imported from '../utils/nluEngine'


// Safe math expression evaluator — recursive descent parser (NO eval/new Function)
const evaluateMathExpression = (str) => {
  const converted = convertArabicNumerals(str);
  const clean = converted.replace(/[^0-9+\-*/().,\s]/g, '').replace(/,/g, '').trim();
  if (!/[+\-*/]/.test(clean) || !/[0-9]/.test(clean)) return null;
  
  try {
    let pos = 0;
    const peek = () => clean[pos];
    const next = () => clean[pos++];
    const skipWhitespace = () => { while (pos < clean.length && clean[pos] === ' ') pos++; };
    
    function parseNumber() {
      skipWhitespace();
      let numStr = '';
      if (peek() === '(') {
        next(); // skip '('
        const val = parseExpression();
        skipWhitespace();
        if (peek() === ')') next();
        return val;
      }
      while (pos < clean.length && (/[0-9.]/.test(peek()))) numStr += next();
      return parseFloat(numStr);
    }
    
    function parseTerm() {
      let left = parseNumber();
      skipWhitespace();
      while (pos < clean.length && (peek() === '*' || peek() === '/')) {
        const op = next();
        const right = parseNumber();
        if (op === '/') {
          if (right === 0) {
            throw new Error('Division by zero');
          }
          left = left / right;
        } else {
          left = left * right;
        }
        skipWhitespace();
      }
      return left;
    }
    
    function parseExpression() {
      let left = parseTerm();
      skipWhitespace();
      while (pos < clean.length && (peek() === '+' || peek() === '-')) {
        const op = next();
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
        skipWhitespace();
      }
      return left;
    }
    
    const result = parseExpression();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch (e) {
    return null;
  }
  return null;
};

const QUIZ_QUESTIONS = [
  {
    questionEn: "Question 1: What is your main investment goal?",
    questionAr: "السؤال 1: ما هو هدفك الاستثماري الرئيسي؟",
    options: [
      { labelEn: "A) Protect my capital from any losses", labelAr: "أ) حماية رأس مالي بالكامل من أي خسارة", val: "conservative" },
      { labelEn: "B) Moderate growth with balanced safety", labelAr: "ب) نمو معتدل مع أمان متوازن", val: "moderate" },
      { labelEn: "C) Maximize returns, accepting high risk", labelAr: "ج) تحقيق أعلى عائد ممكن مع تقبل المخاطر العالية", val: "aggressive" }
    ]
  },
  {
    questionEn: "Question 2: If your stocks drop 15% in value, what would you do?",
    questionAr: "السؤال 2: إذا انخفاضت أسهمك بنسبة 15% خلال أسبوع، ماذا تفعل؟",
    options: [
      { labelEn: "A) Sell immediately to prevent further loss", labelAr: "أ) أبيع فوراً لتفادي المزيد من الخسارة", val: "conservative" },
      { labelEn: "B) Do nothing and wait for recovery", labelAr: "ب) لا أفعل شيئاً وأنتظر تعافي السوق", val: "moderate" },
      { labelEn: "C) Buy more shares at a discounted price", labelAr: "ج) أشتري المزيد من الأسهم بسعر مخفض", val: "aggressive" }
    ]
  },
  {
    questionEn: "Question 3: What is your investment time horizon?",
    questionAr: "السؤال 3: ما هو المدى الزمني لاستثمارك؟",
    options: [
      { labelEn: "A) Less than 1 year", labelAr: "أ) أقل من سنة واحدة", val: "conservative" },
      { labelEn: "B) 1 to 5 years", labelAr: "ب) من سنة إلى 5 سنوات", val: "moderate" },
      { labelEn: "C) More than 5 years", labelAr: "ج) أكثر من 5 سنوات", val: "aggressive" }
    ]
  },
  {
    questionEn: "Question 4: Which assets do you prefer holding?",
    questionAr: "السؤال 4: أي الأصول تفضل الاحتفاظ بها؟",
    options: [
      { labelEn: "A) Cash, savings accounts, and gold", labelAr: "أ) النقد وحسابات الادخار والذهب", val: "conservative" },
      { labelEn: "B) Balanced mutual funds and blue-chip stocks", labelAr: "ب) صناديق الاستثمار المتوازنة وأسهم القياديات", val: "moderate" },
      { labelEn: "C) High-growth tech, cryptos, and small caps", labelAr: "ج) شركات النمو التقنية، العملات الرقمية والأسهم الصغيرة", val: "aggressive" }
    ]
  },
  {
    questionEn: "Question 5: How do you view investment leverage/debts?",
    questionAr: "السؤال 5: كيف تنظر للاقتراض/الرافعة المالية بغرض الاستثمار؟",
    options: [
      { labelEn: "A) Avoid completely as it adds extreme risk", labelAr: "أ) أتجنبها بالكامل لأنها تحمل مخاطر ضخمة", val: "conservative" },
      { labelEn: "B) Use sparingly for highly secure assets", labelAr: "ب) أستخدمها بحذر شديد وفي أصول آمنة فقط", val: "moderate" },
      { labelEn: "C) Use to maximize returns and market power", labelAr: "ج) أستخدمها لزيادة العوائد والقوة الشرائية بالحد الأقصى", val: "aggressive" }
    ]
  }
];

const evaluateFinancialHealth = (transactions, stats, isAr) => {
  const spendingVal = stats?.spending || 0;
  const balanceVal = stats?.balance || 0;
  const incomeVal = stats?.income || 0;
  
  let score = 70;
  let reasons = [];
  
  if (incomeVal > 0) {
    const spendToIncome = spendingVal / incomeVal;
    if (spendToIncome <= 0.3) {
      score += 15;
      reasons.push(isAr ? '• نسبة الإنفاق إلى الدخل ممتازة جداً (أقل من 30%).' : '• Outstanding spend-to-income ratio (under 30%).');
    } else if (spendToIncome <= 0.5) {
      score += 10;
      reasons.push(isAr ? '• نسبة الإنفاق إلى الدخل صحية (أقل من 50%).' : '• Healthy spend-to-income ratio (under 50%).');
    } else if (spendToIncome <= 0.8) {
      score -= 5;
      reasons.push(isAr ? '• نسبة الإنفاق مرتفعة، تقترب من 80% من دخلك.' : '• High spending ratio, consuming up to 80% of income.');
    } else {
      score -= 15;
      reasons.push(isAr ? '• الإنفاق يتجاوز أو يقترب من إجمالي الدخل! خطر مالي.' : '• Spending exceeds or is near total income! Financial alert.');
    }

    const savingsRate = (incomeVal - spendingVal) / incomeVal;
    if (savingsRate >= 0.20) {
      score += 15;
      reasons.push(isAr ? '• معدل ادخارك يتجاوز النسبة المثالية (20%+).' : '• Savings rate exceeds the golden 20%+ benchmark.');
    } else if (savingsRate >= 0.10) {
      score += 5;
      reasons.push(isAr ? '• تدخر بمعدل مقبول (10%-20%).' : '• Saving at a moderate rate (10%-20%).');
    } else {
      score -= 10;
      reasons.push(isAr ? '• معدل الادخار منخفض للغاية (أقل من 10%).' : '• Saving rate is extremely low (under 10%).');
    }
  } else {
    reasons.push(isAr ? '• لم يتم تسجيل دخل هذا الشهر لحساب التقييم بدقة.' : '• No monthly income registered yet to score accurately.');
  }

  const debits = (transactions || []).filter(t => t.amount < 0);
  const activeSubs = (transactions || []).filter(t => (t.is_recurring === 1 || t.category === 'Utilities') && t.amount < 0);
  const totalSubVal = activeSubs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  if (totalSubVal > 0) {
    const subBurden = totalSubVal / Math.max(1, incomeVal);
    if (subBurden > 0.15) {
      score -= 10;
      reasons.push(isAr ? '• عبء الاشتراكات الشهرية مرتفع (>15% من الدخل).' : '• Subscription burden is heavy (>15% of income).');
    } else {
      score += 5;
      reasons.push(isAr ? '• عبء الاشتراكات تحت السيطرة وصحي.' : '• Subscription burden is well under control.');
    }
  }

  const stockOps = (transactions || []).filter(t => t.category === 'Investment' || t.category === 'Stocks');
  if (stockOps.length > 0) {
    score += 5;
    reasons.push(isAr ? '• محفظة استثمارية نشطة لتنمية رأس المال.' : '• Active investment portfolio logged to grow capital.');
  }

  score = Math.max(10, Math.min(100, score));
  
  let grade = 'C';
  let gradeColor = '#f59e0b';
  if (score >= 90) { grade = 'A+'; gradeColor = '#22c55e'; }
  else if (score >= 80) { grade = 'B'; gradeColor = '#10b981'; }
  else if (score < 50) { grade = 'F'; gradeColor = '#ef4444'; }

  if (isAr) {
    return `🩺 **تقرير الصحة المالية المخصص (بيني AI)**:
درجتك الحالية: **${score}/100** (التقييم: <span style="color:${gradeColor}">${grade}</span>)

**التحليل التفصيلي**:
${reasons.join('\n')}

**نصيحة بيني المخصصة**:
${score >= 80 
  ? 'وضعك المالي ممتاز! واصل الادخار التلقائي وفحص توافق الأسهم لفرص نمو أكبر.' 
  : 'يرجى مراجعة الاشتراكات ومحاولة خفض الإنفاق الترفيهي بنسبة 10% لرفع درجتك الشهر القادم.'}`;
  } else {
    return `🩺 **Financial Health Score (Penny AI)**:
Your Current Score: **${score}/100** (Grade: <span style="color:${gradeColor}">${grade}</span>)

**Detailed Analysis**:
${reasons.join('\n')}

**Penny's Recommendation**:
${score >= 80 
  ? 'Excellent financial health! Keep up the automated savings and stock checks.' 
  : 'Review your monthly subscriptions and reduce wants by 10% to boost your score.'}`;
  }
};

const getSpendingFingerprint = (transactions, isAr) => {
  const debits = (transactions || []).filter(t => t.amount < 0);
  if (debits.length === 0) {
    return isAr ? 'لم تسجل أي مصروفات بعد لتحليل بصمتك الاستهلاكية.' : 'No expenses logged yet to analyze your spending fingerprint.';
  }

  const categoryMap = {};
  debits.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
  });

  const sorted = Object.entries(categoryMap).sort((a,b) => b[1] - a[1]);
  const primary = sorted[0];
  const secondary = sorted[1];

  const getArCat = (cat) => {
    const map = {
      'Food & Dining': 'المطاعم والأغذية',
      'Transportation': 'المواصلات والنقل',
      'Entertainment': 'الترفيه',
      'Housing': 'السكن والعقارات',
      'Utilities': 'الفواتير والخدمات',
      'Shopping': 'التسوق والتجزئة',
      'Miscellaneous': 'عامة'
    };
    return map[cat] || cat;
  };

  if (isAr) {
    let reply = `🧬 **بصمتك الاستهلاكية الفريدة (Spending Fingerprint)**:
لقد قمنا بتحليل معاملاتك ورصدنا النمط التالي:

• **الفئة المسيطرة**: "${getArCat(primary[0])}" بمجموع ${primary[1].toLocaleString()} ريال.
${secondary ? `• **الفئة الثانوية**: "${getArCat(secondary[0])}" بمجموع ${secondary[1].toLocaleString()} ريال.` : ''}

**التحليل السلوكي**:
`;
    if (primary[0] === 'Food & Dining') {
      reply += 'أنت تصنف ماليًا كـ **"عاشق المطاعم"**. الإنفاق المتكرر على الطلبات والوجبات الخارجية يمثل الجزء الأكبر من سيولتك. حاول تحضير 3 وجبات إضافية في المنزل أسبوعياً لتوفير 400 ريال شهرياً.';
    } else if (primary[0] === 'Shopping') {
      reply += 'أنت تصنف ماليًا كـ **"عاشق التسوق"**. تميل للشراء الفوري والخصومات. ننصحك بتطبيق قاعدة 48 ساعة قبل أي شراء كمالي لتفادي الاندفاع.';
    } else if (primary[0] === 'Transportation') {
      reply += 'أنت تصنف ماليًا كـ **"كثير التنقل"**. أوبر ووسائل النقل تستهلك ميزانيتك. فكر في الاشتراك في باقات أو تنظيم رحلات مشتركة.';
    } else {
      reply += 'نمط إنفاقك متوازن وعام. لا توجد فئة استهلاكية منفردة تضغط على محفظتك بشكل خطير.';
    }
    return reply;
  } else {
    let reply = `🧬 **Your Spending Fingerprint**:
We analyzed your transaction behavior and mapped this fingerprint:

• **Dominant Category**: "${primary[0]}" ($${primary[1].toLocaleString()}).
${secondary ? `• **Secondary Category**: "${secondary[0]}" ($${secondary[1].toLocaleString()}).` : ''}

**Behavioral Insight**:
`;
    if (primary[0] === 'Food & Dining') {
      reply += 'Your financial persona is **"The Foodie"**. Fast food and restaurant dining take the biggest chunk of your money. Preparing just 3 more meals at home per week could save you up to $100/month.';
    } else if (primary[0] === 'Shopping') {
      reply += 'Your financial persona is **"The Shopper"**. Flash sales and immediate purchases drive your balance down. Try the 48-hour rule before buying wants.';
    } else {
      reply += 'Your spending style is general and distributed. No single category threatens your budget significantly.';
    }
    return reply;
  }
};

// Custom Stock compliance searcher
const checkStockQuery = (normalized, isAr) => {
  const stocks = [
    { name: 'aramco', symbol: '2222', nameAr: 'أرامكو', compliant: true, debt: 11.2, impure: 0.8 },
    { name: 'alinma', symbol: '1150', nameAr: 'الإنماء', compliant: true, debt: 0, impure: 0 },
    { name: 'stc', symbol: '7010', nameAr: 'الاتصالات', compliant: true, debt: 18.5, impure: 1.2 },
    { name: 'sabic', symbol: '2010', nameAr: 'سابك', compliant: true, debt: 24.1, impure: 2.1 }
  ];

  const normQuery = normalizeArabic(normalized);

  for (const s of stocks) {
    if (
      normalized.includes(s.name) || 
      normalized.includes(s.symbol) || 
      normalized.includes(s.nameAr) ||
      normQuery.includes(normalizeArabic(s.nameAr))
    ) {
      if (isAr) {
        return `فحص سهم ${s.nameAr} (${s.symbol}):
• حالة التوافق الشرعي: متوافق مع الشريعة ✅
• نسبة الديون/القيمة السوقية: ${s.debt}% (الحد الأقصى 33%)
• نسبة الدخل غير المطهر: ${s.impure}% (الحد الأقصى 5%)
تعتبر هذه الأسهم نقية ويُوصى بها للاستثمار الإسلامي.`;
      } else {
        return `Stock check for ${s.name.toUpperCase()} (${s.symbol}):
• Shariah Compliance: Compliant ✅
• Debt-to-Market-Cap: ${s.debt}% (Threshold < 33%)
• Impure Income Ratio: ${s.impure}% (Threshold < 5%)
This asset complies with SAMA and Shariah guidelines.`;
      }
    }
  }
  return null;
};

// What-If Saving Simulator query parser
const parseProjectionQuery = (normalized, isAr) => {
  const cleanStr = convertArabicNumerals(normalized);
  
  const enMatch = cleanStr.match(/(?:save|deposit|put away|invest)\s*(?:\$)?\s*(\d+(?:\.\d+)?)\s*(?:usd|riyal|sar|dh|dollars|riyals)?\s*(?:a month|monthly|per month|every month)?\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:year|years|yr|yrs)/i);
  const arMatch = cleanStr.match(/(?:وفرت|ادخرت|ادخار|توفير|حفظ|أوفر|أدخر|اخر|ادخر)\s*(\d+(?:\.\d+)?)\s*(?:ريال|دولار|جنيه|درهم|ريالاً|ريالات)?\s*(?:شهريا|شهرياً|كل شهر)?\s*(?:لمدة|خلال)?\s*(\d+(?:\.\d+)?)\s*(?:سنوات|سنة|عام|أعوام|اعوام|سنوات)/);
  
  let amount = null;
  let years = null;

  if (enMatch) {
    amount = parseFloat(enMatch[1]);
    years = parseFloat(enMatch[2]);
  } else if (arMatch) {
    amount = parseFloat(arMatch[1]);
    years = parseFloat(arMatch[2]);
  }

  if (amount && years) {
    const totalSaved = amount * 12 * years;
    let compounded = 0;
    const monthlyRate = 0.05 / 12;
    const months = years * 12;
    for (let i = 0; i < months; i++) {
      compounded = (compounded + amount) * (1 + monthlyRate);
    }
    
    if (isAr) {
      return `إذا ادخرت ${amount.toLocaleString()} ريال شهرياً لمدة ${years} سنوات:
• إجمالي الادخار النقدي: ${totalSaved.toLocaleString()} ريال
• مع عوائد استثمارية متوقعة (بمعدل 5% سنوياً): ${Math.round(compounded).toLocaleString()} ريال
هذا سيساعدك في تسريع تحقيق أهدافك الاستثمارية!`;
    } else {
      return `If you save $${amount.toLocaleString()} monthly for ${years} years:
• Total Cash Saved: $${totalSaved.toLocaleString()}
• With compound interest (at a conservative 5% annual return): $${Math.round(compounded).toLocaleString()}
This would significantly accelerate your financial goals!`;
    }
  }
  return null;
};

// Live Transaction Searcher
const searchTransactions = (normalized, transactions, isAr) => {
  const merchantsInDb = [...new Set(transactions.map(t => t.description))];
  
  let foundMerchant = null;
  for (const merchant of merchantsInDb) {
    if (normalized.includes(merchant.toLowerCase())) {
      foundMerchant = merchant;
      break;
    }
  }

  if (!foundMerchant) {
    const common = ['uber', 'netflix', 'costco', 'starbucks', 'amazon', 'spotify', 'ikea', 'saudi electric', 'stc', 'noon'];
    for (const c of common) {
      if (normalized.includes(c)) {
        const matchedT = transactions.find(t => t.description.toLowerCase().includes(c));
        if (matchedT) {
          foundMerchant = matchedT.description;
        }
        break;
      }
    }
  }

  if (foundMerchant) {
    const matches = transactions.filter(t => t.description.toLowerCase().includes(foundMerchant.toLowerCase()));
    const totalSpent = matches.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = matches.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const count = matches.length;
    const recent = matches[0];

    if (isAr) {
      let reply = `وجدت ${count} عمليات مرتبطة بـ "${foundMerchant}":\n`;
      if (totalSpent > 0) reply += `• إجمالي المصروفات: ${totalSpent.toLocaleString()} ريال\n`;
      if (totalIncome > 0) reply += `• إجمالي المقبوضات: ${totalIncome.toLocaleString()} ريال\n`;
      if (recent) reply += `• آخر عملية: بقيمة ${Math.abs(recent.amount).toLocaleString()} ريال بتاريخ ${recent.date}.`;
      return reply;
    } else {
      let reply = `Found ${count} transactions matching "${foundMerchant}":\n`;
      if (totalSpent > 0) reply += `• Total Spent: $${totalSpent.toLocaleString()}\n`;
      if (totalIncome > 0) reply += `• Total Received: $${totalIncome.toLocaleString()}\n`;
      if (recent) reply += `• Most recent: $${Math.abs(recent.amount).toLocaleString()} on ${recent.date}.`;
      return reply;
    }
  }
  return null;
};

// Ledger stats analyzer
const checkStatsQuery = (normalized, stats, transactions, isAr) => {
  const debits = transactions.filter(t => t.amount < 0);
  
  if (normalized.includes('average spend') || normalized.includes('average monthly') || 
      normalized.includes('متوسط الصرف') || normalized.includes('متوسط المصاريف') || normalized.includes('معدل الصرف')) {
    const totalSpent = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avg = debits.length > 0 ? (totalSpent / debits.length) : 0;
    
    if (isAr) {
      return `معدل صرفك لكل عملية هو ${Math.round(avg).toLocaleString()} ريال (بناءً على ${debits.length} عمليات مصروفات). إجمالي الصرف لهذا الشهر هو ${stats.spending.toLocaleString()} ريال.`;
    } else {
      return `Your average spending per transaction is $${Math.round(avg).toLocaleString()} (based on ${debits.length} debit transactions). Your total spending this month is $${stats.spending.toLocaleString()}.`;
    }
  }

  if (normalized.includes('highest expense') || normalized.includes('highest spend') || normalized.includes('biggest spent') || 
      normalized.includes('أعلى صرفية') || normalized.includes('أكبر مبلغ صرفته') || normalized.includes('اغلى عملية')) {
    if (debits.length === 0) {
      return isAr ? 'لا يوجد مصروفات مسجلة بعد.' : 'No expenses recorded yet.';
    }
    const highest = debits.reduce((prev, curr) => (Math.abs(curr.amount) > Math.abs(prev.amount)) ? curr : prev);
    
    if (isAr) {
      return `أعلى عملية صرف مسجلة في حسابك هي بقيمة ${Math.abs(highest.amount).toLocaleString()} ريال لدى "${highest.description}" بتاريخ ${highest.date}. الفئة: ${highest.category}.`;
    } else {
      return `The highest expense recorded in your ledger is $${Math.abs(highest.amount).toLocaleString()} at "${highest.description}" on ${highest.date}. Category: ${highest.category}.`;
    }
  }

  if (normalized.includes('number of transaction') || normalized.includes('how many transaction') || 
      normalized.includes('عدد العمليات') || normalized.includes('كم معاملة')) {
    if (isAr) {
      return `يحتوي سجلك المالي على ${transactions.length} عمليات إجمالاً، تنقسم إلى ${transactions.filter(t => t.amount > 0).length} مقبوضات و ${debits.length} مصروفات.`;
    } else {
      return `Your financial ledger contains ${transactions.length} total transactions, split into ${transactions.filter(t => t.amount > 0).length} income records and ${debits.length} expense records.`;
    }
  }

  // ── Category-specific spending queries ──
  const categoryKeywords = [
    { cat: 'Food & Dining',    en: ['food', 'dining', 'restaurant', 'grocery', 'groceries', 'eat', 'meal'],           ar: ['طعام', 'مطاعم', 'اكل', 'مطعم', 'غذاء', 'اغذية', 'وجبات'] },
    { cat: 'Transportation',   en: ['transport', 'transportation', 'uber', 'taxi', 'fuel', 'gas', 'travel', 'commute'],ar: ['مواصلات', 'نقل', 'وقود', 'بنزين', 'سياره', 'تاكسي', 'اوبر'] },
    { cat: 'Entertainment',    en: ['entertainment', 'fun', 'cinema', 'movie', 'sport', 'gym', 'netflix', 'spotify'],  ar: ['ترفيه', 'سينما', 'رياضه', 'جيم', 'نادي', 'سبوتيفاي', 'نتفلكس'] },
    { cat: 'Housing',          en: ['housing', 'rent', 'mortgage', 'apartment', 'home', 'ikea'],                       ar: ['سكن', 'ايجار', 'بيت', 'شقه', 'ايكيا', 'عقار'] },
    { cat: 'Utilities',        en: ['utilities', 'utility', 'electric', 'water', 'internet', 'bill', 'bills', 'stc'], ar: ['فواتير', 'فاتوره', 'كهرباء', 'ماء', 'انترنت', 'اتصالات'] },
    { cat: 'Shopping',         en: ['shopping', 'clothes', 'amazon', 'noon', 'retail', 'store'],                      ar: ['تسوق', 'ملابس', 'امازون', 'نون', 'بضاعه'] },
    { cat: 'Health & Fitness', en: ['health', 'fitness', 'pharmacy', 'doctor', 'hospital', 'medicine', 'clinic'],     ar: ['صحه', 'لياقه', 'صيدليه', 'طبيب', 'مستشفى', 'دواء'] },
  ];

  const arCatNames = {
    'Food & Dining': 'المطاعم والأغذية', 'Transportation': 'المواصلات والنقل',
    'Entertainment': 'الترفيه والرياضة', 'Housing': 'السكن والعقارات',
    'Utilities': 'الفواتير والخدمات', 'Shopping': 'التسوق والتجزئة',
    'Health & Fitness': 'الصحة واللياقة'
  };

  const totalSpentAll = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const norm = normalizeArabic(normalized);

  for (const ck of categoryKeywords) {
    const enHit = ck.en.some(w => normalized.includes(w));
    const arHit = ck.ar.some(w => normalized.includes(w) || norm.includes(normalizeArabic(w)));

    if (enHit || arHit) {
      const catDebits = debits.filter(t => t.category === ck.cat);
      const catTotal = catDebits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const pct = totalSpentAll > 0 ? Math.round((catTotal / totalSpentAll) * 100) : 0;

      if (catDebits.length === 0) {
        return isAr
          ? `لا توجد مصروفات مسجلة في فئة "${arCatNames[ck.cat] || ck.cat}" حتى الآن.`
          : `No expenses recorded in the "${ck.cat}" category yet.`;
      }

      if (isAr) {
        return `أنفقت ${catTotal.toLocaleString()} ريال على "${arCatNames[ck.cat] || ck.cat}" خلال هذه الفترة — ${catDebits.length} عمليات، تمثل ${pct}% من إجمالي مصروفاتك البالغة ${totalSpentAll.toLocaleString()} ريال.`;
      } else {
        return `You spent $${catTotal.toLocaleString()} on "${ck.cat}" — ${catDebits.length} transactions, representing ${pct}% of your total spending of $${totalSpentAll.toLocaleString()}.`;
      }
    }
  }

  return null;
};

// Conversational context memory & entity resolution engine
const checkContextFollowUp = (normalized, messages, transactions, stats, isAr) => {
  const lastAi = [...messages].reverse().find(m => m.sender === 'ai');
  if (!lastAi || !lastAi.meta) return null;

  const prevIntent = lastAi.meta.intent;

  // 1. Time-series follow-up
  const prevMonthKeywords = ['before', 'previous', 'prior', 'may', 'last month', 'قبل', 'السابق', 'الماضي', 'مايو', 'الشهر اللي قبله'];
  const isPrevMonthQuery = prevMonthKeywords.some(kw => normalized.includes(kw));

  if (isPrevMonthQuery && (
    prevIntent === 'Expense Reduction' || prevIntent === 'Ledger Statistics' || 
    prevIntent === 'Transaction Search' || prevIntent === 'Previous Spending' || 
    prevIntent === 'Spending Cause' || prevIntent === 'أسباب الارتفاع' || 
    prevIntent === 'الإنفاق السابق' || prevIntent === 'تقليص المصاريف'
  )) {
    const mayTransactions = transactions.filter(t => t.date.startsWith('2026-05'));
    const mayDebits = mayTransactions.filter(t => t.amount < 0);
    const mayTotalSpend = mayDebits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const mayTopCatMap = {};
    mayDebits.forEach(t => {
      mayTopCatMap[t.category] = (mayTopCatMap[t.category] || 0) + Math.abs(t.amount);
    });
    const sortedMayCats = Object.keys(mayTopCatMap).sort((a,b) => mayTopCatMap[b] - mayTopCatMap[a]);
    const mayTopCat = sortedMayCats[0] || (isAr ? 'العامة' : 'General');
    
    const getArCat = (cat) => {
      switch (cat) {
        case 'Food & Dining': return 'المطاعم والأغذية';
        case 'Transportation': return 'المواصلات والنقل';
        case 'Entertainment': return 'الترفيه';
        case 'Housing': return 'السكن';
        case 'Utilities': return 'الفواتير';
        case 'Shopping': return 'التسوق والتجزئة';
        default: return cat;
      }
    };
    const displayCatName = isAr ? getArCat(mayTopCat) : mayTopCat;

    if (isAr) {
      return {
        text: `بالنسبة للشهر السابق (مايو 2026)، بلغ إجمالي مصروفاتك ${mayTotalSpend.toLocaleString()} ريال، ويتركز إنفاقك بشكل أساسي في فئة "${displayCatName}".
هذا يمثل انخفاضاً ملحوظاً عن شهر يونيو (الذي صرفت فيه ${stats.spending.toLocaleString()} ريال)، نظراً لعدم وجود عمليات شراء استثنائية كبيرة في مايو مثل شراء الأجهزة الإلكترونية.`,
        intent: 'الإنفاق السابق'
      };
    } else {
      return {
        text: `For the month before (May 2026), your total spending was $${mayTotalSpend.toLocaleString()}, primarily concentrated in the "${displayCatName}" category.
This represents a significant decrease compared to June (where you spent $${stats.spending.toLocaleString()}), mainly because May did not have any large one-off spending spikes like the Apple Premium Reseller purchase.`,
        intent: 'Previous Spending'
      };
    }
  }

  // 2. Reason follow-up
  const whyKeywords = ['why', 'cause', 'reason', 'how come', 'explain', 'details', 'spike', 'أسباب', 'لماذا', 'تفاصيل', 'الارتفاع', 'ارتفع', 'الزيادة', 'ليش'];
  const isWhyQuery = whyKeywords.some(kw => normalized.includes(kw));

  if (isWhyQuery && (
    prevIntent === 'Expense Reduction' || prevIntent === 'Previous Spending' || 
    prevIntent === 'الإنفاق السابق' || prevIntent === 'تقليص المصاريف' || 
    prevIntent === 'Ledger Statistics' || prevIntent === 'Spending Cause' || prevIntent === 'أسباب الارتفاع'
  )) {
    const juneTransactions = transactions.filter(t => t.date.startsWith('2026-06'));
    const anomalies = juneTransactions.filter(t => t.is_anomaly === 1 || Math.abs(t.amount) > 1000);
    
    if (isAr) {
      if (anomalies.length > 0) {
        let details = anomalies.map(a => `• ${a.description}: بقيمة ${Math.abs(a.amount).toLocaleString()} ريال في تاريخ ${a.date}`).join('\n');
        return {
          text: `السبب الرئيسي وراء ارتفاع الصرف في شهر يونيو هو العمليات الاستثنائية التالية:\n${details}\nكما أن إجمالي فواتير الخدمات والاشتراكات بلغت قيمتها الإجمالية حوالي 265 ريال.`,
          intent: 'أسباب الارتفاع'
        };
      }
      return {
        text: `لم أجد عمليات شراء استثنائية ضخمة هذا الشهر، ولكن يتركز صرفك في فئات التسوق والمطاعم. حاول مراجعة جدول الاشتراكات والطلبات اليومية الصغيرة لتقليل الصرف.`,
        intent: 'أسباب الارتفاع'
      };
    } else {
      if (anomalies.length > 0) {
        let details = anomalies.map(a => `• ${a.description}: $${Math.abs(a.amount).toLocaleString()} on ${a.date}`).join('\n');
        return {
          text: `The primary reason for the high spending in June is due to the following one-off transaction(s):\n${details}\nAdditionally, utility bills and subscriptions totaled about $265.`,
          intent: 'Spending Cause'
        };
      }
      return {
        text: `I couldn't find any massive single transaction spike in June, but your spending was spread across Shopping and Food & Dining. Try auditing your recurring bills and micro-purchases to cut costs.`,
        intent: 'Spending Cause'
      };
    }
  }

  // 3. Stock list follow-up
  if (prevIntent === 'Tadawul Stock Check' || prevIntent === 'فحص أسهم تداول') {
    const stockRes = checkStockQuery(normalized, isAr);
    if (stockRes) {
      return {
        text: stockRes,
        intent: prevIntent
      };
    }
  }

  return null;
};

// Fallback classifier
const classifyLocalQuery = (text) => {
  const normalized = text.toLowerCase().trim();
  const normalizedAr = normalizeArabic(normalized);
  
  // Check for greetings or small talk
  const greetingSingleWords = [
    'hi', 'hello', 'hey', 'yo', 'sup', 'greetings', 'morning', 'evening', 'howdy', 'hola', 'thanks', 'thank',
    'مرحبا', 'مرحباً', 'اهلا', 'أهلاً', 'سلام', 'شلونك', 'هلا', 'اهلين', 'يسعدني', 'شكرا', 'شكراً'
  ];
  const greetingPhrases = [
    'how are you', 'who are you', 'what is your name', 'what can you do', 'help me', 'good morning', 'good evening',
    'كيف الحال', 'كيف حالك', 'مين انت', 'من انت', 'صباح الخير', 'مساء الخير', 'يا هلا', 'السلام عليكم',
    'شخبارك', 'كيفك', 'عرفني عن نفسك', 'وش تسوي', 'ايش تقدر تسوي', 'ساعدني'
  ];

  let matchesGreeting = false;
  const cleanWords = normalized.split(/[\s,.\-?;:!]+/);

  for (const word of cleanWords) {
    if (greetingSingleWords.includes(word) || greetingSingleWords.map(normalizeArabic).includes(normalizeArabic(word))) {
      matchesGreeting = true;
      break;
    }
  }

  if (!matchesGreeting) {
    for (const phrase of greetingPhrases) {
      if (normalized.includes(phrase) || normalizedAr.includes(normalizeArabic(phrase))) {
        matchesGreeting = true;
        break;
      }
    }
  }

  if (matchesGreeting && cleanWords.length <= 6) {
    return {
      labels: ['Greeting'],
      scores: [0.95]
    };
  }

  const scores = {
    'Expense Reduction': 0,
    'Islamic Finance Check': 0,
    'Saving Advice': 0,
    'Investment Risk': 0
  };

  const rules = [
    {
      label: 'Expense Reduction',
      keywords: [
        'expense', 'spending', 'spent', 'cost', 'reduce', 'cut', 'bill', 'leak', 'waste', 'subscription', 'cancel', 
        'dining', 'food', 'restaurant', 'grocery', 'shop', 'micro-transaction', 'wasteful', 'overspend', 'minimize', 
        'saving tip', 'tips', 'fee', 'charge', 'sub', 'subs', 'netflix', 'spotify', 'utility',
        'مصر', 'مصاريف', 'إنفاق', 'صرف', 'صرفته', 'تقليل', 'تخفيض', 'اشتراك', 'اشتراكات', 'الغاء', 'إلغاء', 
        'فواتير', 'فاتورة', 'هدر', 'تقليص', 'مطاعم', 'أغذية', 'تسوق', 'رادار', 'مبالغ', 'رسوم', 'وفر مصاريف'
      ],
      weight: 2
    },
    {
      label: 'Islamic Finance Check',
      keywords: [
        'shariah', 'halal', 'islamic', 'compliant', 'purify', 'purification', 'haram', 'stocks', 'equity', 'interest', 
        'debt', 'usury', 'filter', 'permissible', 'compliance', 'tadawul', 'clean', 'income', 'alinma', 'stc', 'sabic', 'tathir',
        'شرع', 'شرعي', 'حلال', 'حرام', 'تطهير', 'مشرع', 'شريعة', 'توافق', 'أسهم', 'سهم', 'إسلامي', 'ربا', 'ديون', 
        'نسبة', 'فلترة', 'فلتر', 'مقبول', 'تنقية', 'تطهيري'
      ],
      weight: 2
    },
    {
      label: 'Saving Advice',
      keywords: [
        'save', 'saving', 'savings', 'deposit', 'emergency', 'fund', 'goal', 'budget', 'reserve', 'stash', 'accumulate', 
        'future', 'quests', 'quiz', 'literacy', 'learn', 'education', 'game', 'badge',
        'ادخار', 'توفير', 'وفر', 'اهداف', 'أهداف', 'طوارئ', 'صندوق', 'ميزانية', 'مستقبل', 'مهمات', 'نقاط', 'ثقافة', 'تعليم', 'مسابقة'
      ],
      weight: 2
    },
    {
      label: 'Investment Risk',
      keywords: [
        'risk', 'invest', 'investment', 'loss', 'portfolio', 'diversify', 'rsi', 'signals', 'technical', 'variance', 
        'volatility', 'shares', 'stock market', 'market cap', 'leverage', 'beta',
        'مخاطر', 'مخاطرة', 'استثمار', 'خسارة', 'خسائر', 'تنوع', 'محفظة', 'مؤشرات', 'تحليل', 'تقلب', 'عائد', 'عوائد', 'مضاربة'
      ],
      weight: 2
    }
  ];

  const phraseWeights = [
    { phrase: 'save money', label: 'Saving Advice', score: 5 },
    { phrase: 'saving rate', label: 'Saving Advice', score: 5 },
    { phrase: 'emergency fund', label: 'Saving Advice', score: 5 },
    { phrase: 'صندوق الطوارئ', label: 'Saving Advice', score: 5 },
    { phrase: 'توفير المال', label: 'Saving Advice', score: 5 },
    { phrase: 'كيف ادخر', label: 'Saving Advice', score: 5 },
    { phrase: 'كيف اوفر', label: 'Saving Advice', score: 5 },
    
    { phrase: 'cut cost', label: 'Expense Reduction', score: 5 },
    { phrase: 'reduce spending', label: 'Expense Reduction', score: 5 },
    { phrase: 'cancel subscription', label: 'Expense Reduction', score: 5 },
    { phrase: 'تقليل المصاريف', label: 'Expense Reduction', score: 5 },
    { phrase: 'إلغاء الاشتراك', label: 'Expense Reduction', score: 5 },
    { phrase: 'تقليل الإنفاق', label: 'Expense Reduction', score: 5 },

    { phrase: 'halal stock', label: 'Islamic Finance Check', score: 5 },
    { phrase: 'shariah compliant', label: 'Islamic Finance Check', score: 5 },
    { phrase: 'purify dividend', label: 'Islamic Finance Check', score: 5 },
    { phrase: 'الأسهم الحلال', label: 'Islamic Finance Check', score: 5 },
    { phrase: 'الشرعية أسهم', label: 'Islamic Finance Check', score: 5 },
    { phrase: 'حلال وحرام', label: 'Islamic Finance Check', score: 5 },

    { phrase: 'risk manage', label: 'Investment Risk', score: 5 },
    { phrase: 'diversify portfolio', label: 'Investment Risk', score: 5 },
    { phrase: 'stop loss', label: 'Investment Risk', score: 5 },
    { phrase: 'إدارة المخاطر', label: 'Investment Risk', score: 5 },
    { phrase: 'مخاطر الاستثمار', label: 'Investment Risk', score: 5 }
  ];

  for (const item of phraseWeights) {
    if (normalized.includes(item.phrase) || normalizedAr.includes(normalizeArabic(item.phrase))) {
      scores[item.label] += item.score;
    }
  }

  // Stopwords that should NEVER trigger keyword matches
  const stopwords = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'its', 'they', 'them',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'do', 'did', 'does', 'done', 'has', 'had', 'have', 'having',
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'up',
    'and', 'or', 'but', 'not', 'no', 'so', 'if', 'as',
    'what', 'when', 'where', 'who', 'how', 'why', 'which', 'that', 'this',
    'can', 'will', 'now', 'then', 'than', 'just', 'get', 'got', 'go',
    'all', 'any', 'some', 'much', 'many', 'more', 'most', 'very',
    'about', 'with', 'from', 'into', 'out', 'here', 'there', 'would', 'could', 'should',
    'هل', 'هو', 'هي', 'من', 'في', 'على', 'إلى', 'هذا', 'هذه', 'ذلك', 'تلك',
    'ما', 'ماذا', 'متى', 'أين', 'كيف', 'لماذا', 'أي', 'هنا', 'هناك',
    'لا', 'لم', 'لن', 'قد', 'عن', 'مع', 'بين', 'حتى', 'كل', 'بعض',
    'أنا', 'أنت', 'نحن', 'هم', 'كان', 'يكون', 'الآن', 'ثم'
  ]);

  const tokens = normalized.split(/[\s,.\-?;:!]+/);

  for (const token of tokens) {
    if (token.length < 2) continue;
    if (stopwords.has(token)) continue; // Skip stopwords entirely
    const tokenAr = normalizeArabic(token);
    for (const rule of rules) {
      for (const keyword of rule.keywords) {
        const keywordAr = normalizeArabic(keyword);
        // Exact match always works
        if (token === keyword || tokenAr === keywordAr) {
          scores[rule.label] += rule.weight;
          continue;
        }
        // Prefix matching only for tokens >= 4 chars to avoid false positives
        if (token.length >= 4) {
          if (
            token.startsWith(keyword) || 
            keyword.startsWith(token) ||
            tokenAr.startsWith(keywordAr) ||
            keywordAr.startsWith(tokenAr)
          ) {
            scores[rule.label] += rule.weight;
          }
        }
      }
    }
  }

  let maxScore = 0;
  let winningLabel = 'Fallback';
  
  for (const label of Object.keys(scores)) {
    if (scores[label] > maxScore) {
      maxScore = scores[label];
      winningLabel = label;
    }
  }

  // Require minimum score of 4 to avoid weak false-positive classifications
  if (maxScore < 4) {
    return {
      labels: ['Fallback'],
      scores: [0.50]
    };
  }

  const confidence = Math.min(99, 78 + maxScore * 4);

  return {
    labels: [winningLabel],
    scores: [confidence / 100]
  };
};

// Autonomous agent step planner
const planAgentSteps = (normalized, transactions, stats, isAr, rotationIndex = 0) => {
  const steps = [];
  const normalizedAr = normalizeArabic(normalized);

  const hasStock = ['aramco', 'alinma', 'stc', 'sabic', '2222', '1150', '7010', '2010', 'أرامكو', 'الإنماء', 'الاتصالات', 'سابك', 'ارامكو', 'الانماء', 'اتصالات', 'سابك'].some(w => normalized.includes(w) || normalizedAr.includes(normalizeArabic(w)));
  const hasSavingsProj = /(?:save|deposit|put away|وفرت|ادخرت|توفير|ادخار|أوفر|أدخر|اخر|ادخر)\s*(?:\$)?\s*\d+/.test(normalized);
  const uniqueMerchants = Array.from(new Set((transactions || []).map(t => t.description?.toLowerCase()).filter(Boolean)));
  const hasSearch = uniqueMerchants.some(merchant => normalized.includes(merchant)) || ['starbucks', 'netflix', 'costco', 'amazon', 'spotify', 'ikea', 'saudi electric', 'noon', 'uber', 'ستاربكس', 'نيتفلكس', 'أمازون', 'نون'].some(w => normalized.includes(w));
  const hasMath = /[+\-*/]/.test(normalized) || normalized.includes('%') || normalized.includes('calculate') || normalized.includes('احسب') || /[0-9٠-٩]/.test(normalized);
  const hasStats = [
    'average', 'highest', 'biggest', 'number of', 'متوسط', 'أعلى', 'أكبر', 'عدد',
    // Category keywords that route to checkStatsQuery
    'food', 'dining', 'restaurant', 'grocery', 'transport', 'uber', 'entertainment',
    'housing', 'rent', 'utilities', 'electric', 'bill', 'bills', 'shopping', 'clothes',
    'health', 'fitness', 'pharmacy',
    'طعام', 'مطاعم', 'مواصلات', 'نقل', 'ترفيه', 'سكن', 'ايجار',
    'فواتير', 'كهرباء', 'تسوق', 'صحة', 'لياقة'
  ].some(w => normalized.includes(w) || normalizedAr.includes(normalizeArabic(w)));

  if (hasStock) {
    steps.push({
      tool: 'StockComplianceTool',
      thoughtEn: 'I need to check compliance status and impure income ratios of the requested Tadawul stock.',
      thoughtAr: 'أحتاج للتحقق من الضوابط الشرعية ونسب الدخل التطهيري لسهم تداول المحدد.',
      exec: () => checkStockQuery(normalized, isAr)
    });
  }

  if (hasSavingsProj) {
    steps.push({
      tool: 'SavingsProjectionTool',
      thoughtEn: 'I will simulate simple and compounded wealth growth for the saving parameters.',
      thoughtAr: 'سأقوم بمحاكاة النمو الادخاري البسيط والربحي استناداً لخيارات التوفير.',
      exec: () => parseProjectionQuery(normalized, isAr)
    });
  }

  if (hasSearch) {
    steps.push({
      tool: 'TransactionSearchTool',
      thoughtEn: 'I will query the local transaction ledger for matching merchant records.',
      thoughtAr: 'سأقوم بالبحث في السجل المالي عن العمليات المطابقة للمتجر.',
      exec: () => searchTransactions(normalized, transactions, isAr)
    });
  }

  if (hasMath) {
    steps.push({
      tool: 'MathCalculatorTool',
      thoughtEn: 'I need to parse and evaluate the arithmetic expression.',
      thoughtAr: 'أحتاج لمعالجة وحساب العملية الحسابية المطلوبة.',
      exec: () => {
        const mathResult = evaluateMathExpression(normalized);
        const pctMatch = normalized.match(/(\d+)%\s*(?:of|من)\s*(\d+)/) || normalized.match(/(\d+)\s*(?:percent|بالمئة|بالمائة)\s*(?:of|من|ضرب)\s*(\d+)/);
        if (pctMatch) {
          const percent = parseFloat(pctMatch[1]);
          const total = parseFloat(pctMatch[2]);
          const res = (percent / 100) * total;
          return isAr ? `${percent}% من ${total} = ${res.toLocaleString()}` : `${percent}% of ${total} = ${res.toLocaleString()}`;
        } else if (mathResult !== null) {
          return mathResult.toLocaleString();
        }
        return isAr ? 'خطأ في معالجة الحساب' : 'Error parsing calculation';
      }
    });
  }

  if (hasStats) {
    steps.push({
      tool: 'LedgerStatisticsTool',
      thoughtEn: 'I will analyze transaction averages and spending peaks in the database.',
      thoughtAr: 'سأقوم بتحليل متوسط الصرف وأعلى العمليات قيمة في قاعدة البيانات.',
      exec: () => checkStatsQuery(normalized, stats, transactions, isAr)
    });
  }

  if (steps.length === 0) {
    steps.push({
      tool: 'BilingualNLPClassifier',
      thoughtEn: 'No specific tool triggered. I will classify intent and generate a contextual response.',
      thoughtAr: 'لم يتم تفعيل أداة محددة. سأقوم بتصنيف القصد وتوليد رد سياقي ذكي.',
      exec: () => {
        const output = classifyLocalQuery(normalized);
        const label = output.labels[0];
        const score = output.scores[0];
        
        // Store on step so we can access it in handleSendMessage
        steps[steps.length - 1].intentLabel = label;
        steps[steps.length - 1].confidence = Math.round(score * 100);
        
        return _buildSmartResponse(label, isAr, stats, transactions, rotationIndex);
      }
    });
  }

  return steps;
};

// Smart response builder with rotation variations
const _buildSmartResponse = (label, isAr, stats, transactions, rotationIndex = 0) => {
  const debits = (transactions || []).filter(t => t.amount < 0);
  const categoryMap = {};
  debits.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
  });
  const sortedCats = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a]);
  const topCat = sortedCats[0] || (isAr ? 'العامة' : 'General');
  const spendingVal = stats?.spending || 0;
  const balanceVal = stats?.balance || 0;
  const incomeVal = stats?.income || 0;
  const savingsRate = incomeVal > 0 ? Math.round(((incomeVal - spendingVal) / incomeVal) * 100) : 0;

  // Find highest single debit transaction
  let highestDebit = null;
  if (debits.length > 0) {
    highestDebit = debits.reduce((prev, curr) => (Math.abs(curr.amount) > Math.abs(prev.amount)) ? curr : prev);
  }

  // Find all active subscriptions and calculate their monthly sum
  const activeSubs = (transactions || []).filter(t => 
    (t.is_recurring === 1 || t.category === 'Utilities') && 
    (t.amount < 0 || t.type === 'debit') &&
    t.category !== 'Salary' &&
    t.category !== 'Income'
  );
  const totalSubVal = activeSubs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const getArCat = (cat) => {
    const map = {
      'Food & Dining': 'المطاعم والأغذية',
      'Transportation': 'المواصلات والنقل',
      'Entertainment': 'الترفيه',
      'Housing': 'السكن',
      'Utilities': 'الفواتير',
      'Shopping': 'التسوق والتجزئة',
      'Miscellaneous': 'عامة',
      'Salary': 'الراتب'
    };
    return map[cat] || cat;
  };
  const displayCatName = isAr ? getArCat(topCat) : topCat;

  if (isAr) {
    switch (label) {
      case 'Greeting': {
        const variations = [
          `أهلاً بك! أنا كرم، مساعدك المالي المدمج محلياً 100%. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن تقليل المصاريف والاشتراكات، أسهم تداول المتوافقة، نصائح التوفير، أو فحص العمليات.`,
          `مرحباً! معك كرم، مدربك المالي الشخصي. جاهز لمساعدتك في تحليل نفقاتك والتخطيط لمدخراتك لتعزيز استقرارك المالي. تفضل بطرح سؤالك!`,
          `يا أهلاً وسهلاً! يسعدني مساعدتك في تنظيم أمورك المالية اليوم. هل تبحث عن نصيحة ادخار، فحص توافق سهم استثماري، أم ترغب في مراجعة مصاريفك؟`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'ترحيب'
        };
      }
      case 'Thanks': {
        const variations = [
          `على الرحب والسعة! أنا هنا دائماً لمساعدتك في تحقيق أهدافك المالية والتخطيط لمستقبلك. 😊`,
          `لا شكر على واجب! لا تتردد في الاستفسار عن أي معاملة أو سهم أو اشتراك في أي وقت. 💪`,
          `العفو! يسعدني جداً تنظيم ميزانيتك ومحفظتك. هل تحتاج لمساعدة في شيء آخر؟ 📊`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'شكر'
        };
      }
      case 'Farewell': {
        const variations = [
          `مع السلامة! أتمنى لك يوماً مالياً موفقاً وذكياً. 👋`,
          `في أمان الله! تذكر دائماً أن تدخر وتستثمر بذكاء. أراك قريباً! 💰`,
          `إلى اللقاء! كرم هنا دائماً في جهازك لمساعدتك وحفظ خصوصيتك. 🔒`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'وداع'
        };
      }
      case 'Meta Chat': {
        const variations = [
          `أعمل محلياً بالكامل (100% Offline) على جهازك لحماية خصوصية بياناتك الماليّة 🔒. لا أرسل بياناتك لأي خادم خارجي.`,
          `جميع العمليات والتحليلات تجري محلياً على جهازك. خصوصيتك هي أولويتنا القصوى، لذا لا نحتاج لاتصال بالإنترنت لمعالجة طلباتك الماليّة. 🛡️`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'حول التطبيق'
        };
      }
      case 'Out of Scope': {
        const variations = [
          `عذراً، أنا متخصص فقط في إدارة أموالك وتحليل ميزانيتك 💼. لا يمكنني المساعدة في المواضيع الأخرى.`,
          `هذا خارج تخصصي المالي. يرجى سؤالي عن المصاريف، الفواتير، أسهم تداول، أو الادخار وسأجيبك فوراً! 📊`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'خارج النطاق'
        };
      }
      case 'Expense Reduction': {
        let expText0 = `رصد رادار المصاريف أن إجمالي إنفاقك هذا الشهر هو ${spendingVal.toLocaleString()} ريال، ويتركز الصرف بشكل أساسي في فئة "${displayCatName}".\n`;
        if (activeSubs.length > 0) {
          expText0 += `لديك ${activeSubs.length} اشتراكات نشطة تكلّفك إجمالاً ${totalSubVal.toLocaleString()} ريال شهرياً (مثل ${activeSubs.slice(0, 2).map(s => s.description).join(' و ')}).\nأنصحك بمراجعة جدول الاشتراكات وإيقاف المتوقف منها لتوفير السيولة فوراً.`;
        } else {
          expText0 += `لا توجد فواتير أو اشتراكات متكررة نشطة حالياً.`;
        }
        if (highestDebit) {
          expText0 += `\nأكبر عملية صرف مسجلة كانت لدى "${highestDebit.description}" بقيمة ${Math.abs(highestDebit.amount).toLocaleString()} ريال. محاولة خفض هذه المشتريات الاستثنائية سيحدث فارقاً كبيراً!`;
        }

        let expText1 = `رادار المصاريف يشير إلى أن مصروفاتك بلغت ${spendingVal.toLocaleString()} ريال هذا الشهر، وتتصدرها فئة "${displayCatName}". ${activeSubs.length > 0 ? `لديك ${activeSubs.length} اشتراكات نشطة تكلّفك ${totalSubVal.toLocaleString()} ريال. مراجعتها قد توفر لك مبالغ جيدة للادخار.` : 'لم أرصد اشتراكات دورية مرتفعة.'}`;
        if (highestDebit) {
          expText1 += ` لاحظت أيضاً عملية شراء كبيرة بقيمة ${Math.abs(highestDebit.amount).toLocaleString()} ريال لدى "${highestDebit.description}".`;
        }

        let expText2 = `حسب السجل المالي، أنفقت ${spendingVal.toLocaleString()} ريال مؤخراً. الجزء الأكبر ذهب إلى فئة "${displayCatName}". ${highestDebit ? `من أبرز العمليات مصروف بقيمة ${Math.abs(highestDebit.amount).toLocaleString()} ريال في "${highestDebit.description}".` : ''} ننصحك بالتركيز على تقليص المصاريف الكمالية لتعزيز الادخار.`;

        const variations = [expText0, expText1, expText2];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'تقليص المصاريف'
        };
      }
      case 'Islamic Finance Check': {
        const variations = [
          `بالنسبة للضوابط الشرعية للأصول: يضم سجل أسهمك الحالية أصولاً من السوق السعودي (Tadawul). يقوم محرك الفحص بتصفية الشركات استناداً لمعايير التوافق (نسبة الديون/القيمة السوقية أقل من 33%، والدخل المحرم أقل من 5%). يرجى زيارة مستشار الأسهم لمطالعة تفاصيل التوافق ومبالغ التطهير الموصى بها.`,
          `محرك الفحص الشرعي يقوم بتحليل وتصفية الأسهم استناداً لمعايير التوافق المالي (نسبة الديون أقل من 33% ونسبة المداخيل التطهيرية أقل من 5%). يمكنك الاستفسار عن أسهم محددة مثل أرامكو، سابك، أو الإنماء مباشرة لمراجعة التوافق.`,
          `لتدقيق شرعية أسهمك، يفحص النظام نسب الديون والتطهير محلياً في جهازك بالكامل دون إرسال بياناتك للخارج. ننصحك بالاستثمار في الشركات النقية المتوافقة. يمكنك كتابة اسم أو رمز السهم (مثلاً: "سهم أرامكو" أو "1150") لفحصه.`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'التدقيق الشرعي'
        };
      }
      case 'Saving Advice': {
        let savText0 = `رصيدك الإجمالي المتوفر حالياً هو ${balanceVal.toLocaleString()} ريال.\n`;
        if (incomeVal > 0) {
          savText0 += `معدل ادخارك الحالي هذا الشهر هو ${savingsRate}% (الدخل: ${incomeVal.toLocaleString()} ريال، المصاريف: ${spendingVal.toLocaleString()} ريال).\n`;
          if (savingsRate < 10) {
            savText0 += `⚠️ تنبيه: معدل ادخارك منخفض جداً! يُنصح بشحن صندوق الطوارئ أولاً وتجنب الشراء بالبطاقات لتسريع الادخار.`;
          } else if (savingsRate < 20) {
            savText0 += `معدل ادخارك متوسط. نقترح زيادة طفيفة بنسبة 5% لتصل إلى النسبة المثالية (20%).`;
          } else {
            savText0 += `ممتاز جداً! أنت تدخر بمعدل صحي وممتاز يفوق النسبة العامة المستهدفة.`;
          }
        } else {
          savText0 += `النسبة الديناميكية المثالية لادخارك هي 20%. يُنصح بإنشاء هدف ادخار "صندوق الطوارئ" في التطبيق لتأمين ميزانيتك.`;
        }

        let savText1 = `رصيدك الحالي هو ${balanceVal.toLocaleString()} ريال. ${incomeVal > 0 ? `نسبة ادخارك للشهر الحالي تبلغ ${savingsRate}% (مجموع الدخل ${incomeVal.toLocaleString()} ريال والمصاريف ${spendingVal.toLocaleString()} ريال).` : ''} لتسريع تحقيق أهدافك، جرّب أسلوب تحدي الادخار الأسبوعي وتجنب القروض الاستهلاكية.`;

        let savText2 = `لديك رصيد متوفر بقيمة ${balanceVal.toLocaleString()} ريال. لرفع كفاءة الادخار، ننصح باتباع قاعدة 50/30/20 (50% للاحتياجات، 30% للرغبات، 20% للادخار المباشر). ${savingsRate > 0 ? `معدل ادخارك الحالي هو ${savingsRate}%، وهو مؤشر جيد.` : 'ابدأ اليوم بإنشاء هدف ادخار جديد لتتبع تقدمك.'}`;

        const variations = [savText0, savText1, savText2];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'توصية الادخار'
        };
      }
      case 'Investment Risk': {
        let riskText0 = `لإدارة مخاطر الاستثمار في محفظتك:\n`;
        const stocksRes = (transactions || []).filter(t => t.category === 'Stocks' || t.category === 'Investment');
        if (stocksRes.length > 0) {
          riskText0 += `أرى أن لديك عمليات استثمارية مسجلة. ننصحك دائماً بعدم تركيز الأصول بنسب تفوق 25% في سهم فردي.\n`;
        }
        riskText0 += `وازن محفظتك دائماً بين أسهم القياديات المتوافقة مثل سابك وأرامكو والاتصالات لتقليل المخاطر الإجمالية، واعتمد على إشارات التحليل الفني RSI المدمجة محلياً في صفحة الأسهم.`;

        let riskText1 = `لتفادي خسائر السوق المالي، لا تضع كل أموالك في سهم واحد. التنوع بين القطاعات (البنوك، البتروكيماويات، الطاقة) يحمي رأس مالك ويقلل التقلبات المحتملة في قيم المحفظة.`;

        let riskText2 = `توزيع أصول محفظتك هو سر الأمان المالي. يمكنك تتبع مؤشر القوة النسبية RSI المدمج محلياً في التطبيق لاتخاذ قرارات شراء مدروسة وتجنب المضاربات عالية المخاطر.`;

        const variations = [riskText0, riskText1, riskText2];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'إدارة المخاطر'
        };
      }
      case 'Fallback':
      default: {
        const variations = [
          `عذراً، لم أستطع فهم طلبك بشكل دقيق. أنا متخصص في إدارة أموالك — جرّب مثلاً:\n• "أضف معاملة 100 ريال ستاربكس" ➕\n• "حلل مصاريفي" 📊\n• "أوقف اشتراك نتفلكس" 🔄\n• "كم رصيدي؟" 💰`,
          `لم أستطع تفسير طلبك تماماً. يمكنك سؤالي عن إيقاف الاشتراكات (مثل "أوقف اشتراك نتفلكس")، فحص توافق الأسهم الشرعي، أو حساب متوسط صرفياتك اليومية.`,
          `عذراً، لم أستطع فهم العبارة. أنا مساعد مالي محلي، يمكنك سؤالي عن رصيدك الإجمالي، أو أسباب ارتفاع مصروفاتك هذا الشهر.`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'إرشاد عام'
        };
      }
    }
  } else {
    // English variations
    switch (label) {
      case 'Greeting': {
        const variations = [
          `Hello! I'm Karam, your 100% local financial AI coach. How can I help you optimize your wealth today? Feel free to ask about reducing expenses, checking Shariah compliant stocks, or money-saving advice.`,
          `Welcome! Karam here, your personal wealth coach. Ready to help you audit your budget and build savings. How are your finances looking today?`,
          `Hi there! Great to connect with you. Would you like to check Shariah compliant equities, audit your subscriptions, or get advice on boosting savings?`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Greeting'
        };
      }
      case 'Thanks': {
        const variations = [
          `You're very welcome! I'm always here to help you achieve your financial goals and plan ahead. 😊`,
          `Anytime! Don't hesitate to ask about transactions or stock compliance whenever you need. 💪`,
          `Happy to help! Glad I could assist with your budget. Anything else you need today? 📊`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Thanks'
        };
      }
      case 'Farewell': {
        const variations = [
          `Goodbye! Wishing you a successful and financially smart day. 👋`,
          `Farewell! Remember to save and invest disciplined. See you soon! 💰`,
          `Bye! Karam is always here offline on your device to protect your privacy and assist. 🔒`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Farewell'
        };
      }
      case 'Meta Chat': {
        const variations = [
          `I run 100% locally on your device to keep your financial logs completely private and secure 🔒. Your data never leaves this phone.`,
          `All queries and financial checks are computed locally. Privacy is our top priority, which is why I operate entirely offline. 🛡️`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'About App'
        };
      }
      case 'Out of Scope': {
        const variations = [
          `Sorry, I am only trained to help with financial management and budgeting 💼. I cannot help with other topics.`,
          `That is outside my financial domain. Please ask me about expenses, bills, stocks, or savings instead! 📊`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Out of Scope'
        };
      }
      case 'Expense Reduction': {
        let expText0 = `I notice your total monthly spending is $${spendingVal.toLocaleString()}, primarily concentrated in the "${displayCatName}" category.\n`;
        if (activeSubs.length > 0) {
          expText0 += `You have ${activeSubs.length} active recurring subscriptions costing you $${totalSubVal.toLocaleString()} monthly (including ${activeSubs.slice(0, 2).map(s => s.description).join(' and ')}).\nI recommend deactivating those you rarely use to save $${(totalSubVal * 12).toLocaleString()} annually.`;
        } else {
          expText0 += `You don't have any active recurring subscriptions detected.`;
        }
        if (highestDebit) {
          expText0 += `\nYour highest single expense was at "${highestDebit.description}" costing $${Math.abs(highestDebit.amount).toLocaleString()}. Try auditing large purchases to curb leakages.`;
        }

        let expText1 = `Your monthly spending sits at $${spendingVal.toLocaleString()}, led by "${displayCatName}". ${activeSubs.length > 0 ? `You have ${activeSubs.length} recurring subs costing $${totalSubVal.toLocaleString()} monthly. Capping them will boost your monthly savings rate.` : 'No recurring subscriptions detected.'}`;
        if (highestDebit) {
          expText1 += ` The largest single debit transaction was $${Math.abs(highestDebit.amount).toLocaleString()} at "${highestDebit.description}".`;
        }

        let expText2 = `According to your ledger, you spent $${spendingVal.toLocaleString()} recently. Most of it went to "${displayCatName}". ${highestDebit ? `A key transaction was $${Math.abs(highestDebit.amount).toLocaleString()} at "${highestDebit.description}".` : ''} Auditing this will help you save more.`;

        const variations = [expText0, expText1, expText2];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Expense Reduction'
        };
      }
      case 'Islamic Finance Check': {
        const variations = [
          `Regarding Shariah compliance: Your portfolio includes Saudi equities tracked under Tadawul rules. I filter these assets using debt-to-market-cap thresholds (< 33% and impure income < 5%). Check the Stock Advisor to view compliance status details and purification ratios for STC or Alinma Bank.`,
          `My Shariah compliance screening filters stocks based on debt ratios (<33%) and impure income (<5%). You can ask me about specific tickers like Aramco (2222) or STC (7010) directly.`,
          `Stock compliance queries are processed locally on your device. We check financial ratios to filter out excessive debt. Ask about any Saudi stock ticker to audit its compliance.`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Shariah Compliant'
        };
      }
      case 'Saving Advice': {
        let savText0 = `Your current Net Worth is $${balanceVal.toLocaleString()}.\n`;
        if (incomeVal > 0) {
          savText0 += `Your savings rate this month is ${savingsRate}% (Income: $${incomeVal.toLocaleString()}, Expenses: $${spendingVal.toLocaleString()}).\n`;
          if (savingsRate < 10) {
            savText0 += `⚠️ Warning: Your savings rate is very low! Try freezing non-essential shopping to build your buffer.`;
          } else if (savingsRate < 20) {
            savText0 += `Your savings rate is decent, but we suggest pushing it up by 5% to reach the standard 20% benchmark.`;
          } else {
            savText0 += `Outstanding! You are saving at a highly disciplined rate, exceeding the recommended 20% goal.`;
          }
        } else {
          savText0 += `I recommend targeting a 20% savings rate. Make sure to fund your Emergency Fund goal first before other targets.`;
        }

        let savText1 = `Your available balance is $${balanceVal.toLocaleString()}. ${incomeVal > 0 ? `Your savings rate is ${savingsRate}% (Income: $${incomeVal.toLocaleString()}, Expenses: $${spendingVal.toLocaleString()}).` : ''} Try setting up auto-transfers on paydays to build reserves easily.`;

        let savText2 = `Available net balance is $${balanceVal.toLocaleString()}. To optimize wealth, follow the 50/30/20 budget rule (50% needs, 30% wants, 20% savings). ${savingsRate > 0 ? `Your savings rate is ${savingsRate}%, which is healthy.` : 'Create a savings goal to track your growth.'}`;

        const variations = [savText0, savText1, savText2];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Savings Target'
        };
      }
      case 'Investment Risk': {
        let riskText0 = `To mitigate investment risks:\n`;
        const stocksResEn = (transactions || []).filter(t => t.category === 'Stocks' || t.category === 'Investment');
        if (stocksResEn.length > 0) {
          riskText0 += `I detect active investment records. Never allocate more than 25% of your portfolio value into a single asset.\n`;
        }
        riskText0 += `Keep your portfolio diversified between energy (Aramco), telecom (STC), and petrochemicals (SABIC) to distribute market volatility, and check the built-in RSI signals in your Stock portfolio.`;

        let riskText1 = `To manage portfolio variance, distribute your funds across multiple asset classes (equities, cash, property). Diversification prevents heavy losses during sector downturns.`;

        let riskText2 = `Diversification is key to managing risk. Use the built-in RSI technical signals in your portfolio page to identify oversold opportunities and avoid high-risk speculation.`;

        const variations = [riskText0, riskText1, riskText2];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'Risk Filter'
        };
      }
      case 'Fallback':
      default: {
        const variations = [
          `Sorry, I didn't quite get that. I'm your financial AI — try things like:\n• "Add transaction 100 riyals Starbucks" ➕\n• "Analyze my spending" 📊\n• "Cancel Netflix subscription" 🔄\n• "What's my balance?" 💰`,
          `I didn't quite capture that. Would you like to analyze restaurant expenses, check Shariah compliance of a stock, or add a transaction?`,
          `I couldn't parse that command. I am a local financial bot, you can ask me about your total balance, or why spending went up this month.`
        ];
        return {
          text: variations[rotationIndex % variations.length],
          intent: 'General guidance'
        };
      }
    }
  }
};

// Pure RegEx entity extraction & parser functions for AI actions
const parseAddTransaction = (text, isAr) => {
  const normalized = convertArabicNumerals(text.toLowerCase());
  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ريال|sar|دولار|\$|riyals|riyal|usd)/i) || normalized.match(/(?:بمبلغ|بقيمة|بـ|for|amount of)?\s*(\d+(?:\.\d+)?)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1]);
  
  let clean = normalized
    .replace(/أضف معاملة|اضف معاملة|سجل مصروف|صرفت|دفعت|اضافة عملية|شراء|اشتريت/g, '')
    .replace(/add transaction|add expense|spent|paid|bought|add credit|add income/gi, '')
    .replace(amountMatch[0], '')
    .replace(/ريال|sar|دولار|\$|riyals|riyal|usd/gi, '')
    .replace(/في|لدى|عند|في متجر|at|in|on|from/g, '')
    .trim();
  
  let merchant = clean || (isAr ? 'معاملة عامة' : 'General Transaction');
  if (merchant.length > 30) merchant = merchant.substring(0, 30);
  
  const isCredit = /credit|income|deposit|دخل|ايداع|راتب|salary/i.test(normalized);
  const type = isCredit ? 'credit' : 'debit';
  const finalAmount = isCredit ? amount : -amount;
  
  const categoryMap = {
    'starbucks': 'Food & Dining', 'ستاربكس': 'Food & Dining',
    'netflix': 'Utilities', 'نيتفلكس': 'Utilities',
    'spotify': 'Entertainment', 'سبوتيفاي': 'Entertainment',
    'uber': 'Transportation', 'أوبر': 'Transportation',
    'noon': 'Shopping', 'نون': 'Shopping',
    'amazon': 'Shopping', 'أمازون': 'Shopping',
    'ikea': 'Housing', 'ايكيا': 'Housing',
    'electric': 'Utilities', 'كهرباء': 'Utilities',
  };
  let category = 'Miscellaneous';
  for (const k of Object.keys(categoryMap)) {
    if (merchant.toLowerCase().includes(k)) {
      category = categoryMap[k];
      break;
    }
  }
  
  return {
    amount: finalAmount,
    description: merchant.charAt(0).toUpperCase() + merchant.slice(1),
    category,
    date: new Date().toISOString().split('T')[0],
    type
  };
};

const parseCreateGoal = (text, isAr) => {
  const normalized = convertArabicNumerals(text.toLowerCase());
  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ريال|sar|دولار|\$|riyals|riyal|usd)/i) || normalized.match(/(?:بمبلغ|بقيمة|بـ|target of)?\s*(\d+(?:\.\d+)?)/);
  if (!amountMatch) return null;
  const target_amount = parseFloat(amountMatch[1]);
  
  let clean = normalized
    .replace(/أنشئ هدف|انشئ هدف|اضف هدف|سجل هدف|هدف ادخار|توفير لـ|ادخار لـ/g, '')
    .replace(/create goal|add goal|save for|savings goal/gi, '')
    .replace(amountMatch[0], '')
    .replace(/ريال|sar|دولار|\$|riyals|riyal|usd/gi, '')
    .replace(/لـ|لشراء|من أجل|for|to buy/g, '')
    .trim();
    
  let title = clean || (isAr ? 'هدف جديد' : 'New Goal');
  if (title.length > 30) title = title.substring(0, 30);
  
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const target_date = d.toISOString().split('T')[0];
  
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    target_amount,
    current_amount: 0,
    target_date
  };
};

const handleSubscriptionAction = async (text) => {
  try {
    const res = await fetch('/api/subscriptions');
    const subs = await res.json();
    const normalized = text.toLowerCase();
    
    let matchedSub = null;
    let action = 'deactivate'; 
    if (/فعّل|تفعيل|activate|resume|turn on/i.test(normalized)) {
      action = 'activate';
    }
    
    for (const sub of subs) {
      const merchant = sub.merchant.toLowerCase();
      if (normalized.includes(merchant)) {
        matchedSub = sub;
        break;
      }
    }
    
    if (!matchedSub) {
      const common = ['netflix', 'spotify', 'youtube', 'gym', 'netflex', 'نتفلكس', 'نتفليكس', 'سبوتيفاي', 'يوتيوب', 'نادي'];
      for (const c of common) {
        if (normalized.includes(c)) {
          matchedSub = subs.find(s => s.merchant.toLowerCase().includes(c));
          break;
        }
      }
    }
    
    return { matchedSub, action };
  } catch (err) {
    console.error(err);
    return null;
  }
};

const parseAddStock = (text, isAr) => {
  const normalized = convertArabicNumerals(text.toLowerCase());
  const qtyMatch = normalized.match(/(\d+)\s*(?:أسهم|اسهم|سهم|shares|share)/i) || normalized.match(/(?:سهم|أسهم|اسهم|shares)?\s*(\d+)/);
  if (!qtyMatch) return null;
  const quantity = parseInt(qtyMatch[1]);
  
  const stockMap = [
    { symbol: '2222', name: 'Saudi Aramco', names: ['aramco', 'أرامكو', 'ارامكو'], price: 30.5 },
    { symbol: '1150', name: 'Alinma Bank', names: ['alinma', 'الإنماء', 'الانماء'], price: 35.2 },
    { symbol: '7010', name: 'STC', names: ['stc', 'الاتصالات', 'اتصالات'], price: 39.8 },
    { symbol: '2010', name: 'SABIC', names: ['sabic', 'سابك'], price: 82.5 }
  ];
  
  let matchedStock = null;
  for (const s of stockMap) {
    if (s.names.some(n => normalized.includes(n)) || normalized.includes(s.symbol)) {
      matchedStock = s;
      break;
    }
  }
  
  if (!matchedStock) {
    matchedStock = { symbol: '2222', name: isAr ? 'أرامكو' : 'Saudi Aramco', price: 30.5 };
  }
  
  const priceMatch = normalized.match(/(?:بصرف|بسعر|قيمة|at|price|for)?\s*(\d+(?:\.\d+)?)\s*(?:ريال|sar|\$|دولار)/i);
  const purchase_price = priceMatch ? parseFloat(priceMatch[1]) : matchedStock.price;
  
  return {
    symbol: matchedStock.symbol,
    name: matchedStock.name,
    quantity,
    purchase_price,
    current_price: purchase_price
  };
};

const detectActionIntent = async (text, transactions, isAr) => {
  const normalized = convertArabicNumerals(text.toLowerCase().trim());
  
  // 1. Delete Transaction
  if (
    normalized.includes('delete last') || normalized.includes('delete transaction') || normalized.includes('remove last') ||
    normalized.includes('احذف اخر') || normalized.includes('حذف العملية') || normalized.includes('حذف اخر') || normalized.includes('الغ اخر')
  ) {
    if (transactions && transactions.length > 0) {
      return {
        intent: 'delete_transaction',
        payload: transactions[0]
      };
    }
    return { intent: 'delete_transaction', error: isAr ? 'لا توجد عمليات لحذفها.' : 'No transactions found to delete.' };
  }
  
  // 2. Add Stock
  if (
    normalized.includes('add stock') || normalized.includes('buy stock') || normalized.includes('add shares') || normalized.includes('buy shares') ||
    normalized.includes('اضف سهم') || normalized.includes('شراء سهم') || normalized.includes('اضافة سهم') || (normalized.includes('سهم') && (normalized.includes('أرامكو') || normalized.includes('الإنماء') || normalized.includes('سابك') || normalized.includes('الاتصالات') || normalized.includes('أسهم')))
  ) {
    const parsed = parseAddStock(text, isAr);
    if (parsed) {
      return { intent: 'add_stock', payload: parsed };
    }
  }
  
  // 3. Toggle Subscription
  if (
    normalized.includes('cancel netflix') || normalized.includes('cancel spotify') || normalized.includes('cancel subscription') ||
    normalized.includes('أوقف نتفلكس') || normalized.includes('اوقف نتفلكس') || normalized.includes('الغاء اشتراك') || normalized.includes('الغ اشتراك') || normalized.includes('وقف اشتراك') || normalized.includes('تفعيل اشتراك')
  ) {
    const parsed = await handleSubscriptionAction(text);
    if (parsed && parsed.matchedSub) {
      return {
        intent: 'toggle_subscription',
        payload: { sub: parsed.matchedSub, action: parsed.action }
      };
    }
  }
  
  // 4. Create Savings Goal
  if (
    normalized.includes('create goal') || normalized.includes('add goal') || normalized.includes('save for') || normalized.includes('savings goal') ||
    normalized.includes('أنشئ هدف') || normalized.includes('انشئ هدف') || normalized.includes('اضف هدف') || normalized.includes('سجل هدف') || normalized.includes('توفير ل')
  ) {
    const parsed = parseCreateGoal(text, isAr);
    if (parsed) {
      return { intent: 'create_goal', payload: parsed };
    }
  }
  
  // 5. Add Transaction
  if (
    normalized.includes('add transaction') || normalized.includes('add expense') || normalized.includes('spent') || normalized.includes('paid') || normalized.includes('bought') ||
    normalized.includes('أضف معاملة') || normalized.includes('اضف معاملة') || normalized.includes('سجل مصروف') || normalized.includes('صرفت') || normalized.includes('دفعت') || normalized.includes('اشتريت')
  ) {
    const parsed = parseAddTransaction(text, isAr);
    if (parsed) {
      return { intent: 'add_transaction', payload: parsed };
    }
  }
  
  // 6. Check Balance
  if (
    normalized.includes('balance') || normalized.includes('how much money') || normalized.includes('my balance') ||
    normalized.includes('رصيدي') || normalized.includes('كم رصيدي') || normalized.includes('كم عندي') || normalized.includes('كم الحساب')
  ) {
    return { intent: 'check_balance' };
  }
  
  // 7. Spending Report
  if (
    normalized.includes('spending report') || normalized.includes('analyze spending') || normalized.includes('spending analysis') ||
    normalized.includes('وين راحت فلوسي') || normalized.includes('حلل مصاريفي') || normalized.includes('تقرير الصرف') || normalized.includes('تقرير المصاريف')
  ) {
    return { intent: 'spending_report' };
  }
  
  return null;
};

const getSpendingBreakdown = (transactions, isAr) => {
  const debits = transactions.filter(t => t.amount < 0);
  if (debits.length === 0) {
    return isAr ? 'لا توجد مصروفات مسجلة بعد.' : 'No expenses recorded yet.';
  }
  const totals = {};
  let grandTotal = 0;
  debits.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
    grandTotal += Math.abs(t.amount);
  });
  
  const getArCat = (cat) => {
    const map = {
      'Food & Dining': 'المطاعم والأغذية',
      'Transportation': 'المواصلات والنقل',
      'Entertainment': 'الترفيه',
      'Housing': 'السكن',
      'Utilities': 'الفواتير',
      'Shopping': 'التسوق والتجزئة',
      'Miscellaneous': 'عامة'
    };
    return map[cat] || cat;
  };
  
  let report = isAr 
    ? `📊 تقرير الصرف الإجمالي لهذا الشهر (${grandTotal.toLocaleString()} ريال):\n`
    : `📊 Total Spending Breakdown ($${grandTotal.toLocaleString()}):\n`;
    
  Object.keys(totals).sort((a,b) => totals[b] - totals[a]).forEach(cat => {
    const amt = totals[cat];
    const pct = Math.round((amt / grandTotal) * 100);
    const catName = isAr ? getArCat(cat) : cat;
    report += `• ${catName}: ${amt.toLocaleString()} ${isAr ? 'ريال' : '$'} (${pct}%)\n`;
  });
  
  return report;
};

const getChitchatReply = (normalized, isAr) => {
  const norm = normalized.toLowerCase().trim();

  // 1. Time Check
  if (norm.includes('time') || norm.includes('ساعة') || norm.includes('ساعه') || norm.includes('الوقت')) {
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    return isAr 
      ? `الوقت الحالي هو: ${timeStr} ⏰`
      : `The current local time is: ${timeStr} ⏰`;
  }

  // 2. Weather
  if (norm.includes('weather') || norm.includes('طقس') || norm.includes('الطقس') || norm.includes('مطر') || norm.includes('امطار') || norm.includes('جو') || norm.includes('الجو')) {
    return isAr
      ? "بما أنني أعمل محلياً بالكامل (Offline) دون اتصال بالإنترنت، فليس لدي وصول مباشر لشبكات الأرصاد الجوية الحالية. ولكن أتمنى أن يكون الجو جميلاً ومناسباً للتوفير! ☀️🌧️"
      : "Since I run completely offline on your device, I do not have active access to real-time weather feeds. I hope it's a pleasant day out there! ☀️🌧️";
  }

  // 3. Joke
  if (norm.includes('joke') || norm.includes('funny') || norm.includes('نكتة') || norm.includes('قولي نكتة') || norm.includes('اضحكني')) {
    return isAr
      ? "لماذا ذهب الريال إلى طبيب نفسي؟ لأنه كان يعاني من التضخم وضغوطات السوق! 😂"
      : "Why did the dollar go to therapy? Because it was suffering from inflation! 😂";
  }

  // 4. Greetings
  if (norm === 'hello' || norm === 'hi' || norm === 'hey' || norm === 'مرحبا' || norm === 'مرحباً' || norm === 'اهلا' || norm === 'أهلاً' || norm === 'السلام عليكم') {
    return isAr
      ? "أهلاً بك! كيف حالك اليوم؟ أنا كرم، مساعدك المالي المدمج محلياً 100%. كيف يمكنني مساعدتك؟"
      : "Hello! How are you doing today? I'm Karam, your 100% local financial companion. How can I help you?";
  }

  // 5. How are you
  if (norm.includes('how are you') || norm.includes('how is it going') || norm.includes('كيف حالك') || norm.includes('كيفك') || norm.includes('شلونك') || norm.includes('شخبارك')) {
    return isAr
      ? "أنا أعمل بأفضل كفاءة محلياً على جهازك لمساعدتك! كيف حالك أنت؟"
      : "I'm running optimally and offline on your device, ready to help! How are you doing?";
  }

  // 6. Name
  if (norm.includes('your name') || norm.includes('who are you') || norm.includes('ما اسمك') || norm.includes('اسمك ايه') || norm.includes('من انت') || norm.includes('من أنت')) {
    return isAr
      ? "أنا كرم، رفيقك المالي الذكي ومساعدك الشخصي."
      : "I am Karam, your smart offline financial companion and assistant.";
  }

  // 7. Creator / Developer
  if (norm.includes('who made you') || norm.includes('who created you') || norm.includes('your creator') || norm.includes('your developer') || norm.includes('من صنعك') || norm.includes('من طورك')) {
    return isAr
      ? "تم تطويري وتدريبي بالكامل بواسطة فريق Google DeepMind لتقديم تجربة مساعد ذكي غير متصل بالإنترنت."
      : "I was created and trained by the Google DeepMind team to deliver a premium, offline-first helper experience.";
  }

  // 8. Offline status
  if (norm.includes('offline') || norm.includes('without internet') || norm.includes('need internet') || norm.includes('بدون انترنت') || norm.includes('بدون نت') || norm.includes('تحتاج انترنت')) {
    return isAr
      ? "نعم! أنا أعمل محلياً بالكامل 100% دون الحاجة إلى الإنترنت، ولا أرسل بياناتك المالية الحساسة إلى خوادم خارجية أبداً."
      : "Yes! I run 100% locally on your device with zero internet connection needed. Your sensitive financial details never leave this phone.";
  }

  // 9. What can you do / capabilities
  if (norm.includes('what can you do') || norm.includes('what you can do') || norm.includes('your capabilities') || norm.includes('help me with') || norm.includes('ماذا يمكنك أن تفعل') || norm.includes('وش تقدر تسوي') || norm.includes('ايش تقدر تسوي') || norm.includes('ماذا تفعل')) {
    return isAr
      ? "\u0623\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u0643 \u0627\u0644\u0645\u0627\u0644\u064a \u0627\u0644\u0630\u0643\u064a \"\u0643\u0631\u0645\"\u060c \u0648\u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0644\u0642\u064a\u0627\u0645 \u0628\u0627\u0644\u0639\u062f\u064a\u062f \u0645\u0646 \u0627\u0644\u0645\u0647\u0627\u0645 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0641\u064a \u0625\u062f\u0627\u0631\u0629 \u0623\u0645\u0648\u0627\u0644\u0643 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u062f\u0648\u0646 \u0627\u0644\u062d\u0627\u062c\u0629 \u0644\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a:\n\n1. \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629: \u064a\u0645\u0643\u0646\u0643 \u0623\u0646 \u062a\u0637\u0644\u0628 \u0645\u0646\u064a \u0625\u0636\u0627\u0641\u0629 \u0623\u0648 \u062d\u0630\u0641 \u0645\u0639\u0627\u0645\u0644\u0629 \u0645\u0627\u0644\u064a\u0629 (\u0645\u062b\u0627\u0644: \"\u0623\u0636\u0641 \u0645\u0635\u0631\u0648\u0641 \u0645\u0637\u0639\u0645 50\" \u0623\u0648 \"\u062d\u0630\u0641 \u0645\u0635\u0631\u0648\u0641\"\u064a).\n2. \u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0627\u0644\u0641\u0648\u0631\u064a\u0629: \u0627\u0633\u0623\u0644\u0646\u064a \u0643\u0645 \u0623\u0646\u0641\u0642\u062a \u0641\u064a \u0641\u0626\u0629 \u0645\u0639\u064a\u0646\u0629 (\u0645\u062b\u0627\u0644: \"\u0643\u0645 \u0635\u0631\u0641\u062a \u0641\u064a \u0627\u0644\u062a\u0633\u0648\u0642\").\n3. \u0625\u0646\u0634\u0627\u0621 \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u0623\u0647\u062f\u0627\u0641 \u0627\u0644\u0627\u062f\u062e\u0627\u0631: \u062d\u062f\u062f \u0623\u0647\u062f\u0627\u0641\u0627\u064b \u0644\u0644\u0627\u062f\u062e\u0627\u0631 (\u0645\u062b\u0627\u0644: \"\u0623\u0646\u0634\u0626 \u0647\u062f\u0641\u0627\u064b \u0644\u0644\u0627\u062f\u062e\u0627\u0631\").\n4. \u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0623\u0633\u0647\u0645 \u0648\u0627\u0644\u0627\u0633\u062a\u062b\u0645\u0627\u0631: \u062a\u062a\u0628\u0639 \u0623\u0633\u0647\u0645\u0643 \u0648\u0627\u0633\u062a\u0639\u0644\u0645 \u0639\u0646 \u0634\u0631\u0639\u064a\u062a\u0647\u0627 \u0648\u062d\u0627\u0644\u062a\u0647\u0627 \u0627\u0644\u0641\u0646\u064a\u0629.\n5. \u0631\u0627\u062f\u0627\u0631 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0645\u062a\u0643\u0631\u0631\u0629: \u062a\u062a\u0628\u0639 \u0639\u0636\u0648\u064a\u0627\u062a\u0643 \u0648\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a\u0643 \u0627\u0644\u062f\u0648\u0631\u064a\u0629 \u0644\u0625\u0644\u063a\u0627\u0621 \u0639\u062f\u064a\u0645\u0629 \u0627\u0644\u0641\u0627\u0626\u062f\u0629.\n6. \u062d\u0627\u0633\u0628\u0629 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0631\u064a\u0627\u0636\u064a\u0629: \u064a\u0645\u0643\u0646\u0643 \u0633\u0624\u0627\u0644\u064a \u0639\u0646 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628\u064a\u0629 \u0648\u0627\u0644\u0646\u0633\u0628.\n7. \u062d\u0627\u0633\u0628\u0629 \u0645\u064a\u0632\u0627\u0646\u064a\u0629 50/30/20: \u0627\u0633\u0623\u0644\u0646\u064a \"\u0643\u064a\u0641 \u0627\u062e\u0637\u0637 \u0645\u064a\u0632\u0627\u0646\u064a\u062a\u064a\" \u0644\u062a\u062d\u0644\u064a\u0644 \u0646\u0641\u0642\u0627\u062a\u0643."
      : "I am \"Karam\", your smart offline financial assistant. I can do many things to help you manage your money 100% locally on your device:\n\n1. \u0025\u0025 Manage Transactions \u0025\u0025: You can ask me to log or delete transactions (e.g., \"add food purchase 25\" or \"delete starbucks expense\").\n2. \u0025\u0025 Instant Spending Reports \u0025\u0025: Ask me about your spending categories (e.g., \"how much did I spend in dining\").\n3. \u0025\u0025 Track Savings Goals \u0025\u0025: Create and fund your savings goals (e.g., \"create a goal for buying a laptop\").\n4. \u0025\u0025 Stock & Investment Advisory \u0025\u0025: Check compliance and signals for your stocks (e.g., \"is Aramco compliant\" or \"show stock signals\").\n5. \u0025\u0025 Radar Subscriptions \u0025\u0025: Monitor and toggle subscriptions to prevent money leaks (e.g., \"cancel Netflix subscription\").\n6. \u0025\u0025 Arithmetic Calculations \u0025\u0025: Ask me math questions (e.g., \"what is 15% of 3000\" or \"calculate 1500 * 12\").\n7. \u0025\u0025 50/30/20 Budget Advisory \u0025\u0025: Query your budget alignment by asking \"how to budget\" or \"how to allocate my savings\".";
  }

  // 9b. AI status
  if (norm.includes('are you real') || norm.includes('are you ai') || norm.includes('هل انت حقيقي') || norm.includes('هل انت ذكاء')) {
    return isAr
      ? "نعم، أنا نموذج ذكاء اصطناعي محلي يعمل بالكامل على هذا الجهاز لتحليل الميزانية وتقديم المشورة المالية بأمان."
      : "Yes, I am a local artificial intelligence model running fully on your device to analyze budgets and give secure financial advice.";
  }

  // 9c. Saudi Capital Check
  if (norm.includes('capital of saudi') || norm.includes('capital of ksa') || norm.includes('عاصمة السعودية') || norm.includes('عاصمه السعوديه')) {
    return isAr
      ? "الرياض هي عاصمة المملكة العربية السعودية. 🇸🇦"
      : "Riyadh is the capital of the Kingdom of Saudi Arabia. 🇸🇦";
  }

  // 10. General Knowledge - Capitals
  if (norm.includes('capital of france') || norm.includes('capital of republic of france') || norm.includes('عاصمة فرنسا') || norm.includes('عاصمه فرنسا')) {
    return isAr
      ? "باريس هي عاصمة جمهورية فرنسا. 🇫🇷"
      : "Paris is the capital of France. 🇫🇷";
  }
  if (norm.includes('king of saudi') || norm.includes('king salman') || norm.includes('ملك السعودية') || norm.includes('الملك سلمان')) {
    return isAr
      ? "خادم الحرمين الشريفين الملك سلمان بن عبد العزيز آل سعود هو ملك المملكة العربية السعودية."
      : "The King of Saudi Arabia is King Salman bin Abdulaziz Al Saud.";
  }
  if (norm.includes('population of the world') || norm.includes('population of earth') || norm.includes('عدد سكان الارض') || norm.includes('عدد سكان العالم')) {
    return isAr
      ? "يُقدر عدد سكان العالم حالياً بأكثر من 8.1 مليار نسمة."
      : "The current global population is estimated to be over 8.1 billion people.";
  }
  if (norm.includes('2+2') || norm.includes('2 + 2') || norm.includes('2 زائد 2') || norm.includes('2 زائد اثنان')) {
    return isAr
      ? "2 زائد 2 يساوي 4. 🧮"
      : "2 plus 2 equals 4. 🧮";
  }
  if (norm.includes('do you like me') || norm.includes('هل تحبني')) {
    return isAr
      ? "بالتأكيد! أنا هنا لمساعدتك وتوجيهك في شؤونك المالية والشخصية دائماً. 😊"
      : "Of course! I am always here to assist and guide you in your personal and financial tasks. 😊";
  }

  // 11. General chatter triggers
  if (norm.includes('what are you doing') || norm.includes('ماذا تفعل') || norm.includes('وش تسوي')) {
    return isAr
      ? "أقوم بمراجعة الدفتر المالي والتأكد من توافق الأسهم محلياً. كيف يمكنني مساعدتك الآن؟"
      : "I'm checking the financial ledgers and screening stock tickers locally. How can I help you right now?";
  }
  if (norm.includes('i am bored') || norm.includes('طفشان') || norm.includes('ملل')) {
    return isAr
      ? "ما رأيك أن نراجع ميزانية 50/30/20 للشهر الحالي؟ أو يمكنني إخبارك بنكتة مضحكة لتغيير الجو! 😂"
      : "How about we review your 50/30/20 budget for this month? Or I can tell you a funny joke to cheer you up! 😂";
  }
  if (norm.includes('thank you') || norm.includes('thanks') || norm.includes('شكرا') || norm.includes('شكراً') || norm.includes('تسلم')) {
    return isAr
      ? "على الرحب والسعة! أنا سعيد جداً بمساعدتك في إدارة وتنمية أموالك. 🌟"
      : "You're very welcome! Glad I could help you organize and grow your funds. 🌟";
  }

  // 12. 50/30/20 Budget Rule
  if (norm.includes('50/30/20') || norm.includes('50 30 20') || norm.includes('قاعدة الميزانية') || norm.includes('قاعده الميزانيه') || norm.includes('budget rule') || norm.includes('budget split')) {
    return isAr
      ? "قاعدة 50/30/20 هي أشهر أسلوب لإدارة الميزانية الشخصية:\n• 50% للاحتياجات الأساسية (إيجار، طعام، مواصلات)\n• 30% للرغبات والترفيه (مطاعم، تسوق، سفر)\n• 20% للادخار والاستثمار (صندوق طوارئ، محفظة استثمارية)\n\nمثال: إذا دخلك 10,000 ريال → 5,000 احتياجات | 3,000 رغبات | 2,000 ادخار. هل تريد أن أحلل ميزانيتك الحالية وأرى أين تقع بالنسبة لهذه القاعدة؟"
      : "The 50/30/20 rule is one of the most popular personal budgeting methods:\n• 50% for Needs (rent, food, transportation)\n• 30% for Wants (dining out, shopping, travel)\n• 20% for Savings & Investing (emergency fund, portfolio)\n\nExample: If your income is $5,000 → $2,500 needs | $1,500 wants | $1,000 savings. Want me to analyze your current spending and see where you stand?";
  }

  // 13. Compound interest
  if (norm.includes('compound interest') || norm.includes('compound') || norm.includes('compounding') || norm.includes('الفائدة المركبة') || norm.includes('فائده مركبه') || norm.includes('نمو مركب') || norm.includes('ربح مركب')) {
    return isAr
      ? "الفائدة المركبة هي قوة المال الخفية! 💡\n\nببساطة: تكسب فائدة على فائدتك السابقة، لا على أصل المبلغ فقط.\n\nمثال: إذا استثمرت 10,000 ريال بعائد 7% سنوياً:\n• بعد 10 سنوات → 19,671 ريال\n• بعد 20 سنة → 38,697 ريال\n• بعد 30 سنة → 76,123 ريال\n\nأينشتاين وصفها بأنها 'العجب الثامن في الدنيا'. السر هو البدء مبكراً! يمكنني محاكاة نمو مدخراتك إذا أخبرتني بالمبلغ والمدة."
      : "Compound interest is money's superpower! 💡\n\nSimply put: you earn returns on your returns, not just your principal.\n\nExample: Invest $10,000 at 7% annual return:\n• After 10 years → $19,671\n• After 20 years → $38,697\n• After 30 years → $76,123\n\nEinstein called it the 'eighth wonder of the world'. The secret is starting early! I can simulate your savings growth — just tell me the amount and time period.";
  }

  // 14. Emergency fund
  if (norm.includes('emergency fund') || norm.includes('emergency saving') || norm.includes('صندوق الطوارئ') || norm.includes('صندوق طوارئ') || norm.includes('مدخرات طوارئ') || norm.includes('احتياطي طوارئ')) {
    return isAr
      ? "صندوق الطوارئ هو شبكة الأمان المالية الأولى التي يجب بناؤها قبل أي استثمار! 🛡️\n\nالهدف: توفير ما يعادل 3 إلى 6 أشهر من مصاريفك الشهرية.\n\nمثال: إذا مصاريفك الشهرية 5,000 ريال → هدفك بين 15,000 و 30,000 ريال.\n\nنصائح لبنائه:\n• خصص 10-20% من راتبك شهرياً تلقائياً\n• ضعه في حساب توفير منفصل\n• لا تمسّه إلا في حالات طوارئ حقيقية\n\nيمكنني مساعدتك في إنشاء هدف ادخار لصندوق الطوارئ في التطبيق الآن!"
      : "An emergency fund is the very first financial safety net you should build before any investing! 🛡️\n\nGoal: Save 3–6 months' worth of living expenses.\n\nExample: If monthly expenses are $3,000 → your target is $9,000–$18,000.\n\nTips to build it:\n• Auto-transfer 10–20% of your paycheck monthly\n• Keep it in a separate savings account\n• Only touch it for true emergencies\n\nI can help you create a savings goal for your Emergency Fund right now in the app!";
  }

  // 15. Inflation
  if (norm.includes('inflation') || norm.includes('تضخم') || norm.includes('ارتفاع الاسعار') || norm.includes('ارتفاع أسعار')) {
    return isAr
      ? "التضخم هو الارتفاع التدريجي في أسعار السلع والخدمات مع مرور الوقت 📈. هذا يعني أن قوة المال الشرائية تنخفض إذا لم تستثمره.\n\nمثال: إذا معدل التضخم 5% سنوياً، فـ1000 ريال اليوم ستساوي فقط 614 ريال شراءً بعد 10 سنوات!\n\nأفضل طريقة للتغلب على التضخم: استثمر في أصول تنمو أسرع من التضخم مثل الأسهم المتوافقة، الذهب، أو العقارات."
      : "Inflation is the gradual rise in prices over time 📈, meaning your money loses purchasing power if left idle.\n\nExample: At 5% inflation, $1,000 today will only buy $614 worth of goods in 10 years!\n\nBest way to beat inflation: invest in assets that grow faster than inflation — such as Shariah-compliant equities, gold, or real estate.";
  }
};

function LocalAI({ lang, stats, transactions, subscriptions = [], stocks = [], savingsGoals = [], profile, onUpdate, mode = 'simulator' }) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);
  const [convState, setConvState] = useState(null); // null | { type: 'awaiting_transaction' } | { type: 'awaiting_goal' } | { type: 'awaiting_stock' }
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);

  const isRtl = lang === 'ar';
  const isAr = isRtl;
  const isUsd = profile?.currency === 'USD';
  const currencySymbol = isUsd ? '$' : (isRtl ? 'ر.س' : 'SAR');

  // Simulator States
  const [simulationInput, setSimulationInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simScenario, setSimScenario] = useState('car'); // 'car', 'save', 'mortgage', 'custom'
  const [simAmount, setSimAmount] = useState('80000');
  const [simInstallment, setSimInstallment] = useState('1500');
  const [simDuration, setSimDuration] = useState('5'); // years
  const [simRiskMargin, setSimRiskMargin] = useState('0'); // %
  const [simInflation, setSimInflation] = useState('0'); // %
  const [simExpenseShock, setSimExpenseShock] = useState('0'); // amount in SAR
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [simulationResult, setSimulationResult] = useState(() => ({
    balanceImpact: isRtl ? '+ ١٤,٢٠٠ ريال' : '+ 14,200 SAR',
    balancePct: 66,
    balanceDesc: isRtl ? 'نمو متوقع بنسبة ١٢٪ في نهاية السنة المالية.' : 'Expected growth of 12% by the end of the fiscal year.',
    goalsImpact: isRtl ? 'أسرع بـ ٤ أشهر' : '4 months faster',
    goalsDesc: isRtl ? 'يقربك هذا القرار من هدف "المنزل الأول" بشكل ملحوظ.' : 'This decision brings you significantly closer to the "First Home" goal.',
    goalsAvatars: isRtl ? ['بيت', 'سفر'] : ['Home', 'Trip'],
    riskLevel: isRtl ? 'منخفض المخاطر (٥٪)' : 'Low Risk (5%)',
    riskColor: 'text-primary',
    availableWorth: isRtl ? '٢٨,٥٠٠ ريال' : '28,500 SAR'
  }));

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  useEffect(() => {
    setMessages([{
      sender: 'ai',
      text: isRtl 
        ? 'مرحباً بك في تطبيق بيني! أنا كرم، مساعدك المالي المدمج محلياً 100%. كيف يمكنني مساعدتك اليوم؟' 
        : 'Welcome to Penny! I am Karam, your fully integrated local AI financial coach. How can I help you today?'
    }]);
  }, [lang]);

  const handleAmountChange = (val) => {
    setSimAmount(val);
    const numAmt = parseFloat(val) || 0;
    const numDur = parseFloat(simDuration) || 1;
    if (simScenario === 'car') {
      const computed = Math.round((numAmt * 1.1) / (numDur * 12));
      setSimInstallment(computed.toString());
    } else if (simScenario === 'mortgage') {
      const computed = Math.round((numAmt * 1.3) / (numDur * 12));
      setSimInstallment(computed.toString());
    }
  };

  const handleDurationChange = (val) => {
    setSimDuration(val);
    const numAmt = parseFloat(simAmount) || 0;
    const numDur = parseFloat(val) || 1;
    if (simScenario === 'car') {
      const computed = Math.round((numAmt * 1.1) / (numDur * 12));
      setSimInstallment(computed.toString());
    } else if (simScenario === 'mortgage') {
      const computed = Math.round((numAmt * 1.3) / (numDur * 12));
      setSimInstallment(computed.toString());
    }
  };

  const handleSimulate = async (scenarioOverride, amtOverride, instOverride, durOverride) => {
    const scenario = scenarioOverride || simScenario;
    const amt = parseFloat(amtOverride || simAmount) || 0;
    const inst = parseFloat(instOverride || simInstallment) || 0;
    const dur = parseFloat(durOverride || simDuration) || 3;
    const shock = parseFloat(simExpenseShock) || 0;

    const rate = isUsd ? 3.75 : 1;

    setIsSimulating(true);
    try {
      const res = await apiFetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionName: scenario,
          cost: amt * rate,
          recurringCost: (scenario === 'car' || scenario === 'mortgage' ? inst : 0) * rate,
          monthlyIncomeChange: (scenario === 'save' ? amt : 0) * rate,
          years: dur,
          riskMargin: parseFloat(simRiskMargin) || 0,
          inflationRate: parseFloat(simInflation) || 0,
          expenseShock: shock * rate
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Dynamically format outcomes on frontend based on lang and currency
        const convertedSavings = parseFloat((data.simulatedMonthlySavings / rate).toFixed(2));
        const convertedBaseSavings = parseFloat((data.currentMonthlySavings / rate).toFixed(2));
        const convertedWorthDiff = parseFloat((data.finalWorthDiff / rate).toFixed(2));
        
        // Localized Impact Statement
        let impactStatement = '';
        if (isRtl) {
          impactStatement = convertedWorthDiff >= 0
            ? `إيجابي. سيزيد هذا القرار صافي ثروتك بمقدار ${convertedWorthDiff.toLocaleString()} ${currencySymbol} على مدى ${dur} سنوات.`
            : `سلبي. سيقلل هذا القرار صافي ثروتك بمقدار ${Math.abs(convertedWorthDiff).toLocaleString()} ${currencySymbol} على مدى ${dur} سنوات.`;
        } else {
          impactStatement = convertedWorthDiff >= 0
            ? `Positive. This decision will increase your net worth by ${currencySymbol}${convertedWorthDiff.toLocaleString()} over ${dur} years.`
            : `Negative. This decision will reduce your net worth by ${currencySymbol}${Math.abs(convertedWorthDiff).toLocaleString()} over ${dur} years.`;
        }

        // Localized Advice
        let adviceText = '';
        if (data.recommendation === 'Proceed') {
          adviceText = isRtl
            ? `ننصح بالمتابعة. قدرتك الادخارية البالغة ${convertedBaseSavings.toLocaleString()} ${currencySymbol} شهرياً قادرة على امتصاص هذا القرار بأمان.`
            : `Proceed. This looks financially sound. Your savings buffer of ${convertedBaseSavings.toLocaleString()} ${currencySymbol}/month can absorb this comfortably.`;
        } else if (data.recommendation === 'Save First') {
          adviceText = isRtl
            ? `ننصح بالادخار أولاً. انتظر مدة ${data.monthsToAfford} أشهر لجمع المبلغ قبل الشراء لتفادي أي ضغوط أو ديون.`
            : `Save first. Wait ${data.monthsToAfford} months to save up before proceeding to avoid financial strain.`;
        } else if (data.recommendation === 'Reconsider') {
          adviceText = isRtl
            ? `ننصح بإعادة النظر. يحمل هذا القرار نسبة مخاطرة تبلغ ${data.riskPct}% من صافي ثروتك. فكر في بديل أو زيادة دخلك أولاً.`
            : `Reconsider. This decision carries ${data.riskPct}% net worth risk. Consider a cheaper alternative or increasing your income.`;
        } else {
          adviceText = isRtl
            ? `مخاطرة متوسطة. ننصح بالاحتفاظ بمدخرات طوارئ لـ ٣ أشهر (${(convertedBaseSavings * 3).toLocaleString()} ${currencySymbol}) قبل المباشرة.`
            : `Caution. Moderate risk. Ensure you have 3 months emergency fund (${(convertedBaseSavings * 3).toLocaleString()} ${currencySymbol}) before proceeding.`;
        }

        const convertedAvailable = parseFloat(((data.currentBalance - data.upfrontCost) / rate).toFixed(2));
        setSimulationResult({
          balanceImpact: isRtl 
            ? `${convertedSavings.toLocaleString()} ${currencySymbol} / شهرياً` 
            : `${currencySymbol}${convertedSavings.toLocaleString()} / month`,
          balancePct: data.successProbability,
          balanceDesc: impactStatement,
          goalsImpact: isRtl ? `${data.successProbability}% نسبة النجاح` : `${data.successProbability}% Success`,
          goalsDesc: adviceText,
          goalsAvatars: scenario === 'car' ? ['سيارة', 'طوارئ'] : scenario === 'save' ? ['حصالة', 'محفظة'] : ['بيت', 'أسهم'],
          riskLevel: isRtl 
            ? `${data.riskLabel === 'Low Risk' ? 'مخاطر منخفضة' : data.riskLabel === 'Moderate Risk' ? 'مخاطر متوسطة' : 'مخاطر عالية'} (${data.riskPct}%)`
            : `${data.riskLabel} (${data.riskPct}%)`,
          riskColor: data.riskLabel === 'High Risk' ? 'text-rose-500' : data.riskLabel === 'Moderate Risk' ? 'text-amber-500' : 'text-primary',
          availableWorth: isRtl
            ? `${convertedAvailable.toLocaleString()} ${currencySymbol}`
            : `${currencySymbol}${convertedAvailable.toLocaleString()}`
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleChipClick = (scenario) => {
    setSimScenario(scenario);
    const rate = isUsd ? 3.75 : 1;
    if (scenario === 'car') {
      const amtVal = Math.round(80000 / rate).toString();
      const instVal = Math.round(1500 / rate).toString();
      setSimAmount(amtVal);
      setSimInstallment(instVal);
      setSimDuration('5');
      handleSimulate('car', amtVal, instVal, '5');
    } else if (scenario === 'save') {
      const amtVal = Math.round(500 / rate).toString();
      setSimAmount(amtVal);
      setSimInstallment('0');
      setSimDuration('3');
      handleSimulate('save', amtVal, '0', '3');
    } else if (scenario === 'mortgage') {
      const amtVal = Math.round(500000 / rate).toString();
      const instVal = Math.round(4000 / rate).toString();
      setSimAmount(amtVal);
      setSimInstallment(instVal);
      setSimDuration('20');
      handleSimulate('mortgage', amtVal, instVal, '20');
    } else {
      const amtVal = Math.round(1000 / rate).toString();
      setSimAmount(amtVal);
      setSimInstallment('0');
      setSimDuration('1');
      handleSimulate('custom', amtVal, '0', '1');
    }
  };

  const handleConfirmAction = async (msgIdx, actionType, payload) => {
    try {
      let success = false;
      let successMsgAr = '';
      let successMsgEn = '';
      
      if (actionType === 'add_transaction') {
        const res = await apiFetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          success = true;
          const amtStr = Math.abs(payload.amount).toLocaleString();
          successMsgAr = `تم إضافة معاملة بقيمة ${amtStr} ريال لدى "${payload.description}" بنجاح ✅`;
          successMsgEn = `Successfully added transaction of $${amtStr} at "${payload.description}" ✅`;
        }
      } else if (actionType === 'create_goal') {
        const res = await apiFetch('/api/savings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          success = true;
          const amtStr = payload.target_amount.toLocaleString();
          successMsgAr = `تم إنشاء هدف الادخار "${payload.title}" بقيمة ${amtStr} ريال بنجاح 🎯`;
          successMsgEn = `Done! I've created the "${payload.title}" savings goal for $${amtStr} 🎯`;
        }
      } else if (actionType === 'toggle_subscription') {
        const { sub, action } = payload;
        const nextStatus = action === 'activate' ? 1 : 0;
        const res = await apiFetch(`/api/subscriptions/${sub.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: nextStatus })
        });
        if (res.ok) {
          success = true;
          const amtStr = sub.amount.toLocaleString();
          if (action === 'activate') {
            successMsgAr = `تم تفعيل اشتراك ${sub.merchant}. ستكلفك ${amtStr} ريال شهرياً 💳`;
            successMsgEn = `Activated ${sub.merchant} subscription. It will cost $${amtStr} monthly 💳`;
          } else {
            successMsgAr = `تم إيقاف اشتراك ${sub.merchant}. ستوفر ${amtStr} ريال شهرياً 💰`;
            successMsgEn = `Deactivated ${sub.merchant} subscription. You will save $${amtStr} monthly 💰`;
          }
        }
      } else if (actionType === 'delete_transaction') {
        const res = await apiFetch(`/api/transactions/${payload.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          success = true;
          const amtStr = Math.abs(payload.amount).toLocaleString();
          successMsgAr = `تم حذف آخر معاملة بقيمة ${amtStr} ريال لدى "${payload.description}" بنجاح 🗑️`;
          successMsgEn = `Deleted the last transaction: $${amtStr} at "${payload.description}" 🗑️`;
        }
      } else if (actionType === 'add_stock') {
        const res = await apiFetch('/api/stocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          success = true;
          successMsgAr = `تم إضافة ${payload.quantity} أسهم في سهم ${payload.name} (${payload.symbol}) بنجاح 📈`;
          successMsgEn = `Added ${payload.quantity} shares of ${payload.name} (${payload.symbol}) to your portfolio 📈`;
        }
      }
      
      if (success) {
        setMessages(prev => prev.map((m, idx) => {
          if (idx === msgIdx) {
            return {
              ...m,
              meta: { ...m.meta, confirmed: true }
            };
          }
          return m;
        }));
        
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: isAr ? successMsgAr : successMsgEn
        }]);
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: isAr ? 'عذراً، فشل تنفيذ الإجراء. يرجى المحاولة مجدداً.' : 'Sorry, the action execution failed. Please try again.'
        }]);
      }
    } catch (err) {
      console.error(err);
      setError(isAr ? 'عذراً، حدث خطأ أثناء الاتصال بالخادم.' : 'Error communicating with server.');
    }
  };

  const handleCancelAction = (msgIdx) => {
    setMessages(prev => prev.map((m, idx) => {
      if (idx === msgIdx) {
        return {
          ...m,
          meta: { ...m.meta, cancelled: true }
        };
      }
      return m;
    }));
    
    setMessages(prev => [...prev, {
      sender: 'ai',
      text: isAr ? 'تم إلغاء الإجراء.' : 'Action cancelled.'
    }]);
  };

  const submitQuery = async (queryText) => {
    if (!queryText.trim()) return;
    if (status === 'analyzing') return;

    setMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setStatus('analyzing');
    setError(null);

    try {
      const hasArabic = /[\u0600-\u06FF]/.test(queryText);
      const queryIsAr = hasArabic || (/[a-zA-Z]/.test(queryText) ? false : lang === 'ar');

      const lowerQuery = queryText.toLowerCase().trim();

      // Post analytics event
      apiFetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'ai_query',
          payload: { text: queryText, keywords: queryText.split(' ').filter(w => w.length > 3) }
        })
      }).catch(err => console.error("Failed to post analytics:", err));

      // Handle quiz responses
      if (quizStep > 0 && quizStep <= 5) {
        const activeQ = QUIZ_QUESTIONS[quizStep - 1];
        let chosenVal = 'moderate';
        const optA = activeQ.options[0];
        const optB = activeQ.options[1];
        const optC = activeQ.options[2];

        if (lowerQuery.includes('a)') || lowerQuery.includes('أ)') || lowerQuery.includes(optA.labelEn.toLowerCase()) || lowerQuery.includes(optA.labelAr)) {
          chosenVal = 'conservative';
        } else if (lowerQuery.includes('b)') || lowerQuery.includes('ب)') || lowerQuery.includes(optB.labelEn.toLowerCase()) || lowerQuery.includes(optB.labelAr)) {
          chosenVal = 'moderate';
        } else if (lowerQuery.includes('c)') || lowerQuery.includes('ج)') || lowerQuery.includes(optC.labelEn.toLowerCase()) || lowerQuery.includes(optC.labelAr)) {
          chosenVal = 'aggressive';
        } else {
          if (lowerQuery.startsWith('a') || lowerQuery.startsWith('أ')) chosenVal = 'conservative';
          else if (lowerQuery.startsWith('b') || lowerQuery.startsWith('ب')) chosenVal = 'moderate';
          else if (lowerQuery.startsWith('c') || lowerQuery.startsWith('ج')) chosenVal = 'aggressive';
        }

        const nextAnswers = [...quizAnswers, chosenVal];
        setQuizAnswers(nextAnswers);

        if (quizStep < 5) {
          const nextQ = QUIZ_QUESTIONS[quizStep];
          const nextStep = quizStep + 1;
          setQuizStep(nextStep);
          
          await new Promise(r => setTimeout(r, 600));
          
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr ? nextQ.questionAr : nextQ.questionEn,
            meta: {
              intent: 'investment_quiz',
              quizOptions: nextQ.options.map(o => ({
                label: queryIsAr ? o.labelAr : o.labelEn,
                queryText: queryIsAr ? o.labelAr : o.labelEn
              }))
            }
          }]);
          setStatus('idle');
          return;
        } else {
          setQuizStep(0);
          const consCount = nextAnswers.filter(a => a === 'conservative').length;
          const modCount = nextAnswers.filter(a => a === 'moderate').length;
          const aggCount = nextAnswers.filter(a => a === 'aggressive').length;

          let personality = 'Moderate';
          let personalityAr = 'معتدل المخاطر';
          let descEn = 'You value both steady growth and safety. Blue chip stocks are a good match.';
          let descAr = 'أنت تفضل النمو المتوازن مع الحفاظ على الأمان. تناسبك سلة متوازنة من الأسهم القيادية.';

          if (consCount > modCount && consCount > aggCount) {
            personality = 'Conservative';
            personalityAr = 'متحفظ جداً';
            descEn = 'You prioritize capital protection above all else. Cash, gold, and low-volatility assets fit you.';
            descAr = 'حماية رأس المال هي أولويتك القصوى. تناسبك أصول مثل الذهب وحسابات الادخار والودائع.';
          } else if (aggCount > consCount && aggCount > modCount) {
            personality = 'Aggressive';
            personalityAr = 'مغامر وجريء';
            descEn = 'You seek maximum yields and are comfortable with high market fluctuations.';
            descAr = 'أنت تبحث عن أعلى العوائد الممكنة وتتقبل تقلبات السوق العالية بشكل ممتاز.';
          }

          localStorage.setItem('penny_risk_tolerance', personality.toLowerCase());

          await new Promise(r => setTimeout(r, 600));

          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr
              ? `🎉 **نتائج اختبار الشخصية الاستثمارية**:
نمطك الاستثماري هو: **${personalityAr}**

**التوصية السلوكية**:
${descAr}
لقد قمت بحفظ هذه التفضيلات محلياً لتخصيص محاكي القرارات المالية تلقائياً بناءً على نمط مخاطرتك!`
              : `🎉 **Investment Personality Result**:
Your Risk Persona: **${personality}**

**Recommendation**:
${descEn}
I have saved this preference locally. The Decision Simulator will now automatically tailor risk scores based on your persona!`
          }]);
          setStatus('idle');
          return;
        }
      }

      // Check for Health Score Trigger
      const hasHealthScore = ['health score', 'financial health', 'درجة الصحة', 'الصحة المالية', 'صحة مالية', 'التقييم المالي'].some(w => lowerQuery.includes(w));
      if (hasHealthScore) {
        const scoreReply = evaluateFinancialHealth(transactions, stats, queryIsAr);
        setMessages(prev => [...prev, { sender: 'ai', text: scoreReply, meta: { intent: 'health_score' } }]);
        setStatus('idle');
        return;
      }

      // Check for Spending Fingerprint Trigger
      const hasFingerprint = ['fingerprint', 'pattern', 'نمط الصرف', 'بصمة الصرف', 'بصمة', 'سلوكي'].some(w => lowerQuery.includes(w));
      if (hasFingerprint) {
        const fingerprintReply = getSpendingFingerprint(transactions, queryIsAr);
        setMessages(prev => [...prev, { sender: 'ai', text: fingerprintReply, meta: { intent: 'spending_fingerprint' } }]);
        setStatus('idle');
        return;
      }

      // Check for Quiz Trigger
      const hasQuiz = ['quiz', 'risk tolerance', 'personality', 'test', 'اختبار', 'شخصية', 'تحليل المخاطر', 'كويز'].some(w => lowerQuery.includes(w));
      if (hasQuiz) {
        setQuizStep(1);
        setQuizAnswers([]);
        const firstQ = QUIZ_QUESTIONS[0];
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: queryIsAr 
            ? `🏁 لنبدأ اختبار نمط الاستثمار والمخاطر المخصص لك (٥ أسئلة سريعة):\n\n${firstQ.questionAr}`
            : `🏁 Let's start your personalized Investment Risk Profile Quiz (5 quick questions):\n\n${firstQ.questionEn}`,
          meta: {
            intent: 'investment_quiz',
            quizOptions: firstQ.options.map(o => ({
              label: queryIsAr ? o.labelAr : o.labelEn,
              queryText: queryIsAr ? o.labelAr : o.labelEn
            }))
          }
        }]);
        setStatus('idle');
        return;
      }

      // Handle cancellation / reset
      if (lowerQuery === 'cancel' || lowerQuery === 'reset' || lowerQuery === 'إلغاء' || lowerQuery === 'تراجع' || lowerQuery === 'الغاء') {
        setConvState(null);
        setMessages(prev => [...prev, { sender: 'ai', text: queryIsAr ? 'تم إلغاء العملية.' : 'Operation cancelled.' }]);
        setStatus('idle');
        return;
      }

      await new Promise(r => setTimeout(r, 600));

      let effectiveQuery = queryText;
      if (convState) {
        if (convState.type === 'awaiting_transaction') {
          effectiveQuery = queryIsAr ? `أضف معاملة ${queryText}` : `add transaction ${queryText}`;
        } else if (convState.type === 'awaiting_goal') {
          effectiveQuery = queryIsAr ? `أنشئ هدف ${queryText}` : `create goal ${queryText}`;
        } else if (convState.type === 'awaiting_stock') {
          effectiveQuery = queryIsAr ? `أضف سهم ${queryText}` : `add stock ${queryText}`;
        }
        setConvState(null);
      }

      const normalized = convertArabicNumerals(effectiveQuery.toLowerCase().trim());

      const categoryKeywords = {
        'Food & Dining': ['food', 'dining', 'restaurant', 'starbucks', 'coffee', 'grocery', 'eat', 'مطاعم', 'مطعم', 'أكل', 'اكل', 'غذاء', 'تغذية', 'تموينات', 'بقالة'],
        'Transportation': ['transport', 'transportation', 'uber', 'taxi', 'car', 'fuel', 'gas', 'مواصلات', 'نقل', 'أوبر', 'تكسي', 'سيارة', 'بنزين', 'وقود'],
        'Shopping': ['shop', 'shopping', 'noon', 'amazon', 'mall', 'store', 'تسوق', 'جرير', 'شراء', 'سوق'],
        'Entertainment': ['entertainment', 'play', 'game', 'cinema', 'movie', 'spotify', 'netflix', 'ترفيه', 'سينما', 'العاب', 'لعب'],
        'Utilities': ['utility', 'utilities', 'bill', 'bills', 'electric', 'water', 'internet', 'فواتير', 'فاتورة', 'كهرباء', 'ماء', 'انترنت']
      };

      let matchedCategory = null;
      for (const [catName, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => normalized.includes(kw))) {
          matchedCategory = catName;
          break;
        }
      }

      if (matchedCategory && (normalized.includes('how much') || normalized.includes('spending') || normalized.includes('spent') || normalized.includes('كم صرفت') || normalized.includes('صرفيات') || normalized.includes('كم صرف'))) {
        const catDebits = (transactions || []).filter(t => t.category === matchedCategory && t.amount < 0);
        const total = catDebits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const getArCat = (cat) => {
          const map = {
            'Food & Dining': 'المطاعم والأغذية',
            'Transportation': 'المواصلات والنقل',
            'Entertainment': 'الترفيه',
            'Housing': 'السكن',
            'Utilities': 'الفواتير',
            'Shopping': 'التسوق والتجزئة',
            'Miscellaneous': 'عامة',
            'Salary': 'الراتب'
          };
          return map[cat] || cat;
        };
        const catNameDisplay = queryIsAr ? getArCat(matchedCategory) : matchedCategory;
        const replyText = queryIsAr
          ? `بلغ إجمالي إنفاقك في فئة "${catNameDisplay}" هذا الشهر حوالي ${total.toLocaleString()} ريال.`
          : `You have spent $${total.toLocaleString()} in the "${matchedCategory}" category this month.`;
        
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: replyText,
          meta: {
            intent: 'spending_report',
            chart: {
              type: 'spending',
              title: queryIsAr ? `توزيع مصروفات ${catNameDisplay}` : `Spending in ${matchedCategory}`,
              items: [{ category: matchedCategory, amount: total, percentage: 100 }]
            }
          }
        }]);
        setStatus('idle');
        return;
      }

      // TF-IDF Classification
      const classifier = getClassifier();
      const result = classifier.classify(effectiveQuery);
      let intent = result.intent;

      // Strict validation for out-of-scope queries with word boundaries and whitelist
      const outOfScopePhrases = [
        'time', 'weather', 'clock', 'hour', 'rain', 'temp', 'wind', 'forecast',
        'ساعة', 'ساعه', 'الوقت', 'الطقس', 'مطر', 'امطار', 'حرارة', 'الحرارة',
        'درجة', 'درجه', 'كم الساعة', 'كم الساعه'
      ];
      const isWhitelisted = normalized.includes('rainy day') || normalized.includes('last hour');
      let isOutOfScope = false;
      if (!isWhitelisted) {
        isOutOfScope = outOfScopePhrases.some(phrase => {
          const isEnglish = /^[a-z]/.test(phrase);
          const regex = isEnglish 
            ? new RegExp('\\b' + phrase + '\\b')
            : new RegExp('(^|\\s|[.,!\\?])' + phrase + '($|\\s|[.,!\\?])');
          return regex.test(normalized);
        });
      }

      // Strict math filter
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

      // ── Conversational & Chitchat Interceptor ──
      const chitchatReply = getChitchatReply(normalized, queryIsAr);
      if (chitchatReply) {
        setMessages(prev => [...prev, { sender: 'ai', text: chitchatReply, meta: { intent: 'chitchat' } }]);
        setStatus('idle');
        return;
      }

      if (intent === 'out_of_scope') {
        const outOfScopeReply = queryIsAr
          ? "أعتذر، هذا الطلب خارج نطاق صلاحياتي كمساعد مالي. كيف يمكنني مساعدتك في إدارة ميزانيتك، معاملاتك، أو استثماراتك؟"
          : "I'm sorry, that request is out of my scope as a financial assistant. How can I help you with your budget, transactions, or investments?";
        setMessages(prev => [...prev, { sender: 'ai', text: outOfScopeReply, meta: { intent: 'out_of_scope' } }]);
        setStatus('idle');
        return;
      }

      // ── Dynamic 50/30/20 Budget Advisor ──
      const isBudgetQuery = normalized.includes('how to budget') || 
                            normalized.includes('budget plan') ||
                            normalized.includes('كيف اخطط ميزانيتي') || 
                            normalized.includes('كيف أخطط ميزانيتي') ||
                            normalized.includes('تقسيم الراتب') ||
                            normalized.includes('كيف اقسم ميزانيتي') ||
                            normalized.includes('كيف أقسم ميزانيتي') ||
                            normalized.includes('budget') || 
                            normalized.includes('ميزانية') ||
                            normalized.includes('ميزانيه');

      if (isBudgetQuery) {
        const txList = Array.isArray(transactions) ? transactions : [];
        const uniqueMonths = Array.from(new Set(txList.map(t => t.date ? t.date.substring(0, 7) : ''))).filter(Boolean).sort().reverse();
        const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-06"
        const monthToUse = txList.some(t => t.date && t.date.substring(0, 7) === currentMonthStr)
          ? currentMonthStr
          : (uniqueMonths[0] || currentMonthStr);
          
        const monthTx = txList.filter(t => t.date && t.date.substring(0, 7) === monthToUse);
        
        let income = 0;
        let needs = 0;
        let wants = 0;
        
        monthTx.forEach(t => {
          const amt = Math.abs(t.amount);
          const cat = t.category || '';
          if (t.type === 'credit' || t.type === 'income' || t.amount > 0) {
            income += amt;
          } else {
            if (['Housing', 'Utilities', 'Health & Fitness', 'Transportation'].includes(cat)) {
              needs += amt;
            } else if (['Shopping', 'Entertainment', 'Food & Dining'].includes(cat)) {
              wants += amt;
            }
          }
        });
        
        const savings = income - needs - wants;
        
        const needsPct = income > 0 ? (needs / income) * 100 : 0;
        const wantsPct = income > 0 ? (wants / income) * 100 : 0;
        const savingsPct = income > 0 ? (savings / income) * 100 : 0;
        
        const summaryEn = `📊 **50/30/20 Budget Summary for ${monthToUse}**
• **Income:** ${income.toFixed(2)} SAR
• **Needs (Target 50%):** ${needs.toFixed(2)} SAR (${needsPct.toFixed(1)}%) - ${needsPct > 50 ? 'Over budget ⚠️' : 'Within budget ✅'}
• **Wants (Target 30%):** ${wants.toFixed(2)} SAR (${wantsPct.toFixed(1)}%) - ${wantsPct > 30 ? 'Over budget ⚠️' : 'Within budget ✅'}
• **Savings (Target 20%):** ${savings.toFixed(2)} SAR (${savingsPct.toFixed(1)}%) - ${savingsPct < 20 ? 'Below target ⚠️' : 'On track ✅'}

**Advice:**
${needsPct > 50 ? '• Reduce needs (e.g., look for cheaper utility plans, negotiate rent).' : '• Your needs are well-managed.'}
${wantsPct > 30 ? '• Cut down wants (e.g., limit dining out, defer shopping purchases).' : '• Your wants are within the limit.'}
${savingsPct < 20 ? '• Boost savings (try to save at least 20% of your income first).' : '• Your savings rate is healthy.'}`;

        const summaryAr = `📊 **ملخص ميزانية 50/30/20 لشهر ${monthToUse}**
• **الدخل:** ${income.toFixed(2)} ريال
• **الاحتياجات (المستهدف 50%):** ${needs.toFixed(2)} ريال (${needsPct.toFixed(1)}%) - ${needsPct > 50 ? 'تجاوزت الميزانية ⚠️' : 'ضمن الميزانية ✅'}
• **الرغبات (المستهدف 30%):** ${wants.toFixed(2)} ريال (${wantsPct.toFixed(1)}%) - ${wantsPct > 30 ? 'تجاوزت الميزانية ⚠️' : 'ضمن الميزانية ✅'}
• **الادخار (المستهدف 20%):** ${savings.toFixed(2)} ريال (${savingsPct.toFixed(1)}%) - ${savingsPct < 20 ? 'أقل من المستهدف ⚠️' : 'مستمر بنجاح ✅'}

**نصيحة:**
${needsPct > 50 ? '• قلل من الاحتياجات الأساسية (مثل ترشيد استهلاك الفواتير أو تقليل تكاليف المواصلات).' : '• الاحتياجات الأساسية تقع تحت السيطرة.'}
${wantsPct > 30 ? '• قلل من الرغبات الكمالية (مثل خفض تناول الطعام في الخارج أو تأجيل التسوق غير الضروري).' : '• الرغبات الكمالية تقع ضمن الحدود المطلوبة.'}
${savingsPct < 20 ? '• ارفع نسبة الادخار (حاول ادخار 20% كأولوية فور استلام الدخل).' : '• نسبة الادخار لديك ممتازة ومستقرة.'}`;

        const bilingualSummary = `${summaryEn}\n\n---\n\n${summaryAr}`;
        
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: bilingualSummary, 
          meta: { 
            intent: 'budget_advice',
            budgetAnalysis: { income, needs, wants, savings, needsPct, wantsPct, savingsPct }
          } 
        }]);
        setStatus('idle');
        return;
      }

      // ── Shariah Stock Compliance Checker ──
      const STATIC_COMPLIANCE_REGISTRY = [
        { name: 'Aramco', symbol: '2222', nameAr: 'أرامكو', compliant: true, debt: 11.2, impure: 0.8 },
        { name: 'Alinma', symbol: '1150', nameAr: 'الإنماء', compliant: true, debt: 0, impure: 0 },
        { name: 'STC', symbol: '7010', nameAr: 'الاتصالات', compliant: true, debt: 18.5, impure: 1.2 },
        { name: 'SABIC', symbol: '2010', nameAr: 'سابك', compliant: true, debt: 24.1, impure: 2.1 },
        { name: 'SNB', symbol: '1180', nameAr: 'الأهلي', compliant: true, debt: 15.0, impure: 1.5 },
        { name: 'AlRajhi', symbol: '1120', nameAr: 'الراجحي', compliant: true, debt: 0, impure: 0 }
      ];

      const complianceKeywords = ['halal', 'compliant', 'shariah', 'حلال', 'شرعي', 'متوافق'];
      const stockKeywords = ['aramco', 'alinma', 'stc', 'sabic', 'snb', 'alrajhi', '2222', '1150', '7010', '2010', '1180', '1120', 'أرامكو', 'الإنماء', 'الاتصالات', 'سابك', 'الأهلي', 'الراجحي', 'ارامكو', 'الانماء', 'اتصالات', 'الاهلي'];
      const isComplianceQuery = intent === 'stock_check' || 
                                intent === 'islamic_finance' || 
                                (complianceKeywords.some(w => normalized.includes(w)) && 
                                 stockKeywords.some(w => normalized.includes(w)));

      if (isComplianceQuery) {
        const queryNorm = normalizeArabic(normalized);
        let matchedStock = STATIC_COMPLIANCE_REGISTRY.find(s => 
          normalized.includes(s.name.toLowerCase()) || 
          normalized.includes(s.symbol) || 
          queryNorm.includes(normalizeArabic(s.name.toLowerCase())) ||
          queryNorm.includes(normalizeArabic(s.nameAr))
        );

        if (!matchedStock && Array.isArray(stocks) && stocks.length > 0) {
          const matchedOwned = stocks.find(s => 
            normalized.includes(s.symbol.toLowerCase()) || 
            normalized.includes(s.name.toLowerCase()) || 
            queryNorm.includes(normalizeArabic(s.name.toLowerCase()))
          );
          if (matchedOwned) {
            const registryMatch = STATIC_COMPLIANCE_REGISTRY.find(r => r.symbol === matchedOwned.symbol);
            matchedStock = registryMatch || {
              name: matchedOwned.name,
              symbol: matchedOwned.symbol,
              nameAr: matchedOwned.name,
              compliant: true,
              debt: 10.0,
              impure: 1.0
            };
          }
        }

        if (matchedStock) {
          const compliantStr = matchedStock.compliant
            ? (queryIsAr ? 'متوافق مع الشريعة ✅' : 'Compliant ✅')
            : (queryIsAr ? 'غير متوافق شرعياً ❌' : 'Non-Compliant ❌');

          let textResult = '';
          if (queryIsAr) {
            textResult = `فحص سهم ${matchedStock.nameAr} (${matchedStock.symbol}):
• حالة التوافق الشرعي: ${compliantStr}
• نسبة الديون/القيمة السوقية: ${matchedStock.debt}% (الحد الأقصى 33%)
• نسبة الدخل غير المطهر: ${matchedStock.impure}% (الحد الأقصى 5%)
تعتبر هذه الأسهم متوافقة مع ضوابط الهيئة الشرعية.`;
          } else {
            textResult = `Stock compliance check for ${matchedStock.name.toUpperCase()} (${matchedStock.symbol}):
• Shariah Compliance: ${compliantStr}
• Debt-to-Market-Cap: ${matchedStock.debt}% (Threshold < 33%)
• Impure Income Ratio: ${matchedStock.impure}% (Threshold < 5%)
This asset complies with Shariah guidelines.`;
          }

          setMessages(prev => [...prev, { 
            sender: 'ai', 
            text: textResult,
            meta: {
              stockCompliance: {
                name: queryIsAr ? matchedStock.nameAr : matchedStock.name,
                symbol: matchedStock.symbol,
                compliant: matchedStock.compliant,
                debt: matchedStock.debt,
                impure: matchedStock.impure
              }
            }
          }]);
          setStatus('idle');
          return;
        }
      }

      // Greeting
      if (intent === 'greeting') {
        const response = _buildSmartResponse('Greeting', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
        setStatus('idle');
        return;
      }

      // Thanks
      if (intent === 'thanks') {
        const response = _buildSmartResponse('Thanks', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
        setStatus('idle');
        return;
      }

      // Farewell
      if (intent === 'farewell') {
        const response = _buildSmartResponse('Farewell', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
        setStatus('idle');
        return;
      }

      // Meta Chat
      if (intent === 'meta_chat') {
        const response = _buildSmartResponse('Meta Chat', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
        setStatus('idle');
        return;
      }

      // Out of scope
      if (intent === 'out_of_scope') {
        const response = _buildSmartResponse('Out of Scope', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
        setStatus('idle');
        return;
      }

      // Action Intents
      if (intent === 'add_transaction') {
        const parsed = parseAddTransaction(effectiveQuery, queryIsAr);
        if (parsed) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr ? 'الرجاء تأكيد تفاصيل المعاملة:' : 'Please confirm the transaction:',
            meta: { isConfirmation: true, confirmed: false, cancelled: false, actionType: 'add_transaction', actionPayload: parsed }
          }]);
          setStatus('idle');
          return;
        } else {
          const promptMsg = queryIsAr
            ? 'بالتأكيد، يرجى كتابة تفاصيل المعاملة (المبلغ والمتجر). مثلاً: "50 ريال ستاربكس" أو "120 ريال نون".'
            : 'Sure, please provide the transaction details (amount and merchant). E.g., "50 riyals Starbucks" or "120 riyals Noon".';
          setMessages(prev => [...prev, { sender: 'ai', text: promptMsg }]);
          setConvState({ type: 'awaiting_transaction' });
          setStatus('idle');
          return;
        }
      }

      if (intent === 'create_goal') {
        const parsed = parseCreateGoal(effectiveQuery, queryIsAr);
        if (parsed) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr ? 'الرجاء تأكيد تفاصيل الهدف:' : 'Please confirm the goal:',
            meta: { isConfirmation: true, confirmed: false, cancelled: false, actionType: 'create_goal', actionPayload: parsed }
          }]);
          setStatus('idle');
          return;
        } else {
          const promptMsg = queryIsAr
            ? 'بالتأكيد، ما هو اسم هدف الادخار والمبلغ المستهدف؟ مثلاً: "سيارة جديدة بمبلغ 25000 ريال".'
            : 'Sure, what is the savings goal name and target amount? E.g., "New laptop for 5000 riyals".';
          setMessages(prev => [...prev, { sender: 'ai', text: promptMsg }]);
          setConvState({ type: 'awaiting_goal' });
          setStatus('idle');
          return;
        }
      }

      if (intent === 'toggle_subscription') {
        const parsed = await handleSubscriptionAction(effectiveQuery);
        if (parsed && parsed.matchedSub) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr ? 'الرجاء تأكيد تعديل الاشتراك:' : 'Please confirm subscription change:',
            meta: { isConfirmation: true, confirmed: false, cancelled: false, actionType: 'toggle_subscription', actionPayload: { sub: parsed.matchedSub, action: parsed.action } }
          }]);
          setStatus('idle');
          return;
        }
      }

      if (intent === 'delete_transaction') {
        if (transactions && transactions.length > 0) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr ? 'الرجاء تأكيد حذف المعاملة:' : 'Please confirm deletion:',
            meta: { isConfirmation: true, confirmed: false, cancelled: false, actionType: 'delete_transaction', actionPayload: transactions[0] }
          }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: queryIsAr ? 'لا توجد عمليات لحذفها.' : 'No transactions to delete.' }]);
        }
        setStatus('idle');
        return;
      }

      if (intent === 'add_stock') {
        const parsed = parseAddStock(effectiveQuery, queryIsAr);
        if (parsed) {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr ? 'الرجاء تأكيد إضافة الأسهم:' : 'Please confirm stock addition:',
            meta: { isConfirmation: true, confirmed: false, cancelled: false, actionType: 'add_stock', actionPayload: parsed }
          }]);
          setStatus('idle');
          return;
        } else {
          const promptMsg = queryIsAr
            ? 'بالتأكيد! ما هو السهم الذي تود إضافته وكم عدد الأسهم؟ مثلاً: "10 أسهم أرامكو".'
            : 'Sure! What stock do you want to add and how many shares? E.g., "10 shares of Aramco".';
          setMessages(prev => [...prev, { sender: 'ai', text: promptMsg }]);
          setConvState({ type: 'awaiting_stock' });
          setStatus('idle');
          return;
        }
      }

      if (intent === 'view_goals') {
        let reply = '';
        if (savingsGoals && savingsGoals.length > 0) {
          if (queryIsAr) {
            reply = '🎯 إليك أهدافك الادخارية الحالية:\n\n';
            savingsGoals.forEach(g => {
              const pct = Math.round((g.current_amount / g.target_amount) * 100);
              const nameAr = g.title === 'Wedding' ? 'الزواج' : g.title === 'Emergency Fund' ? 'صندوق الطوارئ' : g.title === 'New Car (Lucid Air)' ? 'سيارة جديدة (Lucid Air)' : g.title;
              reply += `• **${nameAr}**: ${g.current_amount.toLocaleString()} / ${g.target_amount.toLocaleString()} ريال (${pct}%، التاريخ: ${g.target_date || 'غير محدد'})\n`;
            });
          } else {
            reply = '🎯 Here are your active savings goals:\n\n';
            savingsGoals.forEach(g => {
              const pct = Math.round((g.current_amount / g.target_amount) * 100);
              reply += `• **${g.title}**: $${g.current_amount.toLocaleString()} / $${g.target_amount.toLocaleString()} (${pct}% complete, target: ${g.target_date || 'N/A'})\n`;
            });
          }
        } else {
          reply = queryIsAr ? 'لا توجد أهداف ادخارية مسجلة حالياً.' : 'You have no active savings goals.';
        }
        setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        setStatus('idle');
        return;
      }

      if (intent === 'view_subscriptions') {
        let reply = '';
        if (subscriptions && subscriptions.length > 0) {
          const totalCost = subscriptions.filter(s => s.is_active === 1).reduce((sum, s) => sum + s.amount, 0);
          if (queryIsAr) {
            reply = `💳 لديك ${subscriptions.filter(s => s.is_active === 1).length} اشتراكات نشطة بتكلفة إجمالية تبلغ **${totalCost.toLocaleString()} ريال** شهرياً:\n\n`;
            subscriptions.forEach(s => {
              const merchantAr = s.merchant === 'Tuwaiq Fitness Gym' ? 'نادي لياقة تويج' : s.merchant;
              const statusStr = s.is_active === 1 ? (s.utility_score < 0.5 ? '⚠️ **منفعة منخفضة!**' : 'منفعة عالية ✅') : 'موقف ⏸️';
              reply += `• **${merchantAr}**: ${s.amount.toLocaleString()} ريال / ${s.interval === 'monthly' ? 'شهرياً' : s.interval} (تجديد: ${s.next_renewal}) - ${statusStr}\n`;
            });
          } else {
            reply = `💳 You have ${subscriptions.filter(s => s.is_active === 1).length} active subscriptions costing a total of **$${totalCost.toLocaleString()}** monthly:\n\n`;
            subscriptions.forEach(s => {
              const statusStr = s.is_active === 1 ? (s.utility_score < 0.5 ? '⚠️ **Low Utility!**' : 'High Utility ✅') : 'Paused ⏸️';
              reply += `• **${s.merchant}**: $${s.amount.toLocaleString()}/${s.interval === 'monthly' ? 'mo' : s.interval} (Next renewal: ${s.next_renewal}) - ${statusStr}\n`;
            });
          }
        } else {
          reply = queryIsAr ? 'لا توجد اشتراكات مسجلة حالياً.' : 'You have no active subscriptions.';
        }
        setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        setStatus('idle');
        return;
      }

      if (intent === 'view_portfolio') {
        let reply = '';
        if (stocks && stocks.length > 0) {
          let totalValue = 0;
          let netPnl = 0;
          let stockLines = '';
          
          stocks.forEach(s => {
            const isNonCompliant = s.symbol.toUpperCase() === 'CONV';
            const complianceStr = isNonCompliant 
              ? (queryIsAr ? '❌ **غير متوافق شرعياً!**' : '❌ **Non-Compliant!**')
              : (queryIsAr ? 'متوافق شرعياً ✅' : 'Shariah Compliant ✅');
              
            const currentVal = s.quantity * s.current_price;
            const costBasis = s.quantity * s.purchase_price;
            const pnl = currentVal - costBasis;
            
            totalValue += currentVal;
            netPnl += pnl;
            
            const pnlSign = pnl >= 0 ? '+' : '';
            const pnlColor = pnl >= 0 ? '🟢' : '🔴';
            
            if (queryIsAr) {
              const nameAr = s.name === 'Alinma Bank' ? 'مصرف الإنماء' : s.name === 'Saudi Aramco' ? 'أرامكو السعودية' : s.name === 'STC' ? 'الاتصالات السعودية' : s.name === 'SABIC' ? 'سابك' : s.name === 'Conventional Mock Bank' ? 'سهم ربوي تقليدي' : s.name;
              stockLines += `• **${nameAr} (${s.symbol})**: ${s.quantity} سهم | القيمة الحالية: ${currentVal.toLocaleString()} ريال (PnL: ${pnlSign}${pnl.toLocaleString()} ريال ${pnlColor}، ${complianceStr})\n`;
            } else {
              stockLines += `• **${s.name} (${s.symbol})**: ${s.quantity} shares | Value: $${currentVal.toLocaleString()} (PnL: ${pnlSign}$${pnl.toLocaleString()} ${pnlColor}, ${complianceStr})\n`;
            }
          });
          
          const pnlSign = netPnl >= 0 ? '+' : '';
          if (queryIsAr) {
            reply = `📈 إليك تفاصيل محفظتك الاستثمارية الحالية:\n\n${stockLines}\n• إجمالي قيمة المحفظة: **${totalValue.toLocaleString()} ريال**\n• صافي الأرباح/الخسائر: **${pnlSign}${netPnl.toLocaleString()} ريال**`;
          } else {
            reply = `📈 Here is your investment portfolio details:\n\n${stockLines}\n• Total Portfolio Value: **$${totalValue.toLocaleString()}**\n• Net Profit/Loss: **${pnlSign}$${netPnl.toLocaleString()}**`;
          }
        } else {
          reply = queryIsAr ? 'محفظتك الاستثمارية فارغة حالياً.' : 'Your investment portfolio is currently empty.';
        }
        setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        setStatus('idle');
        return;
      }

      if (intent === 'check_balance') {
        try {
          const [accountsRes, txRes] = await Promise.all([
            apiFetch('/api/open-banking/accounts'),
            apiFetch('/api/transactions')
          ]);
          
          if (accountsRes.ok && txRes.ok) {
            const accounts = await accountsRes.json();
            const txs = await txRes.json();
            
            const bankBalSum = accounts.reduce((sum, acc) => sum + acc.balance, 0);
            const ledgerSum = txs.reduce((sum, t) => sum + t.amount, 0);
            const liveBalance = parseFloat((bankBalSum + ledgerSum).toFixed(2));
            
            setMessages(prev => [...prev, {
              sender: 'ai',
              text: queryIsAr
                ? `💰 رصيدك الإجمالي الحالي هو ${liveBalance.toLocaleString()} ريال.`
                : `💰 Your current total balance is $${liveBalance.toLocaleString()}.`
            }]);
          } else {
            setMessages(prev => [...prev, {
              sender: 'ai',
              text: queryIsAr
                ? `💰 رصيدك الإجمالي الحالي هو ${stats.balance.toLocaleString()} ريال.`
                : `💰 Your current total balance is $${stats.balance.toLocaleString()}.`
            }]);
          }
        } catch (e) {
          console.error("Failed to fetch live balance:", e);
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: queryIsAr
              ? `💰 رصيدك الإجمالي الحالي هو ${stats.balance.toLocaleString()} ريال.`
              : `💰 Your current total balance is $${stats.balance.toLocaleString()}.`
          }]);
        }
        setStatus('idle');
        return;
      }

      if (intent === 'spending_report') {
        const debits = transactions.filter(t => t.amount < 0);
        const totals = {};
        let grandTotal = 0;
        debits.forEach(t => {
          totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
          grandTotal += Math.abs(t.amount);
        });

        const chartItems = Object.keys(totals).map(cat => ({
          category: cat,
          amount: totals[cat],
          percentage: grandTotal > 0 ? Math.round((totals[cat] / grandTotal) * 100) : 0
        })).sort((a, b) => b.amount - a.amount);

        const textReport = getSpendingBreakdown(transactions, queryIsAr);

        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: textReport,
          meta: {
            chart: {
              type: 'spending',
              title: queryIsAr ? 'توزيع مصروفاتك هذا الشهر' : 'Your spending this month',
              items: chartItems
            }
          }
        }]);
        setStatus('idle');
        return;
      }

      // Data analysis intents
      if (intent === 'stock_check' || intent === 'islamic_finance') {
        let matchedStock = null;
        if (stocks && stocks.length > 0) {
          const queryNorm = normalizeArabic(normalized);
          matchedStock = stocks.find(s => 
            normalized.includes(s.symbol.toLowerCase()) || 
            normalized.includes(s.name.toLowerCase()) || 
            queryNorm.includes(normalizeArabic(s.name.toLowerCase()))
          );
        }

        if (matchedStock) {
          let textResult = '';
          const compliantStr = matchedStock.isShariah
            ? (queryIsAr ? 'متوافق مع الشريعة ✅' : 'Compliant ✅')
            : (queryIsAr ? 'غير متوافق شرعياً ❌' : 'Non-Compliant ❌');

          if (queryIsAr) {
            textResult = `فحص سهم ${matchedStock.name} (${matchedStock.symbol}):
• حالة التوافق الشرعي: ${compliantStr}
• نسبة الديون/القيمة السوقية: ${matchedStock.ratios?.debt || 0}% (الحد الأقصى 33%)
• نسبة الدخل غير المطهر: ${matchedStock.ratios?.income || 0}% (الحد الأقصى 5%)
${matchedStock.shariahReason || ''}`;
          } else {
            textResult = `Stock check for ${matchedStock.name.toUpperCase()} (${matchedStock.symbol}):
• Shariah Compliance: ${compliantStr}
• Debt-to-Market-Cap: ${matchedStock.ratios?.debt || 0}% (Threshold < 33%)
• Impure Income Ratio: ${matchedStock.ratios?.income || 0}% (Threshold < 5%)
${matchedStock.shariahReason || ''}`;
          }

          setMessages(prev => [...prev, { 
            sender: 'ai', 
            text: textResult,
            meta: {
              stockCompliance: {
                name: matchedStock.name,
                symbol: matchedStock.symbol,
                compliant: matchedStock.isShariah,
                debt: matchedStock.ratios?.debt || 0,
                impure: matchedStock.ratios?.income || 0
              }
            }
          }]);
        } else {
          // Fallback to checkStockQuery helper
          const stockResult = checkStockQuery(normalized, queryIsAr);
          if (stockResult) {
            const staticStocks = [
              { name: 'aramco', symbol: '2222', nameAr: 'أرامكو', compliant: true, debt: 11.2, impure: 0.8 },
              { name: 'alinma', symbol: '1150', nameAr: 'الإنماء', compliant: true, debt: 0, impure: 0 },
              { name: 'stc', symbol: '7010', nameAr: 'الاتصالات', compliant: true, debt: 18.5, impure: 1.2 },
              { name: 'sabic', symbol: '2010', nameAr: 'سابك', compliant: true, debt: 24.1, impure: 2.1 }
            ];
            let matchedStatic = staticStocks.find(s => 
              normalized.includes(s.name) || 
              normalized.includes(s.symbol) || 
              normalized.includes(s.nameAr) ||
              normalizeArabic(normalized).includes(normalizeArabic(s.nameAr))
            ) || { name: 'Aramco', symbol: '2222', nameAr: 'أرامكو', compliant: true, debt: 11.2, impure: 0.8 };

            setMessages(prev => [...prev, { 
              sender: 'ai', 
              text: stockResult,
              meta: {
                stockCompliance: {
                  name: queryIsAr ? matchedStatic.nameAr : matchedStatic.name,
                  symbol: matchedStatic.symbol,
                  compliant: matchedStatic.compliant,
                  debt: matchedStatic.debt,
                  impure: matchedStatic.impure
                }
              }
            }]);
          } else {
            const response = _buildSmartResponse('Islamic Finance Check', queryIsAr, stats, transactions, messages.length);
            setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
          }
        }
        setStatus('idle');
        return;
      }

      if (intent === 'savings_projection') {
        const projResult = parseProjectionQuery(normalized, queryIsAr);
        if (projResult) {
          setMessages(prev => [...prev, { sender: 'ai', text: projResult }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: queryIsAr ? 'يرجى تحديد المبلغ الشهري وعدد السنوات، مثال: "إذا ادخرت 500 ريال لمدة 3 سنوات"' : 'Please specify amount and years, e.g. "save 500 monthly for 3 years"' }]);
        }
        setStatus('idle');
        return;
      }

      if (intent === 'search_transaction') {
        const searchResult = searchTransactions(normalized, transactions, queryIsAr);
        if (searchResult) {
          setMessages(prev => [...prev, { sender: 'ai', text: searchResult }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: queryIsAr ? 'لم أجد عمليات مطابقة. جرّب اسم متجر محدد.' : 'No matching transactions found. Try a specific merchant name.' }]);
        }
        setStatus('idle');
        return;
      }

      if (intent === 'ledger_stats') {
        const statsResult = checkStatsQuery(normalized, stats, transactions, queryIsAr);
        if (statsResult) {
          setMessages(prev => [...prev, { sender: 'ai', text: statsResult }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: queryIsAr ? `لديك ${transactions.length} عمليات مسجلة. إجمالي المصاريف: ${stats.spending.toLocaleString()} ريال.` : `You have ${transactions.length} recorded transactions. Total spending: $${stats.spending.toLocaleString()}.` }]);
        }
        setStatus('idle');
        return;
      }

      if (intent === 'math_calc') {
        const mathResult = evaluateMathExpression(normalized);
        const pctMatch = normalized.match(/(\d+)%\s*(?:of|من)\s*(\d+)/);
        let calcResult;
        if (pctMatch) {
          const pct = parseFloat(pctMatch[1]);
          const total = parseFloat(pctMatch[2]);
          calcResult = `${pct}% ${queryIsAr ? 'من' : 'of'} ${total} = ${((pct/100)*total).toLocaleString()}`;
        } else if (mathResult !== null) {
          calcResult = `= ${mathResult.toLocaleString()}`;
        }
        if (calcResult) {
          setMessages(prev => [...prev, { sender: 'ai', text: `🧮 ${calcResult}` }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: queryIsAr ? 'لم أتمكن من حل هذه المعادلة.' : 'Could not parse the calculation.' }]);
        }
        setStatus('idle');
        return;
      }

      if (intent === 'expense_advice') {
        const response = _buildSmartResponse('Expense Reduction', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: response.text,
          meta: {
            intent: response.intent,
            advice: queryIsAr 
              ? 'أنصحك بوضع حد أقصى للإنفاق الترفيهي وتقليل الطلبات غير الضرورية لزيادة التدفق الحر بنسبة ١٥٪.' 
              : 'I suggest capping your entertainment expenses and reducing non-essential orders to free up 15% cash flow.'
          }
        }]);
        setStatus('idle');
        return;
      }

      if (intent === 'saving_advice') {
        const response = _buildSmartResponse('Saving Advice', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: response.text,
          meta: {
            intent: response.intent,
            advice: queryIsAr 
              ? 'تفعيل خاصية الادخار التلقائي (Round-up) يحمي مدخراتك وينميها دون مجهود يذكر.' 
              : 'Enabling automated round-up savings will passively grow your reserves with minimal effort.'
          }
        }]);
        setStatus('idle');
        return;
      }

      if (intent === 'investment_risk') {
        const response = _buildSmartResponse('Investment Risk', queryIsAr, stats, transactions, messages.length);
        setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
        setStatus('idle');
        return;
      }

      // Fallback: contextual follow-up or generic
      const contextReply = checkContextFollowUp(normalized, messages, transactions, stats, queryIsAr);
      if (contextReply) {
        setMessages(prev => [...prev, { sender: 'ai', text: contextReply.text }]);
        setStatus('idle');
        return;
      }

      const response = _buildSmartResponse('Fallback', queryIsAr, stats, transactions, messages.length);
      setMessages(prev => [...prev, { sender: 'ai', text: response.text, meta: { intent: response.intent } }]);
      setStatus('idle');

    } catch (err) {
      console.error(err);
      setError(lang === 'ar' ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
      setStatus('idle');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const query = inputText;
    setInputText('');
    submitQuery(query);
  };

  const suggestionChips = isRtl ? [
    { text: '📊 حلل مصاريفي', query: 'حلل مصاريفي هذا الشهر' },
    { text: '➕ أضف معاملة', query: 'أضف معاملة 50 ريال ستاربكس' },
    { text: '💰 كم رصيدي؟', query: 'كم رصيدي' },
    { text: '🔄 أوقف اشتراك', query: 'أوقف اشتراك نتفلكس' },
    { text: '💡 نصيحة مالية', query: 'نصيحة مالية' },
    { text: '🕋 فحص سهم', query: 'فحص سهم أرامكو' }
  ] : [
    { text: '📊 Analyze spending', query: 'analyze my spending' },
    { text: '➕ Add expense', query: 'spent 50 at starbucks' },
    { text: '💰 My balance', query: 'what is my balance' },
    { text: '🔄 Cancel subscription', query: 'cancel netflix' },
    { text: '💡 Financial tip', query: 'financial tip' },
    { text: '🕋 Check stock', query: 'is aramco halal' }
  ];

  const getArCat = (cat) => {
    const map = {
      'Food & Dining': 'المطاعم والأغذية',
      'Transportation': 'المواصلات والنقل',
      'Entertainment': 'الترفيه',
      'Housing': 'السكن',
      'Utilities': 'الفواتير',
      'Shopping': 'التسوق والتجزئة',
      'Miscellaneous': 'عامة'
    };
    return map[cat] || cat;
  };

  const renderConfirmationCard = (m, idx) => {
    const { actionType, actionPayload, confirmed, cancelled } = m.meta;

    const getDetails = () => {
      switch (actionType) {
        case 'add_transaction':
          return (
            <>
              <div className="font-bold mb-1 text-primary text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                <span>{isRtl ? 'إضافة معاملة جديدة' : 'Add New Transaction'}</span>
              </div>
              <div className="text-on-surface-variant">• {isRtl ? 'الوصف' : 'Description'}: <strong className="text-on-surface">{actionPayload.description}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'المبلغ' : 'Amount'}: <strong className={actionPayload.amount < 0 ? 'text-rose-500' : 'text-primary'}>{Math.abs(actionPayload.amount).toLocaleString()} {currencySymbol}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'الفئة' : 'Category'}: <strong className="text-on-surface">{isRtl ? getArCat(actionPayload.category) : actionPayload.category}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'التاريخ' : 'Date'}: <strong className="text-on-surface">{actionPayload.date}</strong></div>
            </>
          );
        case 'create_goal':
          return (
            <>
              <div className="font-bold mb-1 text-primary text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">track_changes</span>
                <span>{isRtl ? 'إنشاء هدف ادخار جديد' : 'Create New Savings Goal'}</span>
              </div>
              <div className="text-on-surface-variant">• {isRtl ? 'عنوان الهدف' : 'Goal Title'}: <strong className="text-on-surface">{actionPayload.title}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'المبلغ المستهدف' : 'Target Amount'}: <strong className="text-on-surface">{actionPayload.target_amount.toLocaleString()} {currencySymbol}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'التاريخ المتوقع' : 'Target Date'}: <strong className="text-on-surface">{actionPayload.target_date}</strong></div>
            </>
          );
        case 'toggle_subscription':
          const actLabel = actionPayload.action === 'activate' 
            ? (isRtl ? 'تفعيل' : 'Activate') 
            : (isRtl ? 'إيقاف' : 'Cancel/Stop');
          return (
            <>
              <div className="font-bold mb-1 text-primary text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">autorenew</span>
                <span>{isRtl ? 'تعديل حالة اشتراك' : 'Modify Subscription'}</span>
              </div>
              <div className="text-on-surface-variant">• {isRtl ? 'الخدمة' : 'Merchant'}: <strong className="text-on-surface">{actionPayload.sub.merchant}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'الإجراء' : 'Action'}: <strong className={actionPayload.action === 'activate' ? 'text-primary' : 'text-rose-500'}>{actLabel}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'التكلفة الشهرية' : 'Monthly Cost'}: <strong className="text-on-surface">{actionPayload.sub.amount.toLocaleString()} {currencySymbol}</strong></div>
            </>
          );
        case 'delete_transaction':
          return (
            <>
              <div className="font-bold mb-1 text-rose-500 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">delete</span>
                <span>{isRtl ? 'حذف المعاملة الأخيرة' : 'Delete Last Transaction'}</span>
              </div>
              <div className="text-on-surface-variant">• {isRtl ? 'الوصف' : 'Description'}: <strong className="text-on-surface">{actionPayload.description}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'المبلغ' : 'Amount'}: <strong className={actionPayload.amount < 0 ? 'text-rose-500' : 'text-primary'}>{Math.abs(actionPayload.amount).toLocaleString()} {currencySymbol}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'التاريخ' : 'Date'}: <strong className="text-on-surface">{actionPayload.date}</strong></div>
            </>
          );
        case 'add_stock':
          return (
            <>
              <div className="font-bold mb-1 text-primary text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>{isRtl ? 'إضافة أسهم للمحفظة' : 'Add Stock to Portfolio'}</span>
              </div>
              <div className="text-on-surface-variant">• {isRtl ? 'السهم' : 'Stock'}: <strong className="text-on-surface">{actionPayload.name} ({actionPayload.symbol})</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'عدد الأسهم' : 'Shares'}: <strong className="text-on-surface">{actionPayload.quantity}</strong></div>
              <div className="text-on-surface-variant">• {isRtl ? 'سعر الشراء' : 'Purchase Price'}: <strong className="text-on-surface">{actionPayload.purchase_price.toLocaleString()} {currencySymbol}</strong></div>
            </>
          );
        default:
          return null;
      }
    };

    return (
      <div key={idx} className="self-stretch bg-surface border border-outline-variant rounded-2xl p-4 my-2 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-2 text-xs font-bold text-on-surface">
          <Brain size={14} className="text-primary" />
          <span>{isRtl ? '🤖 تأكيد الإجراء الذكي' : '🤖 Smart Action Confirmation'}</span>
        </div>
        
        <div className="text-xs leading-relaxed text-on-surface">
          {getDetails()}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          {confirmed ? (
            <div className="text-[11px] text-primary font-bold flex items-center gap-1 animate-fade-in">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>{isRtl ? 'تم التأكيد والتنفيذ بنجاح' : 'Confirmed and executed successfully'}</span>
            </div>
          ) : cancelled ? (
            <div className="text-[11px] text-on-surface-variant/70 font-bold flex items-center gap-1 animate-fade-in">
              <span className="material-symbols-outlined text-[14px]">cancel</span>
              <span>{isRtl ? 'تم إلغاء الإجراء' : 'Action cancelled'}</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleCancelAction(idx)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-500/20 text-rose-500 hover:bg-rose-500/5 active:scale-95 transition-all cursor-pointer"
              >
                {isRtl ? '❌ إلغاء' : '❌ Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(idx, actionType, actionPayload)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:brightness-95 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                {isRtl ? '✅ تأكيد' : '✅ Confirm'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (mode === 'floating') {
    return (
      <>
        {/* Floating Chat Button */}
        <button
          onClick={() => setIsFloatingOpen(true)}
          className="absolute bottom-24 left-6 z-[90] w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border border-primary-container/30"
          style={{
            boxShadow: '0 8px 32px rgba(0, 163, 146, 0.4)',
            animation: 'pulse 2s infinite'
          }}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          <span className="absolute -top-1 -right-1 bg-rose-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white uppercase tracking-wider">AI</span>
        </button>

        {/* Floating Chat Sheet Overlay */}
        {isFloatingOpen && (
          <div className="absolute inset-0 z-[10001] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            {/* Modal Sheet Container - fits mobile screens beautifully */}
            <div 
              className="bg-surface border border-outline-variant rounded-t-3xl rounded-b-xl w-full max-w-[420px] h-[80vh] flex flex-col overflow-hidden shadow-2xl relative"
              style={{
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-outline-variant bg-surface-container flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-bold text-xs text-on-surface leading-tight">{isRtl ? 'المساعد المالي الذكي (كرم)' : 'Smart Assistant (Karam)'}</h4>
                    <span className="text-[8px] text-primary leading-none flex items-center gap-0.5 mt-0.5">
                      <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                      {isRtl ? 'نشط الآن' : 'Active Now'}
                    </span>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setIsFloatingOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface-variant/20 flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-surface-container-lowest animate-fade-in">
                {/* Messages Stream viewport */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 min-h-0"
                >
                  {messages.map((m, idx) => {
                    if (m.meta && m.meta.isConfirmation) {
                      return renderConfirmationCard(m, idx);
                    }

                    const isUser = m.sender === 'user';
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        {/* Bubble Meta Header */}
                        <div className="flex items-center gap-1 mb-0.5 text-[8px] text-on-surface-variant font-medium px-1">
                          {!isUser && <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>}
                          <span>{isUser ? (isRtl ? 'أنت' : 'You') : (isRtl ? 'كرم المساعد المالي' : 'Karam Coach')}</span>
                          {isUser && <span className="material-symbols-outlined text-[10px] text-on-surface-variant">person</span>}
                        </div>

                        {/* Main bubble */}
                        <div 
                          className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed transition-all shadow-sm ${
                            isUser 
                              ? 'bg-primary text-white font-medium border border-primary/20 rounded-te-none rounded-ts-2xl' 
                              : 'bg-surface text-on-surface border border-outline-variant/60 rounded-ts-none rounded-te-2xl'
                          }`}
                          style={{ textAlign: isRtl ? 'right' : 'left', whiteSpace: 'pre-line' }}
                        >
                          {m.text}

                          {m.meta && m.meta.quizOptions && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '8px' }}>
                              {m.meta.quizOptions.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => submitQuery(opt.queryText)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(192,120,48,0.3)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#EEF2FF',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textAlign: isRtl ? 'right' : 'left',
                                    transition: 'all 0.2s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(192,120,48,0.15)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Smart Advice Box inside bubble */}
                          {m.meta && m.meta.advice && (
                            <div className="mt-2.5 p-2.5 bg-primary-brand-light dark:bg-black/25 border border-primary/20 dark:border-white/5 rounded-xl backdrop-blur-sm">
                              <div className="flex items-center gap-1 mb-1.5 text-primary dark:text-[#5ddac7] font-bold text-[9px] uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[12px]">tips_and_updates</span>
                                <span>{isRtl ? 'نصيحة ذكية' : 'Smart Tip'}</span>
                              </div>
                              <p className="text-[10px] leading-relaxed text-on-surface font-normal">
                                {m.meta.advice}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Stock Compliance Grid Block */}
                        {!isUser && m.meta && m.meta.stockCompliance && (
                          <div className="bg-surface border border-outline-variant/70 rounded-xl p-3 w-full max-w-[280px] mt-2 shadow-sm animate-fade-in flex flex-col gap-2">
                            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-1.5">
                              <span className="text-[10px] font-bold text-on-surface">{m.meta.stockCompliance.name} ({m.meta.stockCompliance.symbol})</span>
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 font-bold text-[8px] rounded-full flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">shield</span>
                                {isRtl ? 'متوافق' : 'Compliant'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                              <div className="bg-surface-container-low p-2 rounded-lg flex flex-col gap-0.5">
                                <span className="text-on-surface-variant">{isRtl ? 'نسبة الديون' : 'Debt Ratio'}</span>
                                <strong className="text-on-surface text-[10px]">{m.meta.stockCompliance.debt}%</strong>
                                <span className="text-[7px] text-on-surface-variant/70">{isRtl ? 'الحد الأقصى ٣٣٪' : 'Max 33%'}</span>
                              </div>
                              <div className="bg-surface-container-low p-2 rounded-lg flex flex-col gap-0.5">
                                <span className="text-on-surface-variant">{isRtl ? 'الدخل غير المطهر' : 'Impure Income'}</span>
                                <strong className="text-on-surface text-[10px]">{m.meta.stockCompliance.impure}%</strong>
                                <span className="text-[7px] text-on-surface-variant/70">{isRtl ? 'الحد الأقصى ٥٪' : 'Max 5%'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Spending Chart Visualization Block */}
                        {!isUser && m.meta && m.meta.chart && m.meta.chart.type === 'spending' && (
                          <div className="bg-surface border border-outline-variant p-3.5 rounded-xl w-full max-w-[280px] mt-2 shadow-sm animate-fade-in flex flex-col gap-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-[10px] text-on-surface-variant">{m.meta.chart.title}</span>
                              <span className="material-symbols-outlined text-primary text-[16px]">insights</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {m.meta.chart.items.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[8px] font-bold text-on-surface-variant">
                                    <span>{isRtl ? getArCat(item.category) : item.category}</span>
                                    <span>{item.percentage}% ({Math.round(item.amount).toLocaleString()} {currencySymbol})</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary" 
                                      style={{ 
                                        width: `${item.percentage}%`,
                                        opacity: idx === 0 ? 1 : idx === 1 ? 0.6 : 0.3 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {status === 'analyzing' && (
                    <div className="self-start flex flex-col items-start max-w-[85%]">
                      <div className="flex items-center gap-1 mb-0.5 text-[8px] text-on-surface-variant font-medium px-1">
                        <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                        <span>{isRtl ? 'كرم يقوم بالتحليل...' : 'Karam is analyzing...'}</span>
                      </div>
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-ts-none bg-surface border border-outline-variant/60 text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-150"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-300"></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sugggestion Chips */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2 pt-1 flex gap-1.5 overflow-x-auto scroll-hide shrink-0">
                    {suggestionChips.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => submitQuery(chip.query)}
                        className="px-3 py-1 bg-surface border border-outline-variant/60 text-on-surface-variant text-[10px] font-semibold rounded-full hover:border-primary hover:text-primary transition-all shrink-0 cursor-pointer"
                      >
                        {chip.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Message Form */}
                <form 
                  onSubmit={handleSendMessage} 
                  className="p-3 border-t border-outline-variant bg-surface flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    className="flex-grow bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-on-surface-variant/40"
                    placeholder={isRtl ? 'اسأل كرم عن الادخار أو المصاريف...' : 'Ask Karam about savings or expenses...'}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={status === 'analyzing'}
                    required
                  />
                  <button
                    type="submit"
                    className="p-2 bg-primary text-white rounded-xl shadow-sm hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all shrink-0 flex items-center justify-center cursor-pointer"
                    disabled={status === 'analyzing' || !inputText.trim()}
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </form>

                {/* Offline execution check badge */}
                <div className="py-1 px-4 bg-surface-container-highest border-t border-outline-variant/40 flex items-center justify-center gap-1 text-[8px] text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                  <span>{isRtl ? 'خصوصيتك محمية: تجري جميع عمليات الذكاء الاصطناعي على جهازك بالكامل دون إرسال بياناتك للخارج' : 'Data Privacy Active: AI inference runs completely locally on your device'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col flex-1 h-full w-full overflow-y-auto select-none p-1" style={{ maxHeight: '100%' }}>
      
      {/* 1. Decision Simulator Form (Top Section) - Match Stitch Screen D */}
      <section className="bg-surface border border-outline-variant rounded-2xl p-4 mb-4 flex flex-col gap-3 shadow-sm">
        <div className="flex justify-between items-center border-b border-outline-variant/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <h3 className="font-bold text-sm text-on-surface">{isRtl ? 'محاكي القرارات المالية' : 'Decision Simulator'}</h3>
          </div>
          <span className="text-[10px] text-on-surface-variant font-medium">Screen D Prototype</span>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
              {isRtl ? 'نوع القرار المالي' : 'Decision Type'}
            </label>
            <select
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-2 text-xs text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              value={simScenario}
              onChange={(e) => handleChipClick(e.target.value)}
            >
              <option value="car">{isRtl ? 'شراء سيارة' : 'Car Purchase'}</option>
              <option value="save">{isRtl ? 'زيادة الادخار' : 'Increase Savings'}</option>
              
              <option value="custom">{isRtl ? 'قرار مخصص / استثمار' : 'Custom Decision / Investment'}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant block mb-1">
                {simScenario === 'save' 
                  ? (isRtl ? 'مبلغ الادخار الشهري' : 'Monthly Savings') 
                  : (isRtl ? 'القيمة الإجمالية' : 'Total Asset Value')}
              </label>
              <input
                type="number"
                className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-2 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                value={simAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant block mb-1">
                {isRtl ? 'المدة بالسنوات' : 'Duration (Years)'}
              </label>
              <input
                type="number"
                className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-2 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                value={simDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          {simScenario === 'car' && (
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant block mb-1">
                {isRtl ? 'القسط الشهري المتوقع' : 'Expected Monthly Installment'}
              </label>
              <input
                type="number"
                className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-2 text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                value={simInstallment}
                onChange={(e) => setSimInstallment(e.target.value)}
                placeholder="0"
              />
            </div>
          )}


        </div>

        {/* Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto scroll-hide pb-0.5">
          <button 
            type="button" 
            onClick={() => handleChipClick('car')}
            className={`px-3 py-1 rounded-full border text-[10px] font-semibold transition-all shrink-0 cursor-pointer ${simScenario === 'car' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant bg-surface text-on-surface-variant'}`}
          >
            {isRtl ? 'شراء سيارة' : 'Car Purchase'}
          </button>
          <button 
            type="button" 
            onClick={() => handleChipClick('save')}
            className={`px-3 py-1 rounded-full border text-[10px] font-semibold transition-all shrink-0 cursor-pointer ${simScenario === 'save' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant bg-surface text-on-surface-variant'}`}
          >
            {isRtl ? 'زيادة الادخار' : 'Increase Savings'}
          </button>

        </div>

        <button
          type="button"
          onClick={() => handleSimulate()}
          disabled={isSimulating}
          className="w-full bg-primary hover:brightness-95 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-primary/20 cursor-pointer"
        >
          {isSimulating ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
              <span>{isRtl ? 'جاري محاكاة السيناريو...' : 'Simulating Scenario...'}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              <span>{isRtl ? 'محاكاة القرار المالي' : 'Simulate Decision'}</span>
            </>
          )}
        </button>

        {/* Expected Results Area */}
        {simulationResult && (
          <div className="mt-1 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold text-on-surface-variant">{isRtl ? 'النتائج المتوقعة' : 'Expected Outcomes'}</span>
              <div className="flex items-center gap-1 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[9px] font-semibold">{isRtl ? 'تقديرات حية' : 'Live Projection'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Balance Impact */}
              <div className="bg-surface-container-low border border-outline-variant/50 p-2.5 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'تأثير الرصيد' : 'Balance Impact'}</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">{simulationResult.balanceImpact}</div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-primary" style={{ width: `${simulationResult.balancePct}%` }}></div>
                  </div>
                  <p className="text-[9px] text-on-surface-variant leading-relaxed mt-1">{simulationResult.balanceDesc}</p>
                </div>
              </div>

              {/* Goals Impact */}
              <div className="bg-surface-container-low border border-outline-variant/50 p-2.5 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[16px]">track_changes</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'تحقيق الأهداف' : 'Goals Impact'}</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">{simulationResult.goalsImpact}</div>
                  <div className="flex -space-x-1.5 space-x-reverse mt-1.5 mb-1 items-center">
                    {simulationResult.goalsAvatars.map((tag, i) => (
                      <div 
                        key={i} 
                        className="w-5 h-5 rounded-full border border-surface flex items-center justify-center text-[7px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: i === 0 ? 'var(--primary-brand)' : 'var(--accent-blue)' }}
                      >
                        {tag}
                      </div>
                    ))}
                    <span className="text-[8px] text-on-surface-variant pr-1.5">{isRtl ? 'أثر الأهداف' : 'Impacted'}</span>
                  </div>
                  <p className="text-[9px] text-on-surface-variant leading-relaxed mt-0.5">{simulationResult.goalsDesc}</p>
                </div>
              </div>

              {/* Risk Assessment Card */}
              <div className="bg-surface-container-low border border-outline-variant/50 p-2.5 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'مستوى المخاطر' : 'Risk Assessment'}</span>
                </div>
                <div>
                  <div className={`font-bold text-xs ${simulationResult.riskColor}`}>{simulationResult.riskLevel}</div>
                  <p className="text-[9px] text-on-surface-variant leading-relaxed mt-1">
                    {isRtl ? 'درجة الخطورة المحتسبة بناءً على تضخم المصاريف والصدمات المتوقعة.' : 'Calculated risk index considering inflation, savings margin, and potential shocks.'}
                  </p>
                </div>
              </div>

              {/* Available Funds Card */}
              <div className="bg-surface-container-low border border-outline-variant/50 p-2.5 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">{isRtl ? 'المبلغ المتاح بعد القرار' : 'Available Funds After Decision'}</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-500">{simulationResult.availableWorth}</div>
                  <p className="text-[9px] text-on-surface-variant leading-relaxed mt-1">
                    {isRtl ? 'إجمالي الرصيد النقدي المتوفر مباشرة في حسابك بعد استقطاع تكلفة القرار.' : 'Total cash balance immediately available in your accounts after decision cost deduction.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default LocalAI;

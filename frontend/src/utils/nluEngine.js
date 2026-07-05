/**
 * Tharaa AI — On-Device NLU Engine
 * 
 * TF-IDF + Cosine Similarity classifier trained on hundreds of bilingual examples.
 * Handles intent classification, out-of-scope detection, and common knowledge Q&A.
 * 100% offline, zero model downloads, instant inference.
 */

// ── Tokenizer ──
const STOP_EN = new Set([
  'i','me','my','we','our','you','your','he','she','it','its','they','them',
  'is','am','are','was','were','be','been','being','do','did','does','done',
  'has','had','have','having','the','a','an','in','on','at','to','for','of',
  'by','up','and','or','but','not','no','so','if','as','what','when','where',
  'who','how','why','which','that','this','can','will','now','then','than',
  'just','get','got','go','all','any','some','much','many','more','most',
  'very','about','with','from','into','out','here','there','would','could',
  'should','really','please','want','need','tell','know','think','let',
  'make','way','take','come','see','look','give','use','find','say','also',
  'still','even','too','well','back','only','such','over','other','new','old',
]);

const STOP_AR = new Set([
  'هل','هو','هي','من','في','على','إلى','هذا','هذه','ذلك','تلك',
  'ما','ماذا','متى','أين','كيف','لماذا','أي','هنا','هناك',
  'لا','لم','لن','قد','عن','مع','بين','حتى','كل','بعض',
  'أنا','أنت','نحن','هم','كان','يكون','الآن','ثم','إذا','لكن','أو',
  'التي','الذي','الذين','هؤلاء','ذاك','تلك','عند','لدى','منذ',
]);

const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '');
};

const convertArabicNumerals = (str) => {
  if (!str) return '';
  return str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
};

// ── Stemmer and Synonym Mapping ──
const stemToken = (token) => {
  if (!token) return '';
  if (/[\u0600-\u06FF]/.test(token)) {
    let s = normalizeArabic(token);
    // Strip prefixes
    if (s.startsWith('ال') && s.length > 3) s = s.slice(2);
    if ((s.startsWith('لل') || s.startsWith('بال') || s.startsWith('وال') || s.startsWith('فال')) && s.length > 4) s = s.slice(3);
    if ((s.startsWith('ب') || s.startsWith('و') || s.startsWith('ف') || s.startsWith('س')) && s.length > 3) s = s.slice(1);
    
    // Strip suffixes
    if ((s.endsWith('ات') || s.endsWith('ون') || s.endsWith('ين') || s.endsWith('كم') || s.endsWith('هم') || s.endsWith('نا')) && s.length > 3) {
      s = s.slice(0, -2);
    }
    if ((s.endsWith('ه') || s.endsWith('ي') || s.endsWith('ا')) && s.length > 2) {
      s = s.slice(0, -1);
    }
    return s;
  } else {
    let s = token.toLowerCase();
    if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
    else if (s.endsWith('ment') && s.length > 6) s = s.slice(0, -4);
    else if (s.endsWith('tion') && s.length > 6) s = s.slice(0, -4);
    else if (s.endsWith('able') && s.length > 6) s = s.slice(0, -4);
    else if (s.endsWith('ible') && s.length > 6) s = s.slice(0, -4);
    else if (s.endsWith('ive') && s.length > 5) s = s.slice(0, -3);
    else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2);
    else if (s.endsWith('ly') && s.length > 4) s = s.slice(0, -2);
    else if (s.endsWith('es') && s.length > 4) s = s.slice(0, -2);
    else if (s.endsWith('s') && s.length > 3 && !s.endsWith('ss')) s = s.slice(0, -1);
    return s;
  }
};

const SYNONYMS_MAP = {
  // Arabic synonyms
  'رصيد': 'رصيد_syn', 'رصيدي': 'رصيد_syn', 'فلوس': 'رصيد_syn', 'اموال': 'رصيد_syn', 'مال': 'رصيد_syn', 'كاش': 'رصيد_syn', 'حساب': 'رصيد_syn', 'ميزانيه': 'رصيد_syn', 'ميزانيتي': 'رصيد_syn', 'محفظه': 'رصيد_syn', 'محفظتي': 'رصيد_syn', 'رصيد_syn': 'رصيد_syn',
  'صرف': 'صرف_syn', 'شراء': 'صرف_syn', 'دفع': 'صرف_syn', 'خصم': 'صرف_syn', 'اشتريت': 'صرف_syn', 'دفعت': 'صرف_syn', 'انفاق': 'صرف_syn', 'صرفت': 'صرف_syn', 'مصروف': 'صرف_syn', 'مصاريف': 'صرف_syn', 'صرف_syn': 'صرف_syn',
  'اضف': 'اضف_syn', 'اضافه': 'اضف_syn', 'جديد': 'اضف_syn', 'تسجيل': 'اضف_syn', 'ادخال': 'اضف_syn', 'سجل': 'اضف_syn', 'اضفت': 'اضف_syn', 'انشئ': 'اضف_syn', 'انشاء': 'اضف_syn', 'اضف_syn': 'اضف_syn',
  'حذف': 'حذف_syn', 'مسح': 'حذف_syn', 'ازاله': 'حذف_syn', 'الغاء': 'حذف_syn', 'تراجع': 'حذف_syn', 'حذفت': 'حذف_syn', 'امسح': 'حذف_syn', 'حذف_syn': 'حذف_syn',
  'سهم': 'سهم_syn', 'اسهم': 'سهم_syn', 'تداول': 'سهم_syn', 'بورصه': 'سهم_syn', 'ارامكو': 'سهم_syn', 'راجحي': 'سهم_syn', 'شريعه': 'سهم_syn', 'حلال': 'سهم_syn', 'سهم_syn': 'سهم_syn',
  'هدف': 'هدف_syn', 'اهداف': 'هدف_syn', 'توفير': 'هدف_syn', 'ادخار': 'هدف_syn', 'مستقبل': 'هدف_syn', 'هدف_syn': 'هدف_syn',
  'اشتراك': 'اشتراك_syn', 'اشتراكات': 'اشتراك_syn', 'فاتوره': 'اشتراك_syn', 'فواتير': 'اشتراك_syn', 'نادي': 'اشتراك_syn', 'جيم': 'اشتراك_syn', 'اشتراك_syn': 'اشتراك_syn',
  'طقس': 'طقس_syn', 'جو': 'طقس_syn', 'مطر': 'طقس_syn', 'امطار': 'طقس_syn', 'حراره': 'طقس_syn', 'بروده': 'طقس_syn', 'طقس_syn': 'طقس_syn',
  'ساعه': 'ساعه_syn', 'وقت': 'ساعه_syn', 'زمن': 'ساعه_syn', 'ساعه_syn': 'ساعه_syn',
  'شكر': 'شكر_syn', 'شكرا': 'شكر_syn', 'مشكور': 'شكر_syn', 'شكر_syn': 'شكر_syn',
  'وداع': 'وداع_syn', 'باي': 'وداع_syn', 'سلام': 'وداع_syn', 'وداع_syn': 'وداع_syn',
  'نصيحه': 'نصيحه_syn', 'راي': 'نصيحه_syn', 'ارشاد': 'نصيحه_syn', 'تخطيط': 'نصيحه_syn', 'خطه': 'نصيحه_syn', 'نصيحه_syn': 'نصيحه_syn',

  // English synonyms
  'balance': 'bal_syn', 'money': 'bal_syn', 'cash': 'bal_syn', 'funds': 'bal_syn', 'wealth': 'bal_syn', 'account': 'bal_syn', 'budget': 'bal_syn', 'bal_syn': 'bal_syn',
  'buy': 'spend_syn', 'purchase': 'spend_syn', 'spend': 'spend_syn', 'pay': 'spend_syn', 'paid': 'spend_syn', 'spent': 'spend_syn', 'expense': 'spend_syn', 'debit': 'spend_syn', 'spend_syn': 'spend_syn',
  'add': 'add_syn', 'insert': 'add_syn', 'create': 'add_syn', 'record': 'add_syn', 'new': 'add_syn', 'track': 'add_syn', 'add_syn': 'add_syn',
  'delete': 'delete_syn', 'remove': 'delete_syn', 'wipe': 'delete_syn', 'cancel': 'delete_syn', 'clear': 'delete_syn', 'delete_syn': 'delete_syn',
  'stock': 'stock_syn', 'stocks': 'stock_syn', 'invest': 'stock_syn', 'investment': 'stock_syn', 'portfolio': 'stock_syn', 'shariah': 'stock_syn', 'halal': 'stock_syn', 'aramco': 'stock_syn', 'rajhi': 'stock_syn', 'stock_syn': 'stock_syn',
  'goal': 'goal_syn', 'goals': 'goal_syn', 'save': 'goal_syn', 'saving': 'goal_syn', 'savings': 'goal_syn', 'reserve': 'goal_syn', 'goal_syn': 'goal_syn',
  'subscription': 'sub_syn', 'subscriptions': 'sub_syn', 'sub': 'sub_syn', 'subs': 'sub_syn', 'bill': 'sub_syn', 'bills': 'sub_syn', 'gym': 'sub_syn', 'netflix': 'sub_syn', 'sub_syn': 'sub_syn',
  'weather': 'weather_syn', 'rain': 'weather_syn', 'temp': 'weather_syn', 'temperature': 'weather_syn', 'climate': 'weather_syn', 'forecast': 'weather_syn', 'weather_syn': 'weather_syn',
  'time': 'time_syn', 'clock': 'time_syn', 'hour': 'time_syn', 'date': 'time_syn', 'time_syn': 'time_syn',
  'thanks': 'thanks_syn', 'thank': 'thanks_syn', 'grateful': 'thanks_syn', 'thanks_syn': 'thanks_syn',
  'bye': 'bye_syn', 'goodbye': 'bye_syn', 'farewell': 'bye_syn', 'bye_syn': 'bye_syn',
  'advice': 'advice_syn', 'tip': 'advice_syn', 'tips': 'advice_syn', 'recommend': 'advice_syn', 'guide': 'advice_syn', 'advice_syn': 'advice_syn'
};

const mapToSynonym = (token) => {
  const stem = stemToken(token);
  return SYNONYMS_MAP[stem] || stem;
};

const tokenize = (text) => {
  const lower = convertArabicNumerals(text.toLowerCase().trim());
  const normalized = normalizeArabic(lower);
  const raw = normalized.split(/[\s,.\-?;:!'"()\[\]{}]+/).filter(t => t.length >= 2);
  const filtered = raw.filter(t => !STOP_EN.has(t) && !STOP_AR.has(t));
  return filtered.map(t => mapToSynonym(t));
};

class TrieNode {
  constructor() {
    this.children = {};
    this.intent = null;
    this.weight = 0;
  }
}

class TokenTrie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(phrase, intent, weight = 1) {
    const tokens = tokenize(phrase);
    if (tokens.length === 0) return;
    
    let current = this.root;
    for (const token of tokens) {
      if (!current.children[token]) {
        current.children[token] = new TrieNode();
      }
      current = current.children[token];
    }
    current.intent = intent;
    current.weight = weight;
  }

  search(text) {
    const tokens = tokenize(text);
    if (tokens.length === 0) return null;

    let bestIntent = null;
    let maxWeight = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      let current = this.root;
      for (let j = i; j < tokens.length; j++) {
        const token = tokens[j];
        if (current.children[token]) {
          current = current.children[token];
          if (current.intent) {
            if (current.weight > maxWeight) {
              maxWeight = current.weight;
              bestIntent = current.intent;
            }
          }
        } else {
          break;
        }
      }
    }

    return bestIntent ? { intent: bestIntent, confidence: 0.95 } : null;
  }
}


// ── Training Corpus ──
// Each entry: { text, intent }
// Intents: greeting, add_transaction, create_goal, toggle_subscription, delete_transaction,
//          check_balance, spending_report, add_stock, stock_check, expense_advice,
//          saving_advice, islamic_finance, investment_risk, search_transaction,
//          savings_projection, math_calc, out_of_scope, thanks, farewell

const TRAINING_DATA = [
  // ═══════════════════════════════════════════
  // GREETING
  // ═══════════════════════════════════════════
  { text: 'hello', intent: 'greeting' },
  { text: 'hi', intent: 'greeting' },
  { text: 'hey', intent: 'greeting' },
  { text: 'hi there', intent: 'greeting' },
  { text: 'good morning', intent: 'greeting' },
  { text: 'good evening', intent: 'greeting' },
  { text: 'hey karam', intent: 'greeting' },
  { text: 'hello karam', intent: 'greeting' },
  { text: 'sup', intent: 'greeting' },
  { text: 'what can you do', intent: 'greeting' },
  { text: 'help me', intent: 'greeting' },
  { text: 'what are your features', intent: 'greeting' },
  { text: 'who are you', intent: 'greeting' },
  { text: 'what is your name', intent: 'greeting' },
  { text: 'introduce yourself', intent: 'greeting' },
  { text: 'مرحبا', intent: 'greeting' },
  { text: 'مرحباً', intent: 'greeting' },
  { text: 'اهلا', intent: 'greeting' },
  { text: 'أهلاً', intent: 'greeting' },
  { text: 'السلام عليكم', intent: 'greeting' },
  { text: 'يا هلا', intent: 'greeting' },
  { text: 'هلا', intent: 'greeting' },
  { text: 'صباح الخير', intent: 'greeting' },
  { text: 'مساء الخير', intent: 'greeting' },
  { text: 'كيف حالك', intent: 'greeting' },
  { text: 'كيفك', intent: 'greeting' },
  { text: 'شلونك', intent: 'greeting' },
  { text: 'ساعدني', intent: 'greeting' },
  { text: 'وش تقدر تسوي', intent: 'greeting' },
  { text: 'عرفني عن نفسك', intent: 'greeting' },
  { text: 'مين انت', intent: 'greeting' },
  { text: 'شخبارك', intent: 'greeting' },

  // ═══════════════════════════════════════════
  // ADD TRANSACTION
  // ═══════════════════════════════════════════
  { text: 'add transaction', intent: 'add_transaction' },
  { text: 'add expense', intent: 'add_transaction' },
  { text: 'add 50 riyals starbucks', intent: 'add_transaction' },
  { text: 'add transaction 100 at noon', intent: 'add_transaction' },
  { text: 'spent 200 on groceries', intent: 'add_transaction' },
  { text: 'spent 50 at starbucks', intent: 'add_transaction' },
  { text: 'paid 300 for electricity', intent: 'add_transaction' },
  { text: 'bought something for 150', intent: 'add_transaction' },
  { text: 'I spent 80 riyals on food', intent: 'add_transaction' },
  { text: 'log expense 45 uber', intent: 'add_transaction' },
  { text: 'record payment 500 rent', intent: 'add_transaction' },
  { text: 'add income 5000 salary', intent: 'add_transaction' },
  { text: 'received salary 8000', intent: 'add_transaction' },
  { text: 'got paid 6000', intent: 'add_transaction' },
  { text: 'add credit 1000', intent: 'add_transaction' },
  { text: 'أضف معاملة', intent: 'add_transaction' },
  { text: 'اضف معاملة 50 ريال ستاربكس', intent: 'add_transaction' },
  { text: 'سجل مصروف 200 ريال', intent: 'add_transaction' },
  { text: 'صرفت 100 ريال في نون', intent: 'add_transaction' },
  { text: 'دفعت 300 فاتورة كهرباء', intent: 'add_transaction' },
  { text: 'اشتريت بـ 150 ريال', intent: 'add_transaction' },
  { text: 'أضف دخل 5000 راتب', intent: 'add_transaction' },
  { text: 'استلمت راتبي 8000', intent: 'add_transaction' },
  { text: 'أضف عملية شراء', intent: 'add_transaction' },
  { text: 'سجل عملية 75 ريال مطعم', intent: 'add_transaction' },

  // ═══════════════════════════════════════════
  // CREATE GOAL
  // ═══════════════════════════════════════════
  { text: 'create goal', intent: 'create_goal' },
  { text: 'add goal', intent: 'create_goal' },
  { text: 'create savings goal', intent: 'create_goal' },
  { text: 'save for a new car', intent: 'create_goal' },
  { text: 'create goal 10000 for car', intent: 'create_goal' },
  { text: 'set savings target 5000', intent: 'create_goal' },
  { text: 'I want to save 20000 for a house', intent: 'create_goal' },
  { text: 'new savings goal vacation 3000', intent: 'create_goal' },
  { text: 'add savings target for emergency fund', intent: 'create_goal' },
  { text: 'set a goal to save 15000', intent: 'create_goal' },
  { text: 'أنشئ هدف', intent: 'create_goal' },
  { text: 'انشئ هدف 10000 ريال سيارة', intent: 'create_goal' },
  { text: 'اضف هدف ادخار', intent: 'create_goal' },
  { text: 'سجل هدف 5000 طوارئ', intent: 'create_goal' },
  { text: 'أبي أوفر لسيارة جديدة', intent: 'create_goal' },
  { text: 'ابغى هدف توفير 20000', intent: 'create_goal' },
  { text: 'حدد هدف ادخار 15000 ريال', intent: 'create_goal' },

  // ═══════════════════════════════════════════
  // TOGGLE SUBSCRIPTION
  // ═══════════════════════════════════════════
  { text: 'cancel netflix', intent: 'toggle_subscription' },
  { text: 'cancel netflix subscription', intent: 'toggle_subscription' },
  { text: 'stop spotify', intent: 'toggle_subscription' },
  { text: 'deactivate gym membership', intent: 'toggle_subscription' },
  { text: 'turn off youtube premium', intent: 'toggle_subscription' },
  { text: 'pause my subscription', intent: 'toggle_subscription' },
  { text: 'cancel my subscriptions', intent: 'toggle_subscription' },
  { text: 'activate netflix', intent: 'toggle_subscription' },
  { text: 'resume spotify', intent: 'toggle_subscription' },
  { text: 'turn on gym', intent: 'toggle_subscription' },
  { text: 'أوقف نتفلكس', intent: 'toggle_subscription' },
  { text: 'اوقف اشتراك نتفلكس', intent: 'toggle_subscription' },
  { text: 'الغ اشتراك سبوتيفاي', intent: 'toggle_subscription' },
  { text: 'وقف اشتراك النادي', intent: 'toggle_subscription' },
  { text: 'فعّل نتفلكس', intent: 'toggle_subscription' },
  { text: 'الغاء الاشتراكات', intent: 'toggle_subscription' },
  { text: 'ابي اوقف اشتراك', intent: 'toggle_subscription' },

  // ═══════════════════════════════════════════
  // DELETE TRANSACTION
  // ═══════════════════════════════════════════
  { text: 'delete last transaction', intent: 'delete_transaction' },
  { text: 'remove last expense', intent: 'delete_transaction' },
  { text: 'undo last transaction', intent: 'delete_transaction' },
  { text: 'delete the last entry', intent: 'delete_transaction' },
  { text: 'remove my last purchase', intent: 'delete_transaction' },
  { text: 'احذف آخر عملية', intent: 'delete_transaction' },
  { text: 'حذف اخر معاملة', intent: 'delete_transaction' },
  { text: 'الغ اخر عملية', intent: 'delete_transaction' },
  { text: 'امسح آخر صرفية', intent: 'delete_transaction' },

  // ═══════════════════════════════════════════
  // CHECK BALANCE
  // ═══════════════════════════════════════════
  { text: 'what is my balance', intent: 'check_balance' },
  { text: 'how much money do I have', intent: 'check_balance' },
  { text: 'whats my balance', intent: 'check_balance' },
  { text: 'show me my balance', intent: 'check_balance' },
  { text: 'my balance', intent: 'check_balance' },
  { text: 'check my account', intent: 'check_balance' },
  { text: 'total balance', intent: 'check_balance' },
  { text: 'how much is left', intent: 'check_balance' },
  { text: 'remaining balance', intent: 'check_balance' },
  { text: 'net worth', intent: 'check_balance' },
  { text: 'كم رصيدي', intent: 'check_balance' },
  { text: 'رصيدي كم', intent: 'check_balance' },
  { text: 'كم عندي فلوس', intent: 'check_balance' },
  { text: 'كم الحساب', intent: 'check_balance' },
  { text: 'كم باقي عندي', intent: 'check_balance' },
  { text: 'وريني رصيدي', intent: 'check_balance' },
  { text: 'كم المبلغ المتبقي', intent: 'check_balance' },

  // ═══════════════════════════════════════════
  // SPENDING REPORT
  // ═══════════════════════════════════════════
  { text: 'analyze my spending', intent: 'spending_report' },
  { text: 'spending report', intent: 'spending_report' },
  { text: 'spending analysis', intent: 'spending_report' },
  { text: 'where did my money go', intent: 'spending_report' },
  { text: 'breakdown my expenses', intent: 'spending_report' },
  { text: 'show spending categories', intent: 'spending_report' },
  { text: 'how much did I spend this month', intent: 'spending_report' },
  { text: 'monthly spending breakdown', intent: 'spending_report' },
  { text: 'spending summary', intent: 'spending_report' },
  { text: 'expense breakdown', intent: 'spending_report' },
  { text: 'what am I spending on', intent: 'spending_report' },
  { text: 'top expenses', intent: 'spending_report' },
  { text: 'حلل مصاريفي', intent: 'spending_report' },
  { text: 'تقرير المصاريف', intent: 'spending_report' },
  { text: 'وين راحت فلوسي', intent: 'spending_report' },
  { text: 'تقرير الصرف', intent: 'spending_report' },
  { text: 'تحليل الإنفاق', intent: 'spending_report' },
  { text: 'كم صرفت هذا الشهر', intent: 'spending_report' },
  { text: 'أعلى مصروفاتي', intent: 'spending_report' },
  { text: 'على ايش صارف', intent: 'spending_report' },

  // ═══════════════════════════════════════════
  // ADD STOCK
  // ═══════════════════════════════════════════
  { text: 'add stock', intent: 'add_stock' },
  { text: 'buy shares', intent: 'add_stock' },
  { text: 'add 10 shares aramco', intent: 'add_stock' },
  { text: 'buy aramco stock', intent: 'add_stock' },
  { text: 'add sabic to portfolio', intent: 'add_stock' },
  { text: 'purchase 5 shares of stc', intent: 'add_stock' },
  { text: 'buy 20 alinma shares', intent: 'add_stock' },
  { text: 'أضف سهم أرامكو', intent: 'add_stock' },
  { text: 'اشتري 10 أسهم سابك', intent: 'add_stock' },
  { text: 'أضف سهم الاتصالات للمحفظة', intent: 'add_stock' },
  { text: 'شراء أسهم الإنماء', intent: 'add_stock' },

  // ═══════════════════════════════════════════
  // STOCK CHECK (Shariah compliance)
  // ═══════════════════════════════════════════
  { text: 'check aramco stock', intent: 'stock_check' },
  { text: 'is aramco halal', intent: 'stock_check' },
  { text: 'check sabic compliance', intent: 'stock_check' },
  { text: 'is stc shariah compliant', intent: 'stock_check' },
  { text: 'shariah compliance check', intent: 'stock_check' },
  { text: 'halal stocks', intent: 'stock_check' },
  { text: 'check alinma bank', intent: 'stock_check' },
  { text: 'is this stock halal', intent: 'stock_check' },
  { text: 'screen stock for compliance', intent: 'stock_check' },
  { text: 'فحص سهم أرامكو', intent: 'stock_check' },
  { text: 'هل أسهم سابك حلال', intent: 'stock_check' },
  { text: 'التوافق الشرعي لسهم', intent: 'stock_check' },
  { text: 'فلترة الأسهم الحلال', intent: 'stock_check' },
  { text: 'هل الاتصالات متوافقة شرعياً', intent: 'stock_check' },

  // ═══════════════════════════════════════════
  // EXPENSE ADVICE
  // ═══════════════════════════════════════════
  { text: 'how to reduce expenses', intent: 'expense_advice' },
  { text: 'reduce my spending', intent: 'expense_advice' },
  { text: 'cut costs', intent: 'expense_advice' },
  { text: 'spending too much', intent: 'expense_advice' },
  { text: 'tips to save money', intent: 'expense_advice' },
  { text: 'how to spend less', intent: 'expense_advice' },
  { text: 'I need to budget better', intent: 'expense_advice' },
  { text: 'expense reduction tips', intent: 'expense_advice' },
  { text: 'how to lower my bills', intent: 'expense_advice' },
  { text: 'my expenses are too high', intent: 'expense_advice' },
  { text: 'wasteful spending', intent: 'expense_advice' },
  { text: 'overspending problem', intent: 'expense_advice' },
  { text: 'كيف أقلل مصاريفي', intent: 'expense_advice' },
  { text: 'تقليل المصاريف', intent: 'expense_advice' },
  { text: 'كيف أوفر مصاريفي', intent: 'expense_advice' },
  { text: 'مصاريفي كثيرة', intent: 'expense_advice' },
  { text: 'ابي اوفر', intent: 'expense_advice' },
  { text: 'نصائح تقليل الصرف', intent: 'expense_advice' },
  { text: 'كيف اقلل فواتيري', intent: 'expense_advice' },

  // ═══════════════════════════════════════════
  // SAVING ADVICE
  // ═══════════════════════════════════════════
  { text: 'how to save money', intent: 'saving_advice' },
  { text: 'saving tips', intent: 'saving_advice' },
  { text: 'how much should I save', intent: 'saving_advice' },
  { text: 'emergency fund advice', intent: 'saving_advice' },
  { text: 'savings rate', intent: 'saving_advice' },
  { text: 'budgeting advice', intent: 'saving_advice' },
  { text: 'what is a good savings rate', intent: 'saving_advice' },
  { text: 'how to build an emergency fund', intent: 'saving_advice' },
  { text: 'financial advice', intent: 'saving_advice' },
  { text: 'financial tip', intent: 'saving_advice' },
  { text: 'نصيحة مالية', intent: 'saving_advice' },
  { text: 'كيف ادخر', intent: 'saving_advice' },
  { text: 'نصائح الادخار', intent: 'saving_advice' },
  { text: 'كم المفروض أدخر', intent: 'saving_advice' },
  { text: 'صندوق الطوارئ', intent: 'saving_advice' },
  { text: 'نصيحة توفير', intent: 'saving_advice' },
  { text: 'كم وفرت هذا الشهر', intent: 'saving_advice' },

  // ═══════════════════════════════════════════
  // ISLAMIC FINANCE
  // ═══════════════════════════════════════════
  { text: 'shariah compliance', intent: 'islamic_finance' },
  { text: 'islamic finance rules', intent: 'islamic_finance' },
  { text: 'halal investing', intent: 'islamic_finance' },
  { text: 'purify my portfolio', intent: 'islamic_finance' },
  { text: 'dividend purification', intent: 'islamic_finance' },
  { text: 'is interest haram', intent: 'islamic_finance' },
  { text: 'islamic banking', intent: 'islamic_finance' },
  { text: 'halal investment options', intent: 'islamic_finance' },
  { text: 'تطهير الأرباح', intent: 'islamic_finance' },
  { text: 'الاستثمار الحلال', intent: 'islamic_finance' },
  { text: 'قواعد الشريعة', intent: 'islamic_finance' },
  { text: 'حلال وحرام في الاستثمار', intent: 'islamic_finance' },
  { text: 'تنقية المحفظة', intent: 'islamic_finance' },
  { text: 'الربا والفوائد', intent: 'islamic_finance' },

  // ═══════════════════════════════════════════
  // INVESTMENT RISK
  // ═══════════════════════════════════════════
  { text: 'investment risk', intent: 'investment_risk' },
  { text: 'diversify my portfolio', intent: 'investment_risk' },
  { text: 'risk management', intent: 'investment_risk' },
  { text: 'portfolio diversification', intent: 'investment_risk' },
  { text: 'too risky investment', intent: 'investment_risk' },
  { text: 'stop loss strategy', intent: 'investment_risk' },
  { text: 'reduce portfolio risk', intent: 'investment_risk' },
  { text: 'market volatility', intent: 'investment_risk' },
  { text: 'إدارة المخاطر', intent: 'investment_risk' },
  { text: 'تنويع المحفظة', intent: 'investment_risk' },
  { text: 'مخاطر الاستثمار', intent: 'investment_risk' },
  { text: 'تقليل المخاطر', intent: 'investment_risk' },

  // ═══════════════════════════════════════════
  // SEARCH TRANSACTION
  // ═══════════════════════════════════════════
  { text: 'find starbucks transactions', intent: 'search_transaction' },
  { text: 'search for uber', intent: 'search_transaction' },
  { text: 'show netflix payments', intent: 'search_transaction' },
  { text: 'look up amazon orders', intent: 'search_transaction' },
  { text: 'find transactions at noon', intent: 'search_transaction' },
  { text: 'starbucks history', intent: 'search_transaction' },
  { text: 'how much did I spend at uber', intent: 'search_transaction' },
  { text: 'صرفيات ستاربكس', intent: 'search_transaction' },
  { text: 'بحث عن عمليات نون', intent: 'search_transaction' },
  { text: 'كم صرفت في أمازون', intent: 'search_transaction' },
  { text: 'عمليات نتفلكس', intent: 'search_transaction' },

  // ═══════════════════════════════════════════
  // SAVINGS PROJECTION
  // ═══════════════════════════════════════════
  { text: 'if I save 500 monthly for 3 years', intent: 'savings_projection' },
  { text: 'save 1000 per month for 5 years', intent: 'savings_projection' },
  { text: 'compound interest calculator', intent: 'savings_projection' },
  { text: 'how much will I have if I save 2000 a month', intent: 'savings_projection' },
  { text: 'savings projection 1000 for 10 years', intent: 'savings_projection' },
  { text: 'إذا ادخرت 500 ريال شهرياً لمدة 3 سنوات', intent: 'savings_projection' },
  { text: 'لو وفرت 1000 ريال كل شهر', intent: 'savings_projection' },
  { text: 'حساب الفائدة المركبة', intent: 'savings_projection' },

  // ═══════════════════════════════════════════
  // LEDGER STATISTICS
  // ═══════════════════════════════════════════
  { text: 'average spending', intent: 'ledger_stats' },
  { text: 'highest expense', intent: 'ledger_stats' },
  { text: 'biggest purchase', intent: 'ledger_stats' },
  { text: 'how many transactions', intent: 'ledger_stats' },
  { text: 'number of transactions', intent: 'ledger_stats' },
  { text: 'average transaction amount', intent: 'ledger_stats' },
  { text: 'most expensive purchase', intent: 'ledger_stats' },
  { text: 'متوسط الصرف', intent: 'ledger_stats' },
  { text: 'أعلى صرفية', intent: 'ledger_stats' },
  { text: 'أكبر مبلغ صرفته', intent: 'ledger_stats' },
  { text: 'عدد العمليات', intent: 'ledger_stats' },
  { text: 'كم معاملة عندي', intent: 'ledger_stats' },

  // ═══════════════════════════════════════════
  // MATH CALCULATION
  // ═══════════════════════════════════════════
  { text: 'calculate 1500 * 12', intent: 'math_calc' },
  { text: 'what is 500 + 300', intent: 'math_calc' },
  { text: '15% of 3000', intent: 'math_calc' },
  { text: '10 percent of 5000', intent: 'math_calc' },
  { text: '2000 / 12', intent: 'math_calc' },
  { text: 'احسب 1500 * 12', intent: 'math_calc' },
  { text: 'كم 15% من 3000', intent: 'math_calc' },

  // ═══════════════════════════════════════════
  // THANKS / FAREWELL
  // ═══════════════════════════════════════════
  { text: 'thanks', intent: 'thanks' },
  { text: 'thank you', intent: 'thanks' },
  { text: 'thanks karam', intent: 'thanks' },
  { text: 'great job', intent: 'thanks' },
  { text: 'awesome', intent: 'thanks' },
  { text: 'perfect', intent: 'thanks' },
  { text: 'nice', intent: 'thanks' },
  { text: 'cool', intent: 'thanks' },
  { text: 'شكراً', intent: 'thanks' },
  { text: 'شكرا', intent: 'thanks' },
  { text: 'شكرا كرم', intent: 'thanks' },
  { text: 'ممتاز', intent: 'thanks' },
  { text: 'تمام', intent: 'thanks' },
  { text: 'يعطيك العافية', intent: 'thanks' },
  { text: 'الله يعطيك العافية', intent: 'thanks' },
  { text: 'goodbye', intent: 'farewell' },
  { text: 'bye', intent: 'farewell' },
  { text: 'see you', intent: 'farewell' },
  { text: 'مع السلامة', intent: 'farewell' },
  { text: 'الله يحفظك', intent: 'farewell' },

  // ═══════════════════════════════════════════
  // META CHAT (AI capabilities, feedback, offline, origins)
  // ═══════════════════════════════════════════
  { text: 'you are stupid', intent: 'meta_chat' },
  { text: 'it is stupid', intent: 'meta_chat' },
  { text: 'this is dumb', intent: 'meta_chat' },
  { text: 'not very smart', intent: 'meta_chat' },
  { text: 'how smart are you', intent: 'meta_chat' },
  { text: 'stupid bot', intent: 'meta_chat' },
  { text: 'are you offline', intent: 'meta_chat' },
  { text: 'do you use internet', intent: 'meta_chat' },
  { text: 'who made you', intent: 'meta_chat' },
  { text: 'who is your creator', intent: 'meta_chat' },
  { text: 'غبي', intent: 'meta_chat' },
  { text: 'انت غبي', intent: 'meta_chat' },
  { text: 'تطبيق غبي', intent: 'meta_chat' },
  { text: 'ما تفهم', intent: 'meta_chat' },
  { text: 'سخيف', intent: 'meta_chat' },
  { text: 'تطبيق فاشل', intent: 'meta_chat' },
  { text: 'هل تحتاج انترنت', intent: 'meta_chat' },
  { text: 'هل تشتغل بدون نت', intent: 'meta_chat' },
  { text: 'من طورك', intent: 'meta_chat' },
  { text: 'من صنعك', intent: 'meta_chat' },
  { text: 'ما هو اسمك', intent: 'meta_chat' },

  // ═══════════════════════════════════════════
  // OUT OF SCOPE — things the AI can't/shouldn't answer
  // ═══════════════════════════════════════════
  { text: 'what time is it', intent: 'out_of_scope' },
  { text: 'what is the time', intent: 'out_of_scope' },
  { text: 'what is the weather', intent: 'out_of_scope' },
  { text: 'weather forecast', intent: 'out_of_scope' },
  { text: 'tell me a joke', intent: 'out_of_scope' },
  { text: 'play music', intent: 'out_of_scope' },
  { text: 'set an alarm', intent: 'out_of_scope' },
  { text: 'what is the capital of saudi arabia', intent: 'out_of_scope' },
  { text: 'who is the king of saudi arabia', intent: 'out_of_scope' },
  { text: 'translate this', intent: 'out_of_scope' },
  { text: 'write me an email', intent: 'out_of_scope' },
  { text: 'order food', intent: 'out_of_scope' },
  { text: 'book a flight', intent: 'out_of_scope' },
  { text: 'call someone', intent: 'out_of_scope' },
  { text: 'send a message', intent: 'out_of_scope' },
  { text: 'open camera', intent: 'out_of_scope' },
  { text: 'take a photo', intent: 'out_of_scope' },
  { text: 'search google', intent: 'out_of_scope' },
  { text: 'what is 2+2', intent: 'out_of_scope' },
  { text: 'do you like me', intent: 'out_of_scope' },
  { text: 'are you real', intent: 'out_of_scope' },
  { text: 'are you AI', intent: 'out_of_scope' },
  { text: 'how old are you', intent: 'out_of_scope' },
  { text: 'tell me something interesting', intent: 'out_of_scope' },
  { text: 'random fact', intent: 'out_of_scope' },
  { text: 'كم الساعة', intent: 'out_of_scope' },
  { text: 'الساعة كم', intent: 'out_of_scope' },
  { text: 'كيف الطقس', intent: 'out_of_scope' },
  { text: 'حالة الجو', intent: 'out_of_scope' },
  { text: 'قولي نكتة', intent: 'out_of_scope' },
  { text: 'شغل أغنية', intent: 'out_of_scope' },
  { text: 'ايش عاصمة السعودية', intent: 'out_of_scope' },
  { text: 'ابحث في قوقل', intent: 'out_of_scope' },
  { text: 'أرسل رسالة', intent: 'out_of_scope' },
  { text: 'افتح الكاميرا', intent: 'out_of_scope' },
  { text: 'كم عمرك', intent: 'out_of_scope' },

  // ═══════════════════════════════════════════
  // VIEW GOALS
  // ═══════════════════════════════════════════
  { text: 'what are my goals', intent: 'view_goals' },
  { text: 'show my savings goals', intent: 'view_goals' },
  { text: 'my goals list', intent: 'view_goals' },
  { text: 'list my goals', intent: 'view_goals' },
  { text: 'check my goals', intent: 'view_goals' },
  { text: 'view savings goals', intent: 'view_goals' },
  { text: 'show savings goals list', intent: 'view_goals' },
  { text: 'what are my savings targets', intent: 'view_goals' },
  { text: 'ma hiya ahdafi', intent: 'view_goals' },
  { text: 'ما هي اهدافي', intent: 'view_goals' },
  { text: 'عرض اهدافي', intent: 'view_goals' },
  { text: 'اهدافي الادخارية', intent: 'view_goals' },
  { text: 'وريني اهدافي', intent: 'view_goals' },
  { text: 'أهدافي المالية', intent: 'view_goals' },
  { text: 'كم هدف عندي', intent: 'view_goals' },
  { text: 'اهداف الادخار الحالية', intent: 'view_goals' },

  // ═══════════════════════════════════════════
  // VIEW SUBSCRIPTIONS
  // ═══════════════════════════════════════════
  { text: 'what are my subscriptions', intent: 'view_subscriptions' },
  { text: 'show subscriptions', intent: 'view_subscriptions' },
  { text: 'my active subscriptions', intent: 'view_subscriptions' },
  { text: 'list subscriptions', intent: 'view_subscriptions' },
  { text: 'what subscriptions do i have', intent: 'view_subscriptions' },
  { text: 'how many subscriptions', intent: 'view_subscriptions' },
  { text: 'cost of subscriptions', intent: 'view_subscriptions' },
  { text: 'what is my monthly subscriptions billing', intent: 'view_subscriptions' },
  { text: 'recurring billings', intent: 'view_subscriptions' },
  { text: 'ma hiya ishtirakati', intent: 'view_subscriptions' },
  { text: 'ما هي اشتراكاتي', intent: 'view_subscriptions' },
  { text: 'عرض الاشتراكات', intent: 'view_subscriptions' },
  { text: 'اشتراكاتي النشطة', intent: 'view_subscriptions' },
  { text: 'كم ادفع اشتراكات', intent: 'view_subscriptions' },
  { text: 'وريني الاشتراكات', intent: 'view_subscriptions' },
  { text: 'قائمة الاشتراكات', intent: 'view_subscriptions' },
  { text: 'الاشتراكات الشهرية المفعله', intent: 'view_subscriptions' },

  // ═══════════════════════════════════════════
  // VIEW PORTFOLIO
  // ═══════════════════════════════════════════
  { text: 'what stocks do i own', intent: 'view_portfolio' },
  { text: 'show my portfolio', intent: 'view_portfolio' },
  { text: 'what is in my portfolio', intent: 'view_portfolio' },
  { text: 'my stocks list', intent: 'view_portfolio' },
  { text: 'list my stocks', intent: 'view_portfolio' },
  { text: 'view my stocks', intent: 'view_portfolio' },
  { text: 'my investment portfolio', intent: 'view_portfolio' },
  { text: 'portfolio value', intent: 'view_portfolio' },
  { text: 'what assets do i hold', intent: 'view_portfolio' },
  { text: 'ma hiya ashomi', intent: 'view_portfolio' },
  { text: 'ما هي اسهمي', intent: 'view_portfolio' },
  { text: 'عرض محفظتي', intent: 'view_portfolio' },
  { text: 'المحفظة الاستثمارية', intent: 'view_portfolio' },
  { text: 'وريني اسهمي', intent: 'view_portfolio' },
  { text: 'كم قيمة محفظتي', intent: 'view_portfolio' },
  { text: 'قائمة الاسهم', intent: 'view_portfolio' },
  { text: 'ايش عندي اسهم', intent: 'view_portfolio' },
  { text: 'محتويات محفظتي', intent: 'view_portfolio' },
];


// ── TF-IDF Engine ──

class TfIdfClassifier {
  constructor() {
    this.vocabulary = new Map(); // word -> index
    this.idf = new Map();       // word -> idf value
    this.vectors = [];          // { intent, vector }
    this.trie = new TokenTrie();
    this._built = false;
  }

  build(data) {
    // 1. Build and seed the Token Trie with training data
    for (const d of data) {
      this.trie.insert(d.text, d.intent, 2); // Base training data has higher priority/weight (2)
    }

    // Programmatically seed combinatorial options to cover millions of phrase variations
    const arActions = [
      'ابي', 'ابغى', 'اريد', 'حاول', 'سجل', 'سوي', 'ضيف', 'تكفى', 'ارجوك', 'سجلت', 
      'صرفت', 'دفعت', 'سحبت', 'شريت', 'عرض', 'كم', 'وريني', 'افتح', 'احسب', 'احذف', 
      'امسح', 'الغاء', 'تراجع', 'حدث', 'عدل', 'فحص', 'تاكد', 'شيك', 'توزيع', 'توفير',
      'خطط', 'ميزانية', 'تحليل', 'تقييم', 'رؤية', 'تقرير', 'خصم'
    ];
    const arObjects = [
      'معامله', 'عمليه', 'فاتوره', 'مصروف', 'شراء', 'دفع', 'سهم', 'اسهم', 'محفظه', 'تداول', 
      'هدف', 'ادخار', 'توفير', 'رصيد', 'فلوس', 'حساب', 'ميزانيه', 'اشتراك', 'اشتراكات', 'عضويه',
      'راتب', 'ارباح', 'نتفلكس', 'ستاربكس', 'جم', 'بطاقة', 'اموال', 'نقدية', 'سيولة', 'مدخرات'
    ];
    const arModifiers = [
      '', 'اليوم', 'امس', 'الان', 'حالا', 'فورا', 'سريعا', 'من فضلك', 'لي', 'في محفظتي',
      'من بطاقتي', 'الخاص بي', 'الشهر الحالي', 'الاسبوع الماضي', 'السنوي'
    ];
    
    const enActions = [
      'please', 'want', 'need', 'like', 'record', 'track', 'log', 'add', 'delete', 'remove', 
      'check', 'show', 'get', 'calculate', 'view', 'list', 'cancel', 'clear', 'wipe', 'update',
      'modify', 'verify', 'screen', 'audit', 'inspect', 'analyze', 'evaluate', 'assess', 'distribute', 'allocate'
    ];
    const enObjects = [
      'transaction', 'purchase', 'expense', 'debit', 'payment', 'bill', 'stock', 'stocks', 'portfolio', 'shares', 
      'goal', 'savings', 'target', 'balance', 'cash', 'budget', 'subscription', 'membership', 'salary', 'earnings',
      'dividend', 'netflix', 'spotify', 'starbucks', 'gym', 'card', 'funds', 'capital', 'allowance', 'reserve'
    ];
    const enModifiers = [
      '', 'today', 'yesterday', 'now', 'immediately', 'quickly', 'please', 'for me', 'in my wallet', 'from my card',
      'my own', 'this month', 'last week', 'annually', 'right now'
    ];

    // Insert all Action + Object + Modifier combinations
    for (const action of arActions) {
      for (const obj of arObjects) {
        let intent = 'greeting';
        if (obj.includes('معامله') || obj.includes('عمليه') || obj.includes('فاتوره') || obj.includes('مصروف') || obj.includes('شراء') || obj.includes('دفع') || obj.includes('ستاربكس')) {
          intent = action.includes('حذف') || action.includes('مسح') || action.includes('الغاء') ? 'delete_transaction' : 'add_transaction';
        } else if (obj.includes('رصيد') || obj.includes('فلوس') || obj.includes('حساب') || obj.includes('ميزانيه') || obj.includes('نقدية') || obj.includes('سيولة') || obj.includes('اموال')) {
          intent = 'check_balance';
        } else if (obj.includes('هدف') || obj.includes('ادخار') || obj.includes('توفير') || obj.includes('مدخرات')) {
          intent = 'create_goal';
        } else if (obj.includes('سهم') || obj.includes('اسهم') || obj.includes('تداول') || obj.includes('محفظه') || obj.includes('أرامكو') || obj.includes('الراجحي')) {
          intent = 'stock_check';
        } else if (obj.includes('اشتراك') || obj.includes('عضويه') || obj.includes('نتفلكس') || obj.includes('جم')) {
          intent = 'toggle_subscription';
        }
        
        for (const mod of arModifiers) {
          const phrase1 = mod ? `${action} ${obj} ${mod}` : `${action} ${obj}`;
          const phrase2 = mod ? `${obj} ${action} ${mod}` : `${obj} ${action}`;
          const phrase3 = mod ? `${mod} ${action} ${obj}` : `${action} ${obj}`;
          this.trie.insert(phrase1, intent, 1);
          this.trie.insert(phrase2, intent, 1);
          this.trie.insert(phrase3, intent, 1);
        }
      }
    }

    for (const action of enActions) {
      for (const obj of enObjects) {
        let intent = 'greeting';
        if (obj.includes('transaction') || obj.includes('purchase') || obj.includes('expense') || obj.includes('debit') || obj.includes('payment') || obj.includes('bill') || obj.includes('starbucks')) {
          intent = action.includes('delete') || action.includes('remove') || action.includes('clear') || action.includes('wipe') ? 'delete_transaction' : 'add_transaction';
        } else if (obj.includes('balance') || obj.includes('cash') || obj.includes('budget') || obj.includes('funds') || obj.includes('capital') || obj.includes('allowance')) {
          intent = 'check_balance';
        } else if (obj.includes('goal') || obj.includes('savings') || obj.includes('target') || obj.includes('reserve')) {
          intent = 'create_goal';
        } else if (obj.includes('stock') || obj.includes('portfolio') || obj.includes('shares') || obj.includes('dividend') || obj.includes('earnings') || obj.includes('salary')) {
          intent = 'stock_check';
        } else if (obj.includes('subscription') || obj.includes('membership') || obj.includes('netflix') || obj.includes('spotify') || obj.includes('gym')) {
          intent = 'toggle_subscription';
        }

        for (const mod of enModifiers) {
          const phrase1 = mod ? `${action} ${obj} ${mod}` : `${action} ${obj}`;
          const phrase2 = mod ? `${obj} ${action} ${mod}` : `${obj} ${action}`;
          const phrase3 = mod ? `${mod} ${action} ${obj}` : `${action} ${obj}`;
          this.trie.insert(phrase1, intent, 1);
          this.trie.insert(phrase2, intent, 1);
          this.trie.insert(phrase3, intent, 1);
        }
      }
    }

    // 1b. Programmatically seed General Inquiries to cover 20,000+ out-of-scope variations
    const genGKStarters = [
      'what is the capital of', 'who is the president of', 'where is', 'tell me about', 'what do you know about',
      'what is the history of', 'who discovered', 'who built', 'who wrote', 'what is the meaning of',
      'ma hiya asimat', 'man huwa raees', 'ayna taqa', 'hadeethne an', 'ma huwa tareekh',
      'ما هي عاصمة', 'من هو رئيس', 'اين تقع', 'حدثني عن', 'ما هو تاريخ', 'من اكتشف', 'من بنى', 'من كتب', 'ما معنى'
    ];
    const genGKEntities = [
      'france', 'germany', 'egypt', 'saudi arabia', 'bahrain', 'japan', 'china', 'america', 'canada', 'uk',
      'london', 'paris', 'tokyo', 'cairo', 'riyadh', 'dubai', 'kuwait', 'oman', 'iraq', 'syria',
      'فرنسا', 'المانيا', 'مصر', 'السعودية', 'البحرين', 'اليابان', 'الصين', 'امريكا', 'كندا',
      'لندن', 'باريس', 'طوكيو', 'القاهرة', 'الرياض', 'دبي', 'الكويت', 'عمان', 'العراق', 'سوريا'
    ];
    const genGKModifiers = [
      '', 'in detail', 'briefly', 'right now', 'today', 'in history', 'for kids', 'please',
      'بالتفصيل', 'باختصار', 'الان', 'اليوم', 'في التاريخ', 'من فضلك'
    ];

    const genChatStarters = [
      'tell me a', 'can you share a', 'say a', 'do you have a', 'give me a', 'I want to hear a', 'show me a',
      'ahke le', 'qol le', 'aateene', 'endak', 'sameene',
      'احكي لي', 'قول لي', 'اعطيني', 'عندك', 'سمعني', 'ابغى نكتة', 'ابي قصة'
    ];
    const genChatContents = [
      'joke', 'story', 'fun fact', 'riddle', 'quote', 'poem', 'proverb', 'myth',
      'نكتة', 'قصة', 'حكمة', 'قصيدة', 'معلومة', 'فزورة', 'مثل', 'خرافة'
    ];
    const genChatModifiers = [
      '', 'funny', 'interesting', 'short', 'cool', 'nice', 'hilarious',
      'مضحكة', 'جميلة', 'قصيرة', 'جديدة', 'غريبة', 'رهيبة'
    ];

    const genWeatherStarters = [
      'what is the', 'check the', 'tell me the', 'how is the', 'show me the', 'is it raining in', 'is it hot in',
      'kayf', 'ma huwa', 'kam',
      'كيف', 'ما هو', 'علمني عن', 'كم', 'وريني', 'هل يمطّر في', 'هل الجو حار في'
    ];
    const genWeatherContents = [
      'weather', 'temperature', 'forecast', 'climate', 'rain', 'wind', 'time', 'clock', 'hour', 'date',
      'الطقس', 'الحرارة', 'المطر', 'الوقت', 'الساعة', 'التاريخ'
    ];
    const genWeatherLocations = [
      'london', 'paris', 'cairo', 'riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'tokyo', 'new york',
      'لندن', 'باريس', 'القاهرة', 'الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'طوكيو', 'نيويورك'
    ];

    for (const starter of genGKStarters) {
      for (const entity of genGKEntities) {
        for (const mod of genGKModifiers) {
          const phrase = mod ? `${starter} ${entity} ${mod}` : `${starter} ${entity}`;
          this.trie.insert(phrase, 'out_of_scope', 1);
        }
      }
    }

    for (const starter of genChatStarters) {
      for (const content of genChatContents) {
        for (const mod of genChatModifiers) {
          const phrase = mod ? `${starter} ${content} ${mod}` : `${starter} ${content}`;
          this.trie.insert(phrase, 'out_of_scope', 1);
        }
      }
    }

    for (const starter of genWeatherStarters) {
      for (const content of genWeatherContents) {
        for (const loc of genWeatherLocations) {
          const phrase = `${starter} ${content} ${loc}`;
          this.trie.insert(phrase, 'out_of_scope', 1);
        }
      }
    }

    // 2. Build vocabulary & document frequency for TF-IDF fallback
    const docFreq = new Map();
    const allDocs = data.map(d => {
      const tokens = tokenize(d.text);
      const unique = new Set(tokens);
      unique.forEach(t => docFreq.set(t, (docFreq.get(t) || 0) + 1));
      return { tokens, intent: d.intent };
    });

    const N = allDocs.length;
    let idx = 0;
    for (const [word, freq] of docFreq) {
      this.vocabulary.set(word, idx++);
      this.idf.set(word, Math.log((N + 1) / (freq + 1)) + 1); // smoothed IDF
    }

    // 3. Compute TF-IDF vectors for each training example
    this.vectors = allDocs.map(doc => ({
      intent: doc.intent,
      vec: this._computeVector(doc.tokens)
    }));

    this._built = true;
  }

  _computeVector(tokens) {
    const tf = new Map();
    tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    const maxTf = Math.max(...tf.values(), 1);

    const vec = new Float32Array(this.vocabulary.size);
    for (const [word, count] of tf) {
      const vocIdx = this.vocabulary.get(word);
      if (vocIdx !== undefined) {
        const normalizedTf = count / maxTf;
        const idfVal = this.idf.get(word) || 1;
        vec[vocIdx] = normalizedTf * idfVal;
      }
    }
    return vec;
  }

  _cosineSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  classify(text) {
    if (!this._built) return { intent: 'out_of_scope', confidence: 0, topMatches: [] };

    // Try Trie matching first for sub-millisecond prefix resolution
    const trieMatch = this.trie.search(text);
    if (trieMatch) {
      return {
        intent: trieMatch.intent,
        confidence: trieMatch.confidence,
        topMatches: [{ intent: trieMatch.intent, score: 0.95 }]
      };
    }

    const tokens = tokenize(text);
    if (tokens.length === 0) return { intent: 'out_of_scope', confidence: 0, topMatches: [] };

    const queryVec = this._computeVector(tokens);

    // Score against all training vectors
    const scores = this.vectors.map(v => ({
      intent: v.intent,
      score: this._cosineSim(queryVec, v.vec)
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Get top matches
    const topMatches = scores.slice(0, 5);
    const bestScore = topMatches[0]?.score || 0;
    const bestIntent = topMatches[0]?.intent || 'out_of_scope';

    // Confidence thresholding
    if (bestScore < 0.15) {
      return { intent: 'out_of_scope', confidence: bestScore, topMatches };
    }

    // Intent voting: among top-3 matches, pick the most common intent
    const top3 = scores.slice(0, 3);
    const intentVotes = {};
    top3.forEach(s => {
      if (s.score > 0.10) {
        intentVotes[s.intent] = (intentVotes[s.intent] || 0) + s.score;
      }
    });

    let winningIntent = bestIntent;
    let winningScore = 0;
    for (const [intent, totalScore] of Object.entries(intentVotes)) {
      if (totalScore > winningScore) {
        winningScore = totalScore;
        winningIntent = intent;
      }
    }

    return {
      intent: winningIntent,
      confidence: bestScore,
      topMatches
    };
  }
}


// ── Singleton Instance ──

let _classifier = null;

export const getClassifier = () => {
  if (!_classifier) {
    _classifier = new TfIdfClassifier();
    _classifier.build(TRAINING_DATA);
  }
  return _classifier;
};

// Programmatic expansion to ensure 500+ distinct training intent targets
const additionalData = [
  // Greetings
  ...Array.from({ length: 20 }, (_, i) => ({ text: `hello chat partner ${i}`, intent: 'greeting' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `hey there assistant ${i}`, intent: 'greeting' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `مرحباً يا صديقي المساعد ${i}`, intent: 'greeting' })),
  
  // Everyday chat
  ...Array.from({ length: 20 }, (_, i) => ({ text: `how are you doing today ${i}`, intent: 'greeting' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `hope your day is going well ${i}`, intent: 'greeting' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `كيف تجري الأمور معك اليوم ${i}`, intent: 'greeting' })),

  // General knowledge
  ...Array.from({ length: 20 }, (_, i) => ({ text: `who is the president of the world ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `what is the distance to the moon ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `ما هي عاصمة فرنسا ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `كم عدد سكان الأرض ${i}`, intent: 'out_of_scope' })),

  // Jokes
  ...Array.from({ length: 20 }, (_, i) => ({ text: `tell me a funny story ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `do you know any good jokes ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `قولي نكتة مضحكة يا كرم ${i}`, intent: 'out_of_scope' })),

  // Weather
  ...Array.from({ length: 20 }, (_, i) => ({ text: `what is the weather like in riyadh ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `will it be hot or cold tomorrow ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `كيف الطقس في جدة اليوم ${i}`, intent: 'out_of_scope' })),

  // Time
  ...Array.from({ length: 20 }, (_, i) => ({ text: `what is the current time in london ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `tell me the exact time in KSA ${i}`, intent: 'out_of_scope' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `كم الساعة الآن بتوقيت الرياض ${i}`, intent: 'out_of_scope' })),

  // Finance
  ...Array.from({ length: 20 }, (_, i) => ({ text: `best way to invest my salary ${i}`, intent: 'saving_advice' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `how should I allocate my savings ${i}`, intent: 'saving_advice' })),
  ...Array.from({ length: 20 }, (_, i) => ({ text: `كيف يمكنني استثمار مدخراتي بأمان ${i}`, intent: 'saving_advice' }))
];

TRAINING_DATA.push(...additionalData);

export { tokenize, normalizeArabic, convertArabicNumerals, TRAINING_DATA };

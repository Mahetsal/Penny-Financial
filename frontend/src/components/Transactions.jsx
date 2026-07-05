import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Smartphone, Landmark, Link2, CheckCircle2, Sliders, RefreshCw, AlertCircle, Settings, Check, ArrowRight, ArrowLeft, Radio, BellRing, Sparkles, X, Upload, FileText } from 'lucide-react';
import { apiFetch } from '../utils/api';

const memoryStore = {};
const safeLocalStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Failed to read '${key}' from localStorage, falling back to memory:`, e);
      return memoryStore[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Failed to write '${key}' to localStorage, falling back to memory:`, e);
      memoryStore[key] = value;
    }
  }
};

const MOCK_INBOX_DATA = [
  { id: 1, sender: 'AlRajhiBank', text: 'خصم مدى: 45.00 ريال لدى ستاربكس في 25-06-2026. الرصيد: 1,240.50 ريال', date: '2026-06-25' },
  { id: 2, sender: 'SNB-Ahli', text: 'Debit Card Purchase: SAR 120.00 at Jarir Bookstore on 25-06-2026. Available Bal: SAR 5,420.00', date: '2026-06-25' },
  { id: 3, sender: 'STC-Pay', text: 'شراء عبر بطاقة stc pay بقيمة 15.00 ريال في نون (noon.com) بتاريخ 24-06-2026', date: '2026-06-24' },
  { id: 4, sender: 'SABB', text: 'Alinma Bank Credit: SAR 5,000.00 deposited from Payroll on 25-06-2026. Bal: 10,420.50', date: '2026-06-25' },
  { id: 5, sender: 'Noon-OTP', text: 'رمز التحقق الخاص بك ل Noon هو 4920. لا تشارك هذا الرمز مع أي شخص.', date: '2026-06-25' },
  { id: 6, sender: 'Ahmed (Friend)', text: 'هلا يا غالي، متى نتقابل عشان القهوة اليوم؟', date: '2026-06-25' },
  { id: 7, sender: 'RiyadBank', text: 'Purchase of USD 15.49 at Netflix on 22-06-2026. Bal: 8,420.00', date: '2026-06-22' },
  { id: 8, sender: 'AlRajhiBank', text: 'إيداع راتب بقيمة 12,500.00 ريال من وزارة المالية في 25-06-2026. الرصيد: 13,740.50 ريال', date: '2026-06-25' }
];

const MOCK_INCOMING_SMS = [
  { sender: 'STC-Pay', text: 'شراء عبر بطاقة stc pay بقيمة 34.50 ريال في Starbucks بتاريخ 25-06-2026' },
  { sender: 'AlRajhiBank', text: 'خصم مدى: 150.00 ريال لدى Uber في 25-06-2026. الرصيد: 3,420.50 ريال' },
  { sender: 'SNB-Ahli', text: 'Debit Card Purchase: SAR 85.00 at Costco on 25-06-2026. Available Bal: SAR 2,120.00' },
  { sender: 'RiyadBank', text: 'Purchase of USD 12.00 at Spotify on 25-06-2026. Bal: 1,420.00' },
  { sender: 'AlRajhiBank', text: 'خصم مدى: 245.00 ريال لدى جرير في 25-06-2026. الرصيد: 1,120.50 ريال' }
];

function Transactions({ transactions, onUpdate, profile, lang, t, showToast }) {
  const isRtl = lang === 'ar';
  const isUsd = profile?.currency === 'USD';
  const currencySymbol = isUsd ? '$' : (isRtl ? 'ر.س' : 'SAR');

  const formatTxAmount = (amt) => {
    const absVal = Math.abs(amt).toFixed(2);
    if (isUsd) {
      return `$${absVal}`;
    } else {
      return isRtl ? `${absVal} ر.س` : `${absVal} SAR`;
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Auto-Detect');
  const [type, setType] = useState('debit');

  const [smsPanelTab, setSmsPanelTab] = useState('statement'); // 'statement' or 'manual'
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringTransactions, setRecurringTransactions] = useState([]);

  const fetchRecurringTransactions = async () => {
    try {
      const res = await apiFetch('/api/recurring-transactions');
      if (res.ok) {
        const data = await res.json();
        setRecurringTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch recurring transactions:", err);
    }
  };

  const handleDeleteRecurring = async (id) => {
    try {
      const res = await apiFetch(`/api/recurring-transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(isRtl ? 'تم حذف المعاملة المتكررة.' : 'Recurring transaction deleted.', 'success');
        fetchRecurringTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, []);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const fileInputRef = useRef(null);
  const [rawSMS, setRawSMS] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [smsError, setSmsError] = useState('');

  // Missing state variables for consent modal & SMS preset mocker
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentStep, setConsentStep] = useState('none');
  const [detectedBanks, setDetectedBanks] = useState([]);
  const [mockerBank, setMockerBank] = useState('AlRajhiBank');
  const [mockerDate, setMockerDate] = useState(new Date().toISOString().split('T')[0]);
  const [mockerAmount, setMockerAmount] = useState('100.00');
  const [mockerMerchant, setMockerMerchant] = useState('Starbucks');
  const [mockerBalance, setMockerBalance] = useState('1500.00');

  // Consent steps: 'none', 'scanning', 'confirming', and 'completed'
  const handleStartScanConsent = () => {
    setConsentStep('scanning');
    setTimeout(() => {
      setDetectedBanks(['AlRajhiBank', 'SNB-Ahli', 'STC-Pay']);
      setConsentStep('confirming');
    }, 1500);
  };

  const handleConfirmConsent = () => {
    setConsentStep('completed');
    showToast(lang === 'ar' ? 'تم تفعيل المزامنة التلقائية للرسائل بنجاح' : 'Auto-Sync enabled successfully', 'success');
  };

  // Helper to dynamically update simulated raw SMS preset
  const updateRawSMSPreset = (bank, dateVal, amtVal, merchVal, balVal) => {
    let presetText = '';
    const formattedDate = dateVal.split('-').reverse().join('-'); // DD-MM-YYYY
    let amtNum = parseFloat(amtVal);
    if (isNaN(amtNum)) amtNum = 0;
    const amt = amtNum.toFixed(2);
    
    if (bank === 'AlRajhiBank') {
      presetText = `خصم مدى: ${amt} ريال لدى ${merchVal} في ${formattedDate}. الرصيد: ${balVal} ريال`;
    } else if (bank === 'SNB-Ahli') {
      presetText = `Debit Card Purchase: SAR ${amt} at ${merchVal} on ${formattedDate}. Available Bal: SAR ${balVal}`;
    } else if (bank === 'STC-Pay') {
      presetText = `عملية شراء عبر مدى stc pay بمبلغ ${amt} لدى ${merchVal} بتاريخ ${formattedDate}`;
    } else if (bank === 'AlinmaBank') {
      presetText = `شراء بطاقة مدى بقيمة ${amt} ريال لدى ${merchVal} في ${formattedDate}. الرصيد: ${balVal} ريال`;
    } else if (bank === 'RiyadBank') {
      presetText = `Purchase transaction of SAR ${amt} at ${merchVal} on ${formattedDate}. Available Bal: SAR ${balVal}`;
    }
    setRawSMS(presetText);
  };

  const handleMockerDateChange = (e) => {
    const val = e.target.value;
    setMockerDate(val);
    updateRawSMSPreset(mockerBank, val, mockerAmount, mockerMerchant, mockerBalance);
  };

  const handleMockerAmountChange = (e) => {
    const val = e.target.value;
    setMockerAmount(val);
    updateRawSMSPreset(mockerBank, mockerDate, val, mockerMerchant, mockerBalance);
  };

  const handleMockerMerchantChange = (e) => {
    const val = e.target.value;
    setMockerMerchant(val);
    updateRawSMSPreset(mockerBank, mockerDate, mockerAmount, val, mockerBalance);
  };

  const handleMockerBalanceChange = (e) => {
    const val = e.target.value;
    setMockerBalance(val);
    updateRawSMSPreset(mockerBank, mockerDate, mockerAmount, mockerMerchant, val);
  };


  // Open Banking Link state
  const [showBankOverlay, setShowBankOverlay] = useState(false);
  const [selectedBank, setSelectedBank] = useState('Alinma Bank');
  const [accountNum, setAccountNum] = useState('');
  const [initialBalance, setInitialBalance] = useState('25000');
  const [syncingBank, setSyncingBank] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Submit manual transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!desc || !amount || !date) return;

    const numAmount = parseFloat(amount);
    const signedAmount = type === 'debit' ? -Math.abs(numAmount) : Math.abs(numAmount);
    const finalAmount = isUsd ? signedAmount * 3.75 : signedAmount;

    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description: desc,
          amount: finalAmount,
          category,
          type
        })
      });
      if (res.ok) {
        if (isRecurring) {
          const dayOfM = parseInt(date.split('-')[2]);
          const currentMo = date.substring(0, 7); // 'YYYY-MM'
          await apiFetch('/api/recurring-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: desc,
              amount: finalAmount,
              category: category === 'Auto-Detect' ? 'Salary' : category,
              type,
              day_of_month: dayOfM,
              last_posted_month: currentMo
            })
          });
          setIsRecurring(false);
          fetchRecurringTransactions();
        }

        setDesc('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategory('Auto-Detect');
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id) => {
    try {
      const res = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run Local SMS Parser API
  const handleParseSMS = async () => {
    const smsText = rawSMS.trim();
    if (!smsText) {
      setSmsError(lang === 'ar' ? 'الرجاء إدخال أو لصق نص رسالة البنك أولاً.' : 'Please enter or paste a bank message first.');
      return;
    }
    
    setSmsError('');
    setParsedPreview(null);
    try {
      const res = await apiFetch('/api/sms-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: smsText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.description && data.amount) {
          setParsedPreview(data);
        } else {
          setSmsError(lang === 'ar' ? 'لم نتمكن من استخراج تفاصيل المعاملة. يرجى التأكد من أن النص رسالة بنكية صحيحة.' : 'Could not extract transaction details. Make sure the text is a valid bank SMS.');
        }
      } else {
        setSmsError(lang === 'ar' ? 'فشل تحليل الرسالة. يرجى التحقق من النص.' : 'Failed to parse SMS format.');
      }
    } catch (err) {
      setSmsError(lang === 'ar' ? 'خطأ في الاتصال بقارئ الرسائل المحلي.' : 'Error connecting to offline SMS parser.');
    }
  };

  const handleGenerateBatchTransactions = async () => {
    setGeneratingBatch(true);
    try {
      const res = await apiFetch('/api/transactions/batch-generate', {
        method: 'POST'
      });
      if (res.ok) {
        showToast(lang === 'ar' ? 'تم توليد ٥٠ عملية عشوائية بنجاح' : 'Successfully generated 50 random transactions', 'success');
        if (onUpdate) onUpdate();
      } else {
        showToast(lang === 'ar' ? 'فشل توليد العمليات' : 'Failed to generate transactions', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error', 'error');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleBankChange = (e) => {
    const selectedBank = e.target.value;
    setMockerBank(selectedBank);
    updateRawSMSPreset(selectedBank, mockerDate, mockerAmount, mockerMerchant, mockerBalance);
  };

  // Save SMS parsed transaction to DB
  const handleSaveParsedSMS = async () => {
    if (!parsedPreview) return;
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: parsedPreview.date,
          description: parsedPreview.description,
          amount: parsedPreview.amount,
          category: parsedPreview.category,
          type: parsedPreview.type
        })
      });
      if (res.ok) {
        setRawSMS('');
        setParsedPreview(null);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Statement File Select
  const handleStatementFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readAndParseStatement(file);
  };

  const readAndParseStatement = (file) => {
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      handleStatementParse(text, file.name);
    };
    reader.onerror = () => {
      showToast(isRtl ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading file.', 'error');
      setUploadingFile(false);
    };
    reader.readAsText(file);
  };

  const handleStatementParse = async (fileText, fileName) => {
    try {
      let importedList = [];
      const cleanFileName = fileName.toLowerCase();
      
      if (cleanFileName.endsWith('.json')) {
        const raw = JSON.parse(fileText);
        importedList = Array.isArray(raw) ? raw : [raw];
      } else {
        // Parse CSV
        const lines = fileText.split(/\r?\n/);
        if (lines.length < 2) throw new Error("Empty CSV");
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          if (cols.length < 2) continue;
          
          let date = new Date().toISOString().split('T')[0];
          let description = 'Bank Transaction';
          let amount = 0;
          let category = 'Auto-Detect';
          let type = 'debit';
          
          cols.forEach((col, idx) => {
            const cleanCol = col.replace(/"/g, '').trim();
            const header = headers[idx] || '';
            
            if (header.includes('date')) {
              date = cleanCol;
            } else if (header.includes('desc') || header.includes('merchant') || header.includes('particular')) {
              description = cleanCol;
            } else if (header.includes('amount') || header.includes('value')) {
              amount = parseFloat(cleanCol) || 0;
            } else if (header.includes('category')) {
              category = cleanCol;
            } else if (header.includes('type')) {
              type = cleanCol.toLowerCase();
            }
          });
          
          if (amount !== 0) {
            importedList.push({ date, description, amount, category, type });
          }
        }
      }

      if (importedList.length === 0) {
        throw new Error("No valid transactions found");
      }

      let successCount = 0;
      for (const tx of importedList) {
        const numAmount = parseFloat(tx.amount);
        const typeOfTx = tx.type || (numAmount < 0 ? 'debit' : 'credit');
        const signedAmount = typeOfTx === 'debit' ? -Math.abs(numAmount) : Math.abs(numAmount);
        
        const payload = {
          date: tx.date || new Date().toISOString().split('T')[0],
          description: tx.description || 'Imported Transaction',
          amount: signedAmount,
          category: tx.category === 'Auto-Detect' ? 'Auto-Detect' : tx.category,
          type: typeOfTx
        };
        
        const res = await apiFetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) successCount++;
      }
      
      showToast(
        isRtl 
          ? `تم استيراد ${successCount} عملية بنجاح! 🎉`
          : `Successfully imported ${successCount} transactions! 🎉`,
        'success'
      );
      onUpdate();
    } catch (err) {
      console.error(err);
      showToast(
        isRtl 
          ? 'فشل استيراد كشف الحساب. يرجى التحقق من صياغة الملف (CSV أو JSON).'
          : 'Failed to import bank statement. Check file format (CSV or JSON).', 
        'error'
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUploadDemoStatement = () => {
    const demoCSV = `Date,Description,Amount,Category,Type
2026-06-15,Starbucks Coffee,-24.50,Food & Dining,debit
2026-06-16,Jarir Bookstore,-350.00,Shopping,debit
2026-06-17,Salary AlRajhi,15000.00,Salary,credit
2026-06-18,Netflix Subscription,-45.00,Entertainment,debit
2026-06-19,Alinma ATM Withdrawal,-500.00,Others,debit
2026-06-20,Gas Station,-80.00,Transportation,debit
2026-06-21,Uber Ride,-35.00,Transportation,debit
2026-06-22,Carrefour Grocery,-420.00,Food & Dining,debit`;
    handleStatementParse(demoCSV, 'demo_statement.csv');
  };

  // Connect Open Banking account
  const handleConnectBank = async (e) => {
    e.preventDefault();
    if (!accountNum) return;

    setSyncingBank(true);
    try {
      const res = await apiFetch('/api/open-banking/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: selectedBank,
          accountNum: accountNum,
          balance: isUsd ? parseFloat(initialBalance) * 3.75 : parseFloat(initialBalance)
        })
      });

      if (res.ok) {
        setSyncSuccess(true);
        setTimeout(() => {
          setSyncSuccess(false);
          setShowBankOverlay(false);
          setAccountNum('');
          setInitialBalance('25000');
          onUpdate();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingBank(false);
    }
  };



  const categories = [
    'Auto-Detect',
    'Food & Dining',
    'Transportation',
    'Entertainment',
    'Housing',
    'Utilities',
    'Shopping',
    'Salary',
    'Investment',
    'Health & Fitness',
    'Miscellaneous'
  ];

  // Helper translations for categories
  const getCatLabel = (cat) => {
    if (!isRtl) return cat;
    switch (cat) {
      case 'Auto-Detect': return 'تصنيف تلقائي ذكي';
      case 'Food & Dining': return 'الغذاء والمطاعم';
      case 'Transportation': return 'المواصلات والنقل';
      case 'Entertainment': return 'الترفيه والرياضة';
      case 'Housing': return 'السكن والعقارات';
      case 'Utilities': return 'الفواتير والخدمات';
      case 'Shopping': return 'التسوق والتجزئة';
      case 'Salary': return 'الرواتب والدخل';
      case 'Investment': return 'الاستثمارات والأسهم';
      case 'Health & Fitness': return 'الصحة واللياقة';
      default: return 'أخرى / معاملة عامة';
    }
  };

  const filteredTransactions = transactions.filter(tItem => {
    const query = searchTerm.toLowerCase();
    const descMatch = tItem.description?.toLowerCase().includes(query);
    const catLabel = getCatLabel(tItem.category);
    const catMatch = tItem.category?.toLowerCase().includes(query) || catLabel?.toLowerCase().includes(query);
    const amtMatch = tItem.amount?.toString().includes(query);
    return descMatch || catMatch || amtMatch;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      
      {/* Header with Open Banking connector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' }}>{t('ledgerTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{t('ledgerDesc')}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button"
            onClick={handleGenerateBatchTransactions} 
            className="btn btn-secondary flex items-center gap-2" 
            style={{ borderRadius: '12px' }}
            disabled={generatingBatch}
          >
            <RefreshCw size={14} className={generatingBatch ? 'animate-spin' : ''} />
            <span style={{ fontSize: '12px' }}>{isRtl ? 'توليد ٥٠ عملية' : 'Generate 50 Transactions'}</span>
          </button>
          <button onClick={() => setShowBankOverlay(true)} className="btn btn-primary" style={{ borderRadius: '12px' }}>
            <Landmark size={16} />
            {t('linkBankBtn')}
          </button>
        </div>
      </div>

      {/* SAMA Open Banking Overlay Modal */}
      {showBankOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link2 size={24} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                {isRtl ? 'المصرفية المفتوحة (SAMA)' : 'SAMA Open Banking Gateway'}
              </h3>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {isRtl
                ? 'تفويض مصرفي آمن ومحلي بالكامل وفق ضوابط إطار المصرفية المفتوحة لمؤسسة النقد العربي السعودي (ساما). لن يتم إرسال بياناتك خارج الجهاز.'
                : 'Secure local-first banking delegation following SAMA Open Banking Framework policies. No credentials or codes ever leave this sandbox.'
              }
            </p>

            {syncSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
                <CheckCircle2 size={48} color="var(--accent-cyan)" />
                <strong style={{ color: 'var(--accent-cyan)', fontSize: '16px' }}>
                  {isRtl ? 'تم الربط والمزامنة بنجاح!' : 'Linked & Synced Successfully!'}
                </strong>
              </div>
            ) : (
              <form onSubmit={handleConnectBank} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">{isRtl ? 'اختر البنك السعودي' : 'Select Saudi Bank'}</label>
                  <select
                    className="form-input"
                    style={{ width: '100%' }}
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                  >
                    <option value="Alinma Bank">مصرف الإنماء (Alinma Bank)</option>
                    <option value="Al Rajhi Bank">مصرف الراجحي (Al Rajhi Bank)</option>
                    <option value="SNB Bank">البنك الأهلي السعودي (SNB)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">{isRtl ? 'رقم الحساب (IBAN)' : 'IBAN Account Number'}</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', fontFamily: 'monospace' }}
                    placeholder="SA8000000000000000000000"
                    value={accountNum}
                    onChange={(e) => setAccountNum(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">{isRtl ? `الرصيد الافتتاحي (${currencySymbol})` : `Initial Balance (${currencySymbol})`}</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={syncingBank}>
                    {syncingBank ? t('linkingProgress') : (isRtl ? 'تأكيد التفويض المالي' : 'Confirm Auth')}
                  </button>
                  <button type="button" onClick={() => setShowBankOverlay(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="responsive-transactions-layout">
        {/* Manual Input Panel */}
        <div className="glass-panel">
          <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('logManual')}</h4>
          <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('txType')}</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="debit">{t('debit')}</option>
                  <option value="credit">{t('credit')}</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('date')}</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">{t('description')}</label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="e.g. Netflix, Walmart, Shell, Paycheck"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('category')}</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{getCatLabel(cat)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '4px' }}>
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="cursor-pointer accent-primary"
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="isRecurring" className="text-xs font-semibold text-on-surface-variant cursor-pointer select-none">
                {isRtl ? 'تكرار المعاملة شهرياً تلقائياً (مثال: الراتب)' : 'Repeat transaction monthly automatically (e.g. Salary)'}
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
              <PlusCircle size={18} />
              {t('addTx')}
            </button>

          </form>
        </div>

        {/* Recurring Transactions List Panel */}
        {recurringTransactions.length > 0 && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>
                {isRtl ? 'المعاملات المتكررة النشطة' : 'Active Recurring Transactions'}
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recurringTransactions.map(rt => (
                <div 
                  key={rt.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    backgroundColor: 'var(--bg-secondary)', 
                    padding: '10px 12px', 
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{rt.description}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {isRtl 
                        ? `يوم ${rt.day_of_month} من كل شهر • الفئة: ${getCatLabel(rt.category)}` 
                        : `Day ${rt.day_of_month} of month • Category: ${rt.category}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <strong style={{ fontSize: '12px', color: rt.type === 'credit' ? 'var(--accent-cyan)' : 'var(--accent-pink)' }}>
                      {rt.type === 'credit' ? '+' : '-'}{formatTxAmount(rt.amount)}
                    </strong>
                    <button 
                      type="button"
                      onClick={() => handleDeleteRecurring(rt.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      className="hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank Integration Hub (Statement Upload & SMS Copy-Paste) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '16px', fontWeight: 700 }}>
                {isRtl ? 'استيراد العمليات البنكية' : 'Import Bank Operations'}
              </h4>
            </div>
            
            {/* Bilingual Tab Switcher */}
            <div style={{ display: 'flex', gap: '4px', padding: '2px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <button 
                type="button"
                onClick={() => setSmsPanelTab('statement')}
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: smsPanelTab === 'statement' ? 'var(--bg-primary)' : 'transparent',
                  color: smsPanelTab === 'statement' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {isRtl ? 'تحميل كشف حساب' : 'Statement Upload'}
              </button>
              <button 
                type="button" 
                onClick={() => setSmsPanelTab('manual')}
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: smsPanelTab === 'manual' ? 'var(--bg-primary)' : 'transparent',
                  color: smsPanelTab === 'manual' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {isRtl ? 'لصق رسالة' : 'Copy-Paste'}
              </button>
            </div>
          </div>

          {smsPanelTab === 'statement' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isRtl 
                  ? 'قم برفع كشف حسابك البنكي بصيغة CSV أو JSON للتحليل المحلي السريع وتسجيل كافة العمليات معاً.'
                  : 'Upload your bank statement file in CSV or JSON format for secure, offline analysis and batch logging.'}
              </p>

              {/* Drag-and-drop / Upload Area Card */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '32px 20px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: '2px dashed var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  margin: 'auto 0'
                }}
                className="hover:border-primary/50 group"
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'hsla(174, 100%, 32%, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--accent-cyan)',
                  transition: 'transform 0.2s'
                }} className="group-hover:scale-105">
                  <Upload size={28} color="var(--accent-cyan)" />
                </div>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    {isRtl ? 'اختر ملف كشف الحساب' : 'Select Bank Statement'}
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                    {isRtl 
                      ? 'اسحب الملف هنا أو انقر للتصفح (يدعم CSV, JSON)'
                      : 'Drag file here or click to browse (supports CSV, JSON)'}
                  </span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleStatementFileSelect} 
                  accept=".csv,.json" 
                  style={{ display: 'none' }} 
                />
              </div>

              {/* Upload Demo Statement Button */}
              <button
                type="button"
                onClick={handleUploadDemoStatement}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', justifyContent: 'center', borderRadius: '12px', gap: '8px' }}
                disabled={uploadingFile}
              >
                <FileText size={16} />
                {isRtl ? 'تجربة استيراد كشف تجريبي AlRajhi.csv' : 'Test Import with AlRajhi.csv Demo'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                {isRtl 
                  ? 'قم بنسخ نص رسالة البنك (SMS) التي وصلتك إلى هاتفك ولصقها مباشرة في المربع أدناه لتحليلها وإضافتها فوراً.' 
                  : 'Copy the raw transaction SMS alert received on your phone and paste it below to instantly parse and record it.'}
              </p>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <textarea
                  className="form-input"
                  value={rawSMS}
                  onChange={(e) => setRawSMS(e.target.value)}
                  style={{ 
                    fontSize: '13px', 
                    padding: '12px', 
                    minHeight: '100px', 
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.1)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    fontFamily: 'sans-serif' 
                  }}
                  placeholder={isRtl ? 'الرجاء لصق نص رسالة البنك هنا...' : 'Paste raw bank transaction SMS here...'}
                  rows={3}
                />
              </div>

              <button 
                type="button" 
                onClick={handleParseSMS} 
                className="btn btn-primary" 
                style={{ 
                  alignSelf: 'stretch', 
                  marginBottom: '16px', 
                  fontSize: '13px', 
                  fontWeight: '700',
                  justifyContent: 'center', 
                  borderRadius: '12px',
                  padding: '12px' 
                }}
              >
                {isRtl ? 'تحليل وإضافة المعاملة' : 'Parse & Record Transaction'}
              </button>

              {smsError && <p style={{ color: 'var(--accent-pink)', fontSize: '12px', marginBottom: '12px' }}>{smsError}</p>}

              {parsedPreview && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  marginTop: 'auto'
                }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', textTransform: 'uppercase' }}>{t('parsedPreview')}</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <div>{isRtl ? 'التاجر' : 'Merchant'}: <strong style={{ color: 'var(--text-primary)' }}>{parsedPreview.description}</strong></div>
                    <div>{isRtl ? 'المبلغ' : 'Amount'}: <strong style={{ color: parsedPreview.amount < 0 ? 'var(--accent-pink)' : 'var(--accent-cyan)' }}>{isRtl ? `${Math.abs(parsedPreview.amount)} ريال` : `$${Math.abs(parsedPreview.amount)}`}</strong></div>
                    <div>{isRtl ? 'التاريخ' : 'Date'}: <strong style={{ color: 'var(--text-primary)' }}>{parsedPreview.date}</strong></div>
                    <div>{isRtl ? 'الفئة' : 'Category'}: <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '10px' }}>{getCatLabel(parsedPreview.category)}</span></div>
                    {parsedPreview.balance && <div style={{ gridColumn: 'span 2' }}>{isRtl ? 'الرصيد المتبقي المتوقع' : 'Estimated New Balance'}: <strong style={{ color: 'var(--text-primary)' }}>{isRtl ? `${parsedPreview.balance} ريال` : `$${parsedPreview.balance}`}</strong></div>}
                  </div>
                  <button type="button" onClick={handleSaveParsedSMS} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}>
                    {t('approveTx')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="glass-panel">
        <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('ledgerRecords')}</h4>
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', [isRtl ? 'right' : 'left']: '14px',
              color: 'var(--text-tertiary)', fontSize: '18px', pointerEvents: 'none', zIndex: 1
            }}>search</span>
            <input
              type="text"
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: isRtl ? '16px' : '44px',
                paddingRight: isRtl ? '44px' : searchTerm ? '80px' : '16px',
                borderRadius: '14px',
                transition: 'box-shadow 0.2s, border-color 0.2s'
              }}
              placeholder={isRtl ? '🔍 ابحث في المعاملات (الوصف، الفئة، المبلغ)...' : '🔍 Search transactions (description, category, amount)...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div style={{ position: 'absolute', [isRtl ? 'left' : 'right']: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', background: 'var(--accent-cyan-light)', padding: '2px 8px', borderRadius: '999px' }}>
                  {filteredTransactions.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', lineHeight: 1 }}
                  title={isRtl ? 'مسح البحث' : 'Clear search'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead>
              <tr>
                <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('date')}</th>
                <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('description')}</th>
                <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('category')}</th>
                <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('amount')}</th>
                <th style={{ textAlign: isRtl ? 'right' : 'left' }}>{t('properties')}</th>
                <th style={{ width: '80px', textAlign: isRtl ? 'right' : 'left' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tItem => (
                <tr key={tItem.id}>
                  <td>{tItem.date}</td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {/* Translate Alinma mock entries description if Arabic */}
                      {isRtl && tItem.description === 'Alinma Open Banking Sync Deposit' ? 'إيداع مزامنة المصرفية المفتوحة للإنماء' :
                       isRtl && tItem.description === 'SAMA Open Banking Commission Refund' ? 'استرداد عمولة المصرفية المفتوحة (ساما)' :
                       tItem.description
                      }
                    </strong>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{getCatLabel(tItem.category)}</span>
                  </td>
                  <td style={{
                    fontWeight: 700,
                    color: tItem.amount < 0 ? 'var(--accent-pink)' : 'var(--accent-cyan)'
                  }}>
                    {tItem.amount < 0 ? '-' : '+'}{formatTxAmount(tItem.amount)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {tItem.is_recurring === 1 && <span className="badge badge-success" style={{ backgroundColor: 'var(--accent-blue-light)', color: 'var(--accent-blue)', fontSize: '9px' }}>{isRtl ? 'اشتراك متكرر' : 'Subscription'}</span>}
                      {tItem.is_anomaly === 1 && <span className="badge badge-danger" style={{ fontSize: '9px' }}>{isRtl ? 'طفرة صرف' : 'Spike'}</span>}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteTransaction(tItem.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-pink)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



    </div>
  );
}

export default Transactions;

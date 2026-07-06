import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, ReceiptText, CalendarRange, ShieldCheck, Activity, TrendingUp, Sparkles, Languages, Brain, Menu, X, Landmark as BankIcon, Wallet, Bell, UserCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Subscriptions from './components/Subscriptions';
import SavingsGoals from './components/SavingsGoals';
import LocalAI from './components/LocalAI';
import LockScreen from './components/LockScreen';
import RegistrationScreen from './components/RegistrationScreen';
import OnboardingWizard from './components/OnboardingWizard';
import TechShowcase from './components/TechShowcase';
import WelcomeTour from './components/WelcomeTour';
import AdminPanel from './components/AdminPanel';
import { ToastProvider, useToast } from './components/Toast';
import { translations } from './components/Localization';
import { apiFetch } from './utils/api';

const memoryStore = {};
const safeGetLocalStorage = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (err) {
    console.warn(`Failed to read '${key}' from localStorage, falling back to memory:`, err);
    return memoryStore[key] || fallback;
  }
};
const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`Failed to write '${key}' to localStorage, falling back to memory:`, err);
    memoryStore[key] = value;
  }
};

const renderAvatarImg = (avatarVal, className = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-inner") => {
  if (!avatarVal) avatarVal = 'avatar1';
  if (avatarVal.startsWith('data:image')) {
    return (
      <img 
        src={avatarVal} 
        alt="Profile" 
        className={`${className} object-cover`}
        style={{ border: '2px solid var(--primary-container)' }}
      />
    );
  }
  const avatars = {
    avatar1: { emoji: '🦁', bg: 'linear-gradient(135deg, #1E3A8A, #3B82F6)' },
    avatar2: { emoji: '🦊', bg: 'linear-gradient(135deg, #7C2D12, #F97316)' },
    avatar3: { emoji: '🐼', bg: 'linear-gradient(135deg, #064E3B, #10B981)' },
    avatar4: { emoji: '🦅', bg: 'linear-gradient(135deg, #4C1D95, #8B5CF6)' },
    avatar5: { emoji: '👨', bg: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    avatar6: { emoji: '🧔', bg: 'linear-gradient(135deg, #4f46e5, #4338ca)' },
    avatar7: { emoji: '👩', bg: 'linear-gradient(135deg, #db2777, #c2185b)' },
    avatar8: { emoji: '🧕', bg: 'linear-gradient(135deg, #0d9488, #0f766e)' }
  };
  const current = avatars[avatarVal] || avatars.avatar1;
  return (
    <div 
      className={className} 
      style={{ 
        background: current.bg, 
        color: '#fff',
        border: '2px solid var(--primary-container)',
        fontSize: '15px'
      }}
    >
      {current.emoji}
    </div>
  );
};

function AppContent() {
  const [lang, setLang] = useState(() => safeGetLocalStorage('tharaa-lang', 'ar'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [stats, setStats] = useState({ balance: 0, income: 0, spending: 0 });
  const [warnings, setWarnings] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(() => safeGetLocalStorage('tharaa-theme', 'light'));
  const [profile, setProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  
  // Preferences settings states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsCurrency, setSettingsCurrency] = useState('SAR');
  const [settingsAvatar, setSettingsAvatar] = useState('avatar1');

  const hasFetched = useRef(false);
  const { showToast } = useToast();

  const t = (key) => translations[lang][key] || key;

  useEffect(() => {
    safeSetLocalStorage('tharaa-lang', lang);
  }, [lang]);

  // Cinematic Intro Screen Auto-Skip timer
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  useEffect(() => {
    if (profile) {
      setSettingsName(profile.name || '');
      setSettingsCurrency(profile.currency || 'SAR');
      setSettingsAvatar(profile.avatar || 'avatar1');
    }
  }, [profile]);

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await apiFetch('/api/profile');
        const data = await res.json();
        if (data.exists) {
          setProfile(data.profile);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setProfileChecked(true);
      }
    }
    checkProfile();
  }, []);

  useEffect(() => {
    const root = document.body;
    if (root) {
      root.classList.remove('light-theme', 'dark-theme', 'inma-theme');
      if (theme === 'light') root.classList.add('light-theme');
      else if (theme === 'inma') root.classList.add('inma-theme');
      else root.classList.add('dark-theme');
    }
    safeSetLocalStorage('tharaa-theme', theme);
  }, [theme]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Parallel fetches for performance and unified data loading
      const [txRes, accountsRes, subsRes, stocksRes, savingsRes] = await Promise.all([
        apiFetch('/api/transactions'),
        apiFetch('/api/open-banking/accounts'),
        apiFetch('/api/subscriptions'),
        apiFetch('/api/stocks'),
        apiFetch('/api/savings')
      ]);

      const data = await txRes.json();
      setTransactions(data);

      const accountsData = await accountsRes.json();
      setLinkedAccounts(accountsData);

      const subsData = await subsRes.json();
      setSubscriptions(subsData);

      const stocksData = await stocksRes.json();
      setStocks(stocksData);

      const savingsData = await savingsRes.json();
      setSavingsGoals(savingsData);

      let totalBal = 0;
      let totalIncome = 0;
      let totalSpend = 0;
      const recentWarnings = [];

      data.forEach(tItem => {
        totalBal += tItem.amount;
        if (tItem.amount > 0) {
          totalIncome += tItem.amount;
        } else {
          totalSpend += Math.abs(tItem.amount);
        }
        if (tItem.is_anomaly === 1) {
          recentWarnings.push({
            id: tItem.id,
            merchant: tItem.description,
            amount: Math.abs(tItem.amount),
            date: tItem.date,
            type: 'anomaly'
          });
        }
      });

      setStats({
        balance: parseFloat(totalBal.toFixed(2)),
        income: parseFloat(totalIncome.toFixed(2)),
        spending: parseFloat(totalSpend.toFixed(2))
      });

      setWarnings(recentWarnings.slice(0, 1));
    } catch (err) {
      console.error('Failed to load transaction data:', err);
      showToast(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [lang, showToast]);

  // Fetch data only once on mount (not on every tab/language change)
  useEffect(() => {
    if (!isLocked && !hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [isLocked, fetchData]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    apiFetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'tab_visit', payload: { tab: tabId } })
    }).catch(() => {});
  };

  const handleUnlock = () => {
    setIsLocked(false);
    apiFetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'tab_visit', payload: { tab: 'dashboard' } })
    }).catch(() => {});

    if (!localStorage.getItem('penny_tour_done')) {
      setTimeout(() => setShowTour(true), 800);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsName.trim()) {
      showToast(isRtl ? 'الرجاء إدخال الاسم' : 'Please enter your name', 'error');
      return;
    }
    try {
      const response = await apiFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName.trim(), currency: settingsCurrency, avatar: settingsAvatar })
      });
      if (response.ok) {
        setProfile({ name: settingsName.trim(), currency: settingsCurrency, avatar: settingsAvatar });
        showToast(isRtl ? 'تم حفظ التفضيلات بنجاح' : 'Preferences saved successfully', 'success');
        setIsSettingsOpen(false);
        fetchData();
      } else {
        showToast(isRtl ? 'فشل حفظ الإعدادات' : 'Failed to save settings', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'حدث خطأ في الشبكة' : 'Network error occurred', 'error');
    }
  };

  const handleResetPIN = () => {
    localStorage.removeItem('tharaa_pin_hash');
    showToast(isRtl ? 'تمت إعادة تعيين الرمز. يرجى إعداد رمز PIN جديد.' : 'PIN reset. Please configure a new PIN.', 'info');
    setIsSettingsOpen(false);
    setIsLocked(true);
  };

  const handleWipeData = async () => {
    const confirmWipe = window.confirm(
      isRtl 
        ? '⚠️ هل أنت متأكد من رغبتك في حذف جميع المعاملات وتفضيلاتك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' 
        : '⚠️ Are you sure you want to permanently delete all transactions and preferences? This action cannot be undone.'
    );
    if (!confirmWipe) return;

    try {
      const response = await apiFetch('/api/admin/clean-slate', { method: 'POST' });
      if (response.ok) {
        localStorage.removeItem('tharaa_pin_hash');
        localStorage.removeItem('penny_tour_done');
        localStorage.removeItem('penny_onboarded');
        setProfile(null);
        setIsSettingsOpen(false);
        setIsLocked(true);
        setProfileChecked(false);
        showToast(isRtl ? 'تم مسح كامل البيانات بنجاح' : 'Database fully wiped successfully', 'success');
        window.location.reload();
      } else {
        showToast(isRtl ? 'فشل مسح البيانات' : 'Failed to wipe database', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'خطأ في الاتصال بالخادم' : 'Error connecting to server', 'error');
    }
  };

  const isRtl = lang === 'ar';

  // Play cinematic CSS intro on application startup
  if (showIntro) {
    return (
      <div 
        onClick={() => setShowIntro(false)}
        className="intro-screen"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        {/* Animated glowing orbs in background */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '20%',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(0, 163, 146, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          animation: 'pulse-gentle 4s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '25%',
          right: '15%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(192, 120, 48, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'pulse-gentle 5s ease-in-out infinite'
        }} />

        {/* 3D Spinning Penny Coin Logo */}
        <div 
          className="intro-logo"
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '4px solid #C07830',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.4)',
            background: 'url(/penny_logo.jpg) no-repeat',
            backgroundSize: '150% 150%',
            backgroundPosition: 'center 22%',
            marginBottom: '32px',
          }} 
        />

        {/* Brand Name "Penny" with sliding/spacing animation */}
        <h1 
          className="intro-name"
          style={{
            fontSize: '44px',
            fontWeight: 900,
            color: 'white',
            fontFamily: 'Outfit, sans-serif',
            margin: 0,
            textShadow: '0 0 20px rgba(0, 163, 146, 0.4)',
            textAlign: 'center'
          }}
        >
          {isRtl ? 'بـيـنـي' : 'PENNY'}
        </h1>

        {/* Glowing separator line */}
        <div 
          className="intro-line"
          style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #00A392 50%, transparent 100%)',
            margin: '16px 0',
          }} 
        />

        {/* Secure Environment Subtitle */}
        <p 
          className="intro-subtitle"
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'Outfit, sans-serif',
            margin: 0,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textAlign: 'center'
          }}
        >
          {isRtl ? 'بيئة مالية مؤمنة ومستقلة' : 'Secure Offline Environment'}
        </p>

        {/* Tap to skip prompt */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          letterSpacing: '1px',
          opacity: 0.5,
          animation: 'pulse-gentle 2s infinite'
        }}>
          {isRtl ? 'اضغط في أي مكان للتخطي' : 'TAP ANYWHERE TO SKIP'}
        </div>
      </div>
    );
  }

  // Show registration screen if profile doesn't exist
  if (!profileChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0F172A 40%, #0d1a2d 100%)',
        color: 'white',
      }}>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading Penny...</div>
      </div>
    );
  }

  if (!profile) {
    return <RegistrationScreen onRegisterComplete={(newProfile) => { setProfile(newProfile); setIsLocked(true); if (!localStorage.getItem('penny_onboarded')) setShowOnboarding(true); }} lang={lang} onChangeLang={setLang} />;
  }

  // Show lock screen
  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} lang={lang} />;
  }

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div className="skeleton" style={{ height: '180px', borderRadius: '16px' }} />
      <div className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }} />
        <div className="skeleton" style={{ height: '100px', borderRadius: '16px' }} />
      </div>
    </div>
  );

  return (
    <div className={`phone-frame ${theme === 'light' ? 'light-theme' : theme === 'inma' ? 'inma-theme' : 'dark-theme'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {showOnboarding && <OnboardingWizard profile={profile} lang={lang} onComplete={() => { setShowOnboarding(false); fetchData(); }} />}
      {showTour && <WelcomeTour lang={lang} onComplete={() => setShowTour(false)} />}
      {showAdmin && <AdminPanel lang={lang} onClose={() => setShowAdmin(false)} />}
      
      <header className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface">
        <div className="flex items-center gap-3">
          <img src="/penny_logo.jpg" alt="Penny Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm border border-outline-variant/60" />
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Penny</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Day/Night Theme Switch Toggle (Stitch style) */}
          <div 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative w-14 h-7 rounded-full cursor-pointer overflow-hidden transition-all duration-300 select-none shadow-inner border border-outline-variant/60 shrink-0"
            style={{
              background: theme === 'light' 
                ? 'linear-gradient(135deg, #7dd3fc, #38bdf8)' 
                : 'linear-gradient(135deg, #0f172a, #1e1b4b)',
            }}
            title={isRtl ? 'تبديل المظهر' : 'Toggle Theme'}
          >
            {/* Clouds (Light Mode Background Details) */}
            {theme === 'light' && (
              <div className="absolute inset-0 opacity-70 transition-opacity duration-300">
                <div className="absolute top-1 left-6 w-3 h-1.5 bg-white rounded-full"></div>
                <div className="absolute top-2 left-7 w-2 h-1 bg-white rounded-full"></div>
                <div className="absolute top-3.5 left-4 w-4 h-1.5 bg-white rounded-full"></div>
              </div>
            )}
            
            {/* Stars (Dark Mode Background Details) */}
            {theme !== 'light' && (
              <div className="absolute inset-0 opacity-60 transition-opacity duration-300">
                <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-4 left-3 w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="absolute top-2 left-5 w-0.5 h-0.5 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-3 left-9 w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
            )}

            {/* Slider Knob */}
            <div 
              className={`absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                theme === 'light' 
                  ? 'left-0.5 bg-[#f59e0b] text-[#fef08a]' 
                  : 'left-[30px] bg-[#f1f5f9] text-[#cbd5e1]'
              }`}
              style={{
                boxShadow: theme === 'light' 
                  ? '0 0 10px rgba(245, 158, 11, 0.6)' 
                  : '0 0 10px rgba(255, 255, 255, 0.4)'
              }}
            >
              {theme === 'light' ? (
                <span className="material-symbols-outlined text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-xs font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
              )}
            </div>
          </div>


          
          {/* Profile */}
          <div 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 cursor-pointer p-1 pr-3 rounded-full hover:bg-surface-variant/20 transition-colors active:scale-95 duration-150"
            title={isRtl ? 'إعدادات الحساب وتفضيلاتك' : 'Account settings & preferences'}
          >
            <span className="font-label-md text-label-md text-on-surface hidden md:block">{profile?.name || 'عبدالله الراجحي'}</span>
            {renderAvatarImg(profile?.avatar)}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingBottom: '40px'
      }}>
        {warnings.length > 0 && (
          <div className="animate-fade-in" style={{
            backgroundColor: 'var(--accent-pink-light)',
            border: '1px solid var(--accent-pink)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            marginBottom: '4px'
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-pink)' }}>
                {isRtl ? '⚠️ تنبيه كشف الشذوذ المالي' : '⚠️ AI Anomaly Detection Alert'}
              </span>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {lang === 'ar' 
                  ? <>صرف غير اعتيادي بقيمة <strong>{warnings[0].amount} ريال</strong> لدى <span dir="ltr" style={{ display: 'inline-block' }}>"{warnings[0].merchant}"</span>.</>
                  : <>Spike of <strong>${warnings[0].amount}</strong> at <span dir="ltr" style={{ display: 'inline-block' }}>"{warnings[0].merchant}"</span>.</>
                }
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                {lang === 'ar'
                  ? 'رصد محرك الذكاء الاصطناعي المحلي (Z-Score) عملية صرف تتجاوز الانحراف المعياري لمتوسط نفقاتك اليومية.'
                  : 'Our local Z-Score engine flagged this transaction as it significantly deviates from your typical spending baseline.'}
              </p>
            </div>
            <button 
              onClick={() => setWarnings([])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '50%',
                marginLeft: isRtl ? '0px' : '8px',
                marginRight: isRtl ? '8px' : '0px'
              }}
              className="hover:bg-surface-variant/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Currency Conversion Logic (Dynamic USD/SAR Converter) */}
        {(() => {
          const isUsd = profile?.currency === 'USD';
          const rate = isUsd ? 3.75 : 1;

          const displayStats = {
            balance: parseFloat((stats.balance / rate).toFixed(2)),
            income: parseFloat((stats.income / rate).toFixed(2)),
            spending: parseFloat((stats.spending / rate).toFixed(2))
          };

          const displayTransactions = transactions.map(t => ({
            ...t,
            amount: parseFloat((t.amount / rate).toFixed(2))
          }));

          const displayLinkedAccounts = linkedAccounts.map(a => ({
            ...a,
            balance: parseFloat((a.balance / rate).toFixed(2))
          }));

          const displaySubscriptions = subscriptions.map(s => ({
            ...s,
            amount: parseFloat((s.amount / rate).toFixed(2))
          }));

          const displaySavingsGoals = savingsGoals.map(g => ({
            ...g,
            current_amount: parseFloat((g.current_amount / rate).toFixed(2)),
            target_amount: parseFloat((g.target_amount / rate).toFixed(2))
          }));

          const displayStocks = stocks.map(s => ({
            ...s,
            purchase_price: parseFloat((s.purchase_price / rate).toFixed(2)),
            current_price: parseFloat((s.current_price / rate).toFixed(2)),
            pnl: parseFloat(((s.current_price - s.purchase_price) * s.quantity / rate).toFixed(2))
          }));

          return (
            /* Tab Router Switcher */
            isLoading && activeTab === 'dashboard' ? (
              <LoadingSkeleton />
            ) : (
              <div className="animate-fade-in">
                {activeTab === 'dashboard' && <Dashboard stats={displayStats} transactions={displayTransactions} stocks={displayStocks} linkedAccounts={displayLinkedAccounts} profile={profile} lang={lang} t={t} onNavigate={handleTabClick} />}
                {activeTab === 'transactions' && <Transactions onUpdate={fetchData} transactions={displayTransactions} profile={profile} lang={lang} t={t} showToast={showToast} />}
                {activeTab === 'subscriptions' && <Subscriptions profile={profile} lang={lang} t={t} />}
                {activeTab === 'savings' && <SavingsGoals stats={displayStats} profile={profile} lang={lang} t={t} />}
                {activeTab === 'local-ai' && <LocalAI lang={lang} t={t} stats={displayStats} transactions={displayTransactions} subscriptions={displaySubscriptions} stocks={displayStocks} savingsGoals={displaySavingsGoals} profile={profile} onUpdate={fetchData} />}
                {activeTab === 'tech-showcase' && <TechShowcase lang={lang} />}
              </div>
            )
          );
        })()}
      </div>

      {/* Mobile Bottom Navigation Bar (Stitch Tab Bar Style) */}
      <nav className="bottom-nav flex justify-around items-center h-[72px] border-t border-outline-variant bg-surface px-margin-mobile">
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'text-primary scale-105 font-bold' : 'text-on-secondary-container opacity-70'}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
        </button>

        <button
          onClick={() => handleTabClick('transactions')}
          className={`bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 text-xs font-semibold transition-all ${activeTab === 'transactions' ? 'text-primary scale-105 font-bold' : 'text-on-secondary-container opacity-70'}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: activeTab === 'transactions' ? "'FILL' 1" : "'FILL' 0" }}>receipt_long</span>
          <span>{isRtl ? 'المعاملات' : 'Transactions'}</span>
        </button>

        <button
          onClick={() => handleTabClick('subscriptions')}
          className={`bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 text-xs font-semibold transition-all ${activeTab === 'subscriptions' ? 'text-primary scale-105 font-bold' : 'text-on-secondary-container opacity-70'}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: activeTab === 'subscriptions' ? "'FILL' 1" : "'FILL' 0" }}>card_membership</span>
          <span>{isRtl ? 'الاشتراكات' : 'Subscriptions'}</span>
        </button>

        <button
          onClick={() => handleTabClick('savings')}
          className={`bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 text-xs font-semibold transition-all ${activeTab === 'savings' ? 'text-primary scale-105 font-bold' : 'text-on-secondary-container opacity-70'}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: activeTab === 'savings' ? "'FILL' 1" : "'FILL' 0" }}>savings</span>
          <span>{isRtl ? 'الادخار' : 'Savings'}</span>
        </button>

        <button
          onClick={() => handleTabClick('local-ai')}
          className={`bottom-nav-item flex flex-col items-center justify-center gap-1 flex-1 text-xs font-semibold transition-all ${activeTab === 'local-ai' ? 'text-primary scale-105 font-bold' : 'text-on-secondary-container opacity-70'}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: activeTab === 'local-ai' ? "'FILL' 1" : "'FILL' 0" }}>analytics</span>
          <span>{isRtl ? 'المحاكي' : 'Simulator'}</span>
        </button>
      </nav>

      {/* Global Floating AI Coach (Floating FAB overlay) - Active on all screens except the dedicated Simulator tab */}
      {activeTab !== 'local-ai' && (
        <LocalAI 
          lang={lang} 
          t={t} 
          stats={stats} 
          transactions={transactions} 
          subscriptions={subscriptions} 
          stocks={stocks} 
          savingsGoals={savingsGoals} 
          onUpdate={fetchData} 
          mode="floating"
        />
      )}

      {/* Preferences & Settings Modal Drawer */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-[380px] overflow-hidden shadow-2xl flex flex-col p-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">settings</span>
                <h3 className="font-bold text-sm text-on-surface">{isRtl ? 'تفضيلات التطبيق والإعدادات' : 'App Preferences & Settings'}</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-variant/20 flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Content Form */}
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-1">
              
              {/* Name */}
              <div className="flex flex-col gap-1.5" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <label className="text-xs font-semibold text-on-surface-variant">{isRtl ? 'اسم المستخدم' : 'Username'}</label>
                <input 
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  placeholder={isRtl ? 'أدخل اسمك هنا' : 'Enter name'}
                />
              </div>

              {/* Profile Avatar Selection */}
              <div className="flex flex-col gap-2" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {isRtl ? 'الصورة الرمزية (الرمز)' : 'Profile Avatar'}
                </label>
                
                {/* Preview current */}
                <div className="flex items-center gap-4 mb-1">
                  {renderAvatarImg(settingsAvatar, "w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md")}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-on-surface-variant">
                      {isRtl ? 'اختر رمزاً جاهزاً أو صورة من جهازك' : 'Choose a pre-built avatar or upload photo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => document.getElementById('avatar-file-input').click()}
                      className="text-left text-xs text-primary font-bold hover:underline"
                      style={{ textAlign: isRtl ? 'right' : 'left' }}
                    >
                      {isRtl ? '📁 اختيار صورة من الاستوديو...' : '📁 Choose photo from gallery...'}
                    </button>
                    <input
                      id="avatar-file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setSettingsAvatar(event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Prebuilt Grid */}
                <div className="flex gap-2.5 flex-wrap justify-between p-2 bg-surface-container-low border border-outline-variant/60 rounded-2xl">
                  {['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7', 'avatar8'].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSettingsAvatar(av)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        settingsAvatar === av ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {renderAvatarImg(av, "w-9 h-9 rounded-full flex items-center justify-center text-md")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div className="flex flex-col gap-1.5" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <label className="text-xs font-semibold text-on-surface-variant">{isRtl ? 'العملة الأساسية' : 'Base Currency'}</label>
                <div className="flex gap-2">
                  {['SAR', 'USD'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSettingsCurrency(c)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${settingsCurrency === c ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline-variant text-on-surface-variant opacity-70'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1.5" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <label className="text-xs font-semibold text-on-surface-variant">{isRtl ? 'لغة التطبيق' : 'App Language'}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setLang('ar'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${lang === 'ar' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline-variant text-on-surface-variant opacity-70'}`}
                  >
                    العربية (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLang('en'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${lang === 'en' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline-variant text-on-surface-variant opacity-70'}`}
                  >
                    English (LTR)
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div className="flex flex-col gap-1.5" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <label className="text-xs font-semibold text-on-surface-variant">{isRtl ? 'مظهر التطبيق' : 'App Theme'}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setTheme('light'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${theme === 'light' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline-variant text-on-surface-variant opacity-70'}`}
                  >
                    {isRtl ? '☀️ فاتح' : '☀️ Light'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTheme('inma'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${theme === 'inma' ? 'border-yellow-600 text-yellow-700' : 'bg-surface border-outline-variant text-on-surface-variant opacity-70'}`}
                    style={theme === 'inma'
                      ? { background: 'linear-gradient(135deg, #0A1628 55%, #1B2B4B)', color: '#C07830', borderColor: '#C07830' }
                      : {}}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {/* Three-dot brand indicator: Navy · Copper · Lavender */}
                      <span style={{ display: 'inline-flex', gap: '2px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1B2B4B', border: '1px solid #3A5080', display: 'inline-block' }} />
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C07830', boxShadow: theme === 'inma' ? '0 0 5px rgba(192,120,48,0.7)' : 'none', display: 'inline-block' }} />
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B6BB5', display: 'inline-block' }} />
                      </span>
                      {isRtl ? 'الإنماء' : 'Alinma'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTheme('dark'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${theme === 'dark' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline-variant text-on-surface-variant opacity-70'}`}
                  >
                    {isRtl ? '🌙 داكن' : '🌙 Dark'}
                  </button>
                </div>
              </div>

              <hr className="border-outline-variant/60 my-1" />

              {/* Security & System Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setIsLocked(true); setIsSettingsOpen(false); hasFetched.current = false; }}
                  className="w-full py-2 bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold rounded-xl hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  {isRtl ? 'قفل الجلسة (قفل التطبيق)' : 'Lock Session (Lock App)'}
                </button>

                <button
                  type="button"
                  onClick={handleResetPIN}
                  className="w-full py-2 bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold rounded-xl hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  {isRtl ? 'تغيير رمز الدخول (PIN)' : 'Change App PIN'}
                </button>

                <button
                  type="button"
                  onClick={handleWipeData}
                  className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  {isRtl ? 'حذف كافة البيانات (تهيئة كاملة)' : 'Wipe All Data (Clean Slate)'}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowAdmin(true); setIsSettingsOpen(false); }}
                  className="w-full py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-xl hover:bg-primary/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                  {isRtl ? 'لوحة تحليلات المشرف' : 'Admin Analytics Panel'}
                </button>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 mt-6 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-semibold hover:bg-surface-variant/20 transition-all active:scale-95 duration-100 cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:brightness-95 transition-all active:scale-95 duration-100 shadow-sm cursor-pointer"
              >
                {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let currentLang = 'ar';
      try {
        currentLang = localStorage.getItem('tharaa-lang') || 'ar';
      } catch (e) {
        // Safe fallback
      }
      const isRtl = currentLang === 'ar';
      
      const title = isRtl ? 'عذراً، حدث خطأ غير متوقع' : 'Oops, something went wrong';
      const desc = isRtl 
        ? 'واجه التطبيق خطأً غير متوقع في النظام. يرجى محاولة إعادة تحميل الصفحة أو التحقق لاحقاً.' 
        : 'The application encountered an unexpected system error. Please try reloading or check back later.';
      const reloadBtn = isRtl ? 'إعادة تحميل التطبيق' : 'Reload Application';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          padding: '24px',
          background: 'linear-gradient(135deg, #F4EFEA 0%, #EADDC9 100%)',
          color: 'var(--text-primary, #4A2E1B)',
          textAlign: 'center',
          fontFamily: 'var(--font-sans), sans-serif',
          direction: isRtl ? 'rtl' : 'ltr'
        }} className="inma-theme">
          <div className="glass-panel" style={{
            maxWidth: '400px',
            width: '100%',
            padding: '32px',
            borderRadius: '24px',
            border: '1px solid var(--border-glass, rgba(74, 46, 27, 0.08))',
            background: 'var(--bg-glass, rgba(244, 239, 234, 0.7))',
            boxShadow: 'var(--shadow-lg, 0 16px 40px rgba(74, 46, 27, 0.15))',
            backdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 59, 111, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--accent-pink, #ff3b6f)',
              color: 'var(--accent-pink, #ff3b6f)',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #4A2E1B)', margin: 0 }}>
              {title}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #705B4F)', lineHeight: 1.5, margin: 0 }}>
              {desc}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: 'var(--accent-cyan, #C5A059)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: '8px',
                width: '100%'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
            >
              {reloadBtn}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;

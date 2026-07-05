import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, Lock, KeyRound, Settings } from 'lucide-react';

// ── Pure JS hash (simple but sufficient for offline PIN hashing) ──────────
function hashPin(pin) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < pin.length; i++) {
    hash ^= pin.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  for (let round = 0; round < 512; round++) {
    hash ^= (hash >>> 16);
    hash = Math.imul(hash, 0x45d9f3b);
    hash ^= (hash >>> 16);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

const PIN_HASH_KEY   = 'tharaa_pin_hash';
const MAX_ATTEMPTS   = 3;
const LOCKOUT_SECONDS = 30;

const memoryStore = {};
const safeGetItem = (key) => {
  try { return localStorage.getItem(key); }
  catch (e) { return memoryStore[key] || null; }
};
const safeSetItem = (key, value) => {
  try { localStorage.setItem(key, value); }
  catch (e) { memoryStore[key] = value; }
};

// ── Inject keyframes once ─────────────────────────────────────────────────
const STYLE_ID = 'lockscreen-keyframes';
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ls-fadeUp {
      from { opacity: 0; transform: translateY(32px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    @keyframes ls-coinPulse {
      0%,100% { box-shadow: 0 0 0px 0px rgba(0,163,146,0.25), 0 8px 32px rgba(0,0,0,0.4); transform: translateY(0px); }
      50%     { box-shadow: 0 0 40px 8px rgba(0,163,146,0.35), 0 8px 32px rgba(0,0,0,0.4); transform: translateY(-5px); }
    }
    @keyframes ls-coinPulseCopper {
      0%,100% { box-shadow: 0 0 0px 0px rgba(192,120,48,0.30), 0 8px 32px rgba(0,0,0,0.4); transform: translateY(0px); }
      50%     { box-shadow: 0 0 40px 8px rgba(192,120,48,0.45), 0 8px 32px rgba(0,0,0,0.4); transform: translateY(-5px); }
    }
    @keyframes ls-shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-10px); }
      40%     { transform: translateX(10px); }
      60%     { transform: translateX(-7px); }
      80%     { transform: translateX(7px); }
    }
    @keyframes ls-dotPop {
      0%   { transform: scale(0); opacity: 0; }
      60%  { transform: scale(1.4); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes ls-orb1 {
      0%,100% { transform: translate(0px, 0px) scale(1); opacity: 0.5; }
      50%     { transform: translate(30px, -20px) scale(1.15); opacity: 0.8; }
    }
    @keyframes ls-orb2 {
      0%,100% { transform: translate(0px, 0px) scale(1); opacity: 0.4; }
      50%     { transform: translate(-20px, 25px) scale(1.1); opacity: 0.65; }
    }
    @keyframes ls-orb3 {
      0%,100% { transform: translate(0px, 0px) scale(1.05); opacity: 0.3; }
      50%     { transform: translate(15px, -30px) scale(0.9); opacity: 0.5; }
    }
    @keyframes ls-gradientShift {
      0%,100% { background-position: 0% 50%; }
      50%     { background-position: 100% 50%; }
    }
  `;
  document.head.appendChild(style);
}

export default function LockScreen({ onUnlock, lang = 'ar' }) {
  const isRtl = lang === 'ar';

  // Detect the active theme for colour adaptation
  const activeTheme = (() => {
    try { return localStorage.getItem('tharaa-theme') || 'dark'; } catch { return 'dark'; }
  })();
  const isInma  = activeTheme === 'inma';
  const isLight = activeTheme === 'light';

  // Brand colours based on theme
  const brand = isInma
    ? { primary: '#C07830', primaryAlpha: 'rgba(192,120,48,', bg1: '#0A1628', bg2: '#111E35', bg3: '#1B2B4B', orb1: 'rgba(192,120,48,0.18)', orb2: 'rgba(139,107,181,0.14)', orb3: 'rgba(58,80,128,0.10)', grid: 'rgba(192,120,48,0.03)', coinAnim: 'spin3d' }
    : isLight
    ? { primary: '#00A392', primaryAlpha: 'rgba(0,163,146,', bg1: '#EFF6F5', bg2: '#FFFFFF', bg3: '#E0F2EF', orb1: 'rgba(0,163,146,0.10)', orb2: 'rgba(100,116,139,0.08)', orb3: 'rgba(0,163,146,0.06)', grid: 'rgba(0,163,146,0.04)', coinAnim: 'spin3d' }
    : { primary: '#00A392', primaryAlpha: 'rgba(0,163,146,', bg1: '#090f1d', bg2: '#0F172A', bg3: '#0d1a2d', orb1: 'rgba(0,163,146,0.18)', orb2: 'rgba(255,59,111,0.10)', orb3: 'rgba(0,163,146,0.08)', grid: 'rgba(0,163,146,0.03)', coinAnim: 'spin3d' };

  const textCol    = isLight ? '#0F172A' : '#EEF2FF';
  const textMuted  = isLight ? '#3F465C' : '#9BAECF';
  const textDim    = isLight ? '#68788f' : '#5D7099';
  const cardBg     = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.04)';
  const cardBorder = isLight ? 'rgba(0,163,146,0.20)'   : `${brand.primaryAlpha}0.18)`;

  const hasStoredPin = () => !!safeGetItem(PIN_HASH_KEY);
  const [flow, setFlow]             = useState(() => hasStoredPin() ? 'unlock' : 'create');
  const [pin, setPin]               = useState(['', '', '', '']);
  const [createdPin, setCreatedPin] = useState('');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [shake, setShake]           = useState(false);
  const [attempts, setAttempts]     = useState(0);
  const [lockout, setLockout]       = useState(0);
  const [mounted, setMounted]       = useState(false);
  const [isExiting, setIsExiting]   = useState(false);
  const [showIpModal, setShowIpModal] = useState(false);
  const [serverIp, setServerIp]     = useState(() => safeGetItem('tharaa_server_ip') || '10.0.2.2');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    injectKeyframes();
    const t = setTimeout(() => setMounted(true), 60);
    const storedAttempts = parseInt(safeGetItem('tharaa_failed_attempts') || '0', 10);
    setAttempts(storedAttempts);
    const lockoutExpires = parseInt(safeGetItem('tharaa_lockout_expires') || '0', 10);
    const now = Date.now();
    if (lockoutExpires > now) {
      const rem = Math.ceil((lockoutExpires - now) / 1000);
      setLockout(rem);
      setError(isRtl ? `تم تجاوز المحاولات. انتظر ${rem} ثانية` : `Too many attempts. Wait ${rem}s`);
    }
    return () => clearTimeout(t);
  }, [isRtl]);

  useEffect(() => {
    if (lockout === 0) setTimeout(() => inputRefs[0].current?.focus(), 130);
  }, [flow, lockout]);

  useEffect(() => {
    if (lockout <= 0) return;
    const interval = setInterval(() => {
      setLockout(prev => {
        if (prev <= 1) { safeSetItem('tharaa_lockout_expires', '0'); setError(''); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout]);

  const resetPin = useCallback(() => {
    setPin(['', '', '', '']);
    setTimeout(() => inputRefs[0].current?.focus(), 60);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handlePinComplete = useCallback((fullPin) => {
    const joined = fullPin.join('');
    if (joined.length !== 4) return;

    if (flow === 'create') {
      setCreatedPin(joined);
      setPin(['', '', '', '']);
      setFlow('confirm');
      setError('');
      setSuccess(isRtl ? 'تم! أعد إدخال الرمز للتأكيد' : 'Now confirm your PIN');
      return;
    }
    if (flow === 'confirm') {
      if (joined === createdPin) {
        safeSetItem(PIN_HASH_KEY, hashPin(joined));
        safeSetItem('tharaa_failed_attempts', '0');
        safeSetItem('tharaa_lockout_expires', '0');
        setAttempts(0);
        setSuccess(isRtl ? '✓ تم إنشاء الرمز' : '✓ PIN created');
        setIsExiting(true);
        setTimeout(() => onUnlock(), 550);
      } else {
        triggerShake();
        setError(isRtl ? 'الرمز غير متطابق. حاول مرة أخرى' : "PINs don't match. Try again");
        setFlow('create');
        setCreatedPin('');
        resetPin();
      }
      return;
    }
    // unlock
    const stored = safeGetItem(PIN_HASH_KEY);
    if (safeCompare(hashPin(joined), stored)) {
      setSuccess(isRtl ? '✓ تم فتح القفل' : '✓ Unlocked');
      setError('');
      safeSetItem('tharaa_failed_attempts', '0');
      safeSetItem('tharaa_lockout_expires', '0');
      setAttempts(0);
      setIsExiting(true);
      setTimeout(() => onUnlock(), 550);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      safeSetItem('tharaa_failed_attempts', newAttempts.toString());
      triggerShake();
      if (newAttempts >= 3) {
        let seconds = newAttempts >= 9 ? 3600 : newAttempts >= 6 ? 300 : 30;
        const expireTime = Date.now() + seconds * 1000;
        safeSetItem('tharaa_lockout_expires', expireTime.toString());
        setLockout(seconds);
        setError(isRtl
          ? `تم تجاوز المحاولات. انتظر ${seconds >= 3600 ? 'ساعة' : seconds >= 300 ? '٥ دقائق' : '٣٠ ثانية'}`
          : `Too many attempts. Wait ${seconds >= 3600 ? '1h' : seconds >= 300 ? '5m' : '30s'}`);
      } else {
        setError(isRtl ? `رمز خاطئ — ${3 - newAttempts} محاولة متبقية` : `Wrong PIN — ${3 - newAttempts} left`);
      }
      resetPin();
    }
  }, [flow, createdPin, attempts, isRtl, onUnlock, resetPin, triggerShake]);

  const handleChange = (index, value) => {
    if (lockout > 0) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    setError('');
    setSuccess('');
    if (digit && index < 3) inputRefs[index + 1].current?.focus();
    if (digit && index === 3 && next.every(d => d !== '')) setTimeout(() => handlePinComplete(next), 160);
  };

  const handleKeyDown = (index, e) => {
    if (lockout > 0) return;
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const next = [...pin];
      next[index - 1] = '';
      setPin(next);
      inputRefs[index - 1].current?.focus();
    }
  };

  const headingText = {
    create:  isRtl ? 'أنشئ رمز الدخول' : 'Create Your PIN',
    confirm: isRtl ? 'أكّد رمز الدخول' : 'Confirm Your PIN',
    unlock:  isRtl ? 'أدخل رمز الدخول' : 'Enter Your PIN',
  };
  const subText = {
    create:  isRtl ? 'اختر رمزاً سرياً من ٤ أرقام' : 'Choose a 4-digit secret code',
    confirm: isRtl ? 'أعد إدخال الرمز الذي اخترته' : 'Re-enter the PIN you just set',
    unlock:  isRtl ? 'محمي بتشفير محلي كامل' : 'Protected with full local encryption',
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(145deg, ${brand.bg1} 0%, ${brand.bg2} 55%, ${brand.bg3} 100%)`,
        overflow: 'hidden',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.08)' : 'scale(1)',
        transition: 'opacity 0.55s ease, transform 0.55s ease',
      }}
    >
      {/* ── Animated background orbs ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '55%', paddingBottom: '55%', borderRadius: '50%', background: `radial-gradient(circle, ${brand.orb1} 0%, transparent 70%)`, animation: 'ls-orb1 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '-8%', width: '50%', paddingBottom: '50%', borderRadius: '50%', background: `radial-gradient(circle, ${brand.orb2} 0%, transparent 70%)`, animation: 'ls-orb2 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '10%', width: '30%', paddingBottom: '30%', borderRadius: '50%', background: `radial-gradient(circle, ${brand.orb3} 0%, transparent 70%)`, animation: 'ls-orb3 13s ease-in-out infinite' }} />
        {/* Subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${brand.grid} 1px, transparent 1px), linear-gradient(90deg, ${brand.grid} 1px, transparent 1px)`, backgroundSize: '52px 52px' }} />
      </div>

      {/* ── Server settings gear ── */}
      <button
        onClick={() => setShowIpModal(true)}
        style={{
          position: 'absolute',
          top: '20px',
          [isRtl ? 'left' : 'right']: '20px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '50%', width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: textMuted, cursor: 'pointer', zIndex: 10,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        title={isRtl ? 'إعدادات الخادم' : 'Server Settings'}
      >
        <Settings size={16} />
      </button>

      {/* ── Main card ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '24px', padding: '36px 28px',
        width: '100%', maxWidth: '340px',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '28px',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: `0 24px 60px rgba(0,0,0,0.35), 0 0 0 1px ${cardBorder}`,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.94)',
        transition: 'all 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* ── Coin / Logo ── */}
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%',
          border: '3px solid #C07830',
          boxShadow: '0 0 20px rgba(192, 120, 48, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: `${brand.coinAnim} 4s linear infinite`,
          position: 'relative',
          transformStyle: 'preserve-3d',
          background: 'url(/penny_logo.jpg) no-repeat',
          backgroundSize: '150% 150%',
          backgroundPosition: 'center 22%',
        }} />

        {/* ── App name ── */}
        <div style={{ textAlign: 'center', marginTop: '-8px' }}>
          <div style={{
            fontSize: '34px', fontWeight: 900, lineHeight: 1,
            letterSpacing: '-0.03em',
            fontFamily: 'Outfit, sans-serif',
            background: isInma
              ? 'linear-gradient(90deg, #EEF2FF 30%, #C07830 100%)'
              : `linear-gradient(90deg, ${textCol} 30%, ${brand.primary} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {isRtl ? 'بيني' : 'Penny'}
          </div>
          <div style={{
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: brand.primary, marginTop: '5px', opacity: 0.85,
          }}>
            {isRtl ? 'مساعدك المالي الذكي' : 'Your Smart Finance Assistant'}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ width: '100%', height: '1px', background: `linear-gradient(90deg, transparent, ${cardBorder}, transparent)` }} />

        {/* ── Flow heading ── */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '15px', fontWeight: 700, color: textCol }}>
            {flow === 'unlock' ? <Lock size={15} style={{ color: brand.primary }} /> : <KeyRound size={15} style={{ color: brand.primary }} />}
            {headingText[flow]}
          </div>
          <div style={{ fontSize: '12px', color: textMuted, marginTop: '4px' }}>{subText[flow]}</div>
        </div>

        {/* ── PIN inputs or lockout ── */}
        {lockout > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 22px', borderRadius: '14px',
              background: 'rgba(255,59,111,0.08)', border: '1px solid rgba(255,59,111,0.22)',
              fontSize: '15px', fontWeight: 700, color: '#ff3b6f',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <Lock size={16} />
              <span>{lockout}{isRtl ? 'ث' : 's'}</span>
            </div>
            <div style={{ fontSize: '11px', color: textDim, textAlign: 'center' }}>
              {isRtl ? 'حاول مرة أخرى بعد انتهاء المؤقت' : 'Try again after the timer ends'}
            </div>
          </div>
        ) : (
          <>
            {/* PIN boxes */}
            <div style={{ display: 'flex', gap: '12px', direction: 'ltr', animation: shake ? 'ls-shake 0.45s ease' : 'none' }}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  autoComplete="off"
                  style={{
                    width: '56px', height: '62px', borderRadius: '16px',
                    border: `2px solid ${digit ? brand.primary : isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
                    background: digit
                      ? `${brand.primaryAlpha}0.10)`
                      : isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.04)',
                    color: textCol,
                    fontSize: '26px', fontWeight: 800,
                    textAlign: 'center', outline: 'none',
                    caretColor: brand.primary,
                    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: digit ? `0 0 18px ${brand.primaryAlpha}0.20)` : 'none',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = brand.primary;
                    e.target.style.boxShadow = `0 0 22px ${brand.primaryAlpha}0.28)`;
                  }}
                  onBlur={e => {
                    if (!pin[i]) {
                      e.target.style.borderColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
              ))}
            </div>

            {/* Dot indicators */}
            <div style={{ display: 'flex', gap: '10px', direction: 'ltr', marginTop: '-10px' }}>
              {pin.map((digit, i) => (
                <div key={i} style={{
                  width: '9px', height: '9px', borderRadius: '50%',
                  backgroundColor: digit ? brand.primary : isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.14)',
                  transition: 'all 0.22s ease',
                  animation: digit ? 'ls-dotPop 0.25s ease' : 'none',
                  boxShadow: digit ? `0 0 8px ${brand.primaryAlpha}0.55)` : 'none',
                }} />
              ))}
            </div>
          </>
        )}

        {/* ── Messages ── */}
        <div style={{ minHeight: '18px', textAlign: 'center' }}>
          {error && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ff3b6f', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {error}
            </div>
          )}
          {success && !error && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: brand.primary }}>{success}</div>
          )}
        </div>

        {/* ── Security footer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', borderRadius: '999px',
            background: `${brand.primaryAlpha}0.07)`,
            border: `1px solid ${brand.primaryAlpha}0.18)`,
            fontSize: '10px', fontWeight: 600, color: textDim,
          }}>
            <ShieldCheck size={12} color={brand.primary} />
            {isRtl ? 'بيانات مشفرة ومحمية محلياً' : '100% Offline · Encrypted Local Data'}
          </div>
          <div style={{ fontSize: '9px', color: textDim, opacity: 0.5, textAlign: 'center' }}>
            {isRtl ? 'لا يتم إرسال أي بيانات خارج جهازك' : 'Your data never leaves this device'}
          </div>
        </div>
      </div>

      {/* ── IP Config Modal ── */}
      {showIpModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: isLight ? '#FFFFFF' : '#111E35',
            border: `1px solid ${cardBorder}`, borderRadius: '20px',
            padding: '24px', width: '100%', maxWidth: '320px',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: textCol }}>
              {isRtl ? 'الاتصال بالخادم المحلي' : 'Local Server Connection'}
            </h3>
            <p style={{ fontSize: '11px', color: textMuted, lineHeight: 1.5 }}>
              {isRtl
                ? 'أدخل عنوان IP لجهاز الكمبيوتر الذي يقوم بتشغيل خادم Penny الخلفي.'
                : 'Enter the IP address of the PC running the Penny backend server.'}
            </p>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontFamily: 'monospace', textAlign: 'center' }}
              value={serverIp}
              onChange={e => setServerIp(e.target.value)}
              placeholder="e.g. 192.168.1.100"
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { safeSetItem('tharaa_server_ip', serverIp); setShowIpModal(false); }} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', fontSize: '12px' }}>
                {isRtl ? 'حفظ وإعادة اتصال' : 'Save & Connect'}
              </button>
              <button onClick={() => setShowIpModal(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { User, DollarSign, Sparkles, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function RegistrationScreen({ onRegisterComplete, lang = 'ar', onChangeLang }) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [avatar, setAvatar] = useState('avatar1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRtl = lang === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isRtl ? 'الرجاء إدخال الاسم' : 'Please enter your name');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), currency, avatar })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onRegisterComplete({ name: name.trim(), currency, avatar });
      } else {
        setError(data.error || (isRtl ? 'حدث خطأ أثناء التسجيل' : 'Registration failed'));
      }
    } catch (err) {
      console.error(err);
      setError(isRtl ? 'فشل الاتصال بالخادم' : 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const [isFocused, setIsFocused] = useState(false);
  const [hoveredCurr, setHoveredCurr] = useState(null);
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  // Detect active theme
  const activeTheme = (() => {
    try { return localStorage.getItem('tharaa-theme') || 'dark'; } catch { return 'dark'; }
  })();
  const isInma  = activeTheme === 'inma';
  const isLight = activeTheme === 'light';

  // Brand colours based on theme
  const brand = isInma
    ? { 
        primary: '#C07830', 
        primaryAlpha: 'rgba(192,120,48,', 
        bg1: '#0A1628', bg2: '#111E35', bg3: '#1B2B4B', 
        orb1: 'rgba(192,120,48,0.22)', orb2: 'rgba(139,107,181,0.16)', orb3: 'rgba(58,80,128,0.06)', 
        grid: 'rgba(192,120,48,0.03)', 
        inputBg: 'rgba(10, 22, 40, 0.65)',
        textGrad: 'linear-gradient(135deg, #EEF2FF 40%, #C07830 100%)',
        accentGradient: 'linear-gradient(135deg, #d38f45, #C07830)'
      }
    : isLight
    ? { 
        primary: '#00A392', 
        primaryAlpha: 'rgba(0,163,146,', 
        bg1: '#EFF6F5', bg2: '#FFFFFF', bg3: '#E0F2EF', 
        orb1: 'rgba(0,163,146,0.12)', orb2: 'rgba(100,116,139,0.08)', orb3: 'rgba(0,163,146,0.06)', 
        grid: 'rgba(0,163,146,0.04)', 
        inputBg: '#FFFFFF',
        textGrad: 'linear-gradient(135deg, #0F172A 40%, #00A392 100%)',
        accentGradient: 'linear-gradient(135deg, #00bfa5, #00A392)'
      }
    : { 
        primary: '#00A392', 
        primaryAlpha: 'rgba(0,163,146,', 
        bg1: '#090f1d', bg2: '#0F172A', bg3: '#0d1a2d', 
        orb1: 'rgba(0,163,146,0.22)', orb2: 'rgba(255,59,111,0.12)', orb3: 'rgba(0,163,146,0.06)', 
        grid: 'rgba(0,163,146,0.03)', 
        inputBg: 'rgba(9, 15, 29, 0.65)',
        textGrad: 'linear-gradient(135deg, #FFFFFF 40%, #00A392 100%)',
        accentGradient: 'linear-gradient(135deg, #00bfa5, #00A392)'
      };

  const textCol    = isLight ? '#0F172A' : '#EEF2FF';
  const textMuted  = isLight ? '#3F465C' : '#9BAECF';
  const cardBg     = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(15, 23, 42, 0.45)';
  const cardBorder = isLight ? 'rgba(0,163,146,0.20)'   : `${brand.primaryAlpha}0.18)`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(145deg, ${brand.bg1} 0%, ${brand.bg2} 55%, ${brand.bg3} 100%)`,
      overflow: 'hidden',
      fontFamily: 'Outfit, sans-serif'
    }} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Premium background layout with large glowing blurred orbs and cyber-grid lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', top: '-15%', left: '-10%', width: '60%', paddingBottom: '60%', 
          borderRadius: '50%', background: `radial-gradient(circle, ${brand.orb1} 0%, transparent 65%)`,
          filter: 'blur(40px)',
          animation: 'pulse-gentle 6s ease-in-out infinite'
        }} />
        <div style={{ 
          position: 'absolute', bottom: '-10%', right: '-10%', width: '55%', paddingBottom: '55%', 
          borderRadius: '50%', background: `radial-gradient(circle, ${brand.orb2} 0%, transparent 65%)`,
          filter: 'blur(50px)',
          animation: 'pulse-gentle 8s ease-in-out infinite'
        }} />
        <div style={{ 
          position: 'absolute', top: '25%', left: '30%', width: '40%', paddingBottom: '40%', 
          borderRadius: '50%', background: `radial-gradient(circle, ${brand.orb3} 0%, transparent 60%)`,
          filter: 'blur(30px)'
        }} />
        {/* Ambient Grid overlay */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          backgroundImage: `linear-gradient(${brand.grid} 1px, transparent 1px), linear-gradient(90deg, ${brand.grid} 1px, transparent 1px)`, 
          backgroundSize: '40px 40px' 
        }} />
      </div>

      {/* Main glassmorphic login card container */}
      <div className="glass-panel" style={{
        position: 'relative',
        zIndex: 2,
        padding: '36px 28px',
        width: '90%',
        maxWidth: '380px',
        borderRadius: '32px',
        border: `1.5px solid ${cardBorder}`,
        background: cardBg,
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        boxShadow: isLight 
          ? '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)' 
          : '0 30px 60px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        transform: 'translateY(-10px)',
        animation: 'introName 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        {/* Language selector button */}
        {onChangeLang && (
          <button
            type="button"
            onClick={() => onChangeLang(lang === 'ar' ? 'en' : 'ar')}
            style={{
              position: 'absolute',
              top: '16px',
              [isRtl ? 'left' : 'right']: '16px',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '6px 12px',
              color: textMuted,
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = textCol;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = textMuted;
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>translate</span>
            <span>{isRtl ? 'English' : 'العربية'}</span>
          </button>
        )}

        {/* Logo, title and description text */}
        <div style={{ textAlign: 'center' }}>
          {/* Custom logo Penny coin spinner */}
          <div style={{
            margin: '0 auto 16px auto', width: '84px', height: '84px', borderRadius: '50%',
            border: `3px solid ${isInma ? '#C07830' : '#00A392'}`,
            boxShadow: `0 0 25px ${brand.primary}60, 0 8px 30px rgba(0,0,0,0.4)`,
            animation: 'spin3d 4s linear infinite',
            transformStyle: 'preserve-3d',
            background: 'url(/penny_logo.jpg) no-repeat',
            backgroundSize: '150% 150%',
            backgroundPosition: 'center 22%',
          }} />
          
          <h2 style={{
            fontSize: '28px', fontWeight: 950, lineHeight: 1.1, letterSpacing: '-0.02em',
            fontFamily: 'Outfit, sans-serif',
            background: brand.textGrad,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0
          }}>
            {isRtl ? 'ابدأ مع بيني' : 'Start with Penny'}
          </h2>
          <p style={{ fontSize: '13px', color: textMuted, marginTop: '8px', opacity: 0.85, lineHeight: '1.4' }}>
            {isRtl ? 'أنشئ ملفك الشخصي لتخصيص مساعدك المالي' : 'Create your profile to personalize your financial assistant'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Full Name Input block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isRtl ? 'الاسم بالكامل' : 'Full Name'}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isRtl ? 'right' : 'left']: '14px',
                color: isFocused ? brand.primary : textMuted,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s',
              }}>
                <User size={16} />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRtl ? 'ادخل اسمك هنا...' : 'Enter your name...'}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 42px',
                  paddingLeft: isRtl ? '14px' : '42px',
                  paddingRight: isRtl ? '42px' : '14px',
                  borderRadius: '16px',
                  border: isFocused ? `1.5px solid ${brand.primary}` : `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
                  background: brand.inputBg,
                  color: textCol,
                  fontSize: '14px',
                  outline: 'none',
                  boxShadow: isFocused ? `0 0 16px ${brand.primary}35` : 'none',
                  transition: 'all 0.25s ease-in-out',
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Profile Avatar Selection Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isRtl ? 'الصورة الرمزية (الرمز)' : 'Profile Avatar'}
            </label>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              {/* Preview */}
              {(() => {
                if (avatar.startsWith('data:image')) {
                  return <img src={avatar} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${brand.primary}` }} />;
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
                const curr = avatars[avatar] || avatars.avatar1;
                return (
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: curr.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', border: `2px solid ${brand.primary}`
                  }}>
                    {curr.emoji}
                  </div>
                );
              })()}
              
              {/* Upload triggers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => document.getElementById('reg-avatar-file-input').click()}
                  style={{
                    background: 'none', border: 'none', color: brand.primary,
                    fontSize: '11px', fontWeight: 800, cursor: 'pointer', padding: 0,
                    textAlign: isRtl ? 'right' : 'left', textDecoration: 'underline'
                  }}
                >
                  {isRtl ? '📁 تحميل صورة من الاستوديو...' : '📁 Upload photo from gallery...'}
                </button>
                <input
                  id="reg-avatar-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setAvatar(event.target.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

             {/* Pre-built selection grid */}
             <div style={{
               display: 'flex', gap: '8px', padding: '6px',
               borderRadius: '16px', background: brand.inputBg,
               border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
               justifyContent: 'space-between', flexWrap: 'wrap'
             }}>
               {['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7', 'avatar8'].map((av) => {
                 const isSelected = avatar === av;
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
                 const item = avatars[av];
                 return (
                   <button
                     key={av}
                     type="button"
                     onClick={() => setAvatar(av)}
                     style={{
                       width: '32px', height: '32px', borderRadius: '50%',
                       background: item.bg, border: isSelected ? `2.5px solid ${brand.primary}` : 'none',
                       cursor: 'pointer', transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                       boxShadow: isSelected ? `0 0 10px ${brand.primary}` : 'none',
                       fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                       padding: 0, transition: 'all 0.15s'
                     }}
                   >
                     {item.emoji}
                   </button>
                 );
               })}
             </div>
          </div>

          {/* Currency Selection segmented control block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isRtl ? 'العملة الافتراضية' : 'Default Currency'}
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '2px', 
              padding: '2px',
              borderRadius: '16px',
              background: brand.inputBg,
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`
            }}>
              {['SAR', 'USD'].map((curr) => {
                const isActive = currency === curr;
                const isHovered = hoveredCurr === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    onMouseEnter={() => setHoveredCurr(curr)}
                    onMouseLeave={() => setHoveredCurr(null)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '14px',
                      border: 'none',
                      background: isActive 
                        ? brand.accentGradient 
                        : isHovered 
                          ? 'rgba(255, 255, 255, 0.03)' 
                          : 'transparent',
                      color: isActive ? '#FFFFFF' : textMuted,
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: isActive ? `0 4px 15px ${brand.primary}50` : 'none',
                      transition: 'all 0.2s ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    disabled={loading}
                  >
                    <DollarSign size={14} style={{ opacity: isActive ? 1 : 0.6 }} />
                    {curr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form error text */}
          {error && (
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--accent-pink)',
              textAlign: 'center',
              background: 'rgba(255, 59, 111, 0.1)',
              border: '1px solid rgba(255, 59, 111, 0.2)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              {error}
            </div>
          )}

          {/* Create Account Submission button */}
          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setIsSubmitHovered(true)}
            onMouseLeave={() => setIsSubmitHovered(false)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: brand.accentGradient,
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '15px',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '0.5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitHovered 
                ? `0 8px 24px ${brand.primary}65, inset 0 1px 0 rgba(255,255,255,0.2)` 
                : `0 4px 16px ${brand.primary}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
              transform: loading ? 'none' : isSubmitHovered ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s ease-in-out',
            }}
            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
          >
            {loading ? (isRtl ? 'جاري تهيئة بيني...' : 'Initializing Penny...') : (isRtl ? 'إنشاء حساب جديد' : 'Create Account')}
          </button>
        </form>

        {/* Footer offline database shield badge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: `${brand.primary}10`,
            border: `1px solid ${brand.primary}30`,
            fontSize: '11px',
            fontWeight: 800,
            color: brand.primary,
          }}>
            <ShieldCheck size={13} color={brand.primary} />
            <span>{isRtl ? 'تشفير كامل للبيانات محلياً 100%' : '100% Local Encrypted Database'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

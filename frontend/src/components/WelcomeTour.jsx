import React, { useState, useEffect } from 'react';

const TOUR_STEPS = [
  {
    id: 'wealth',
    titleEn: 'Your Financial Pulse',
    titleAr: 'نبضة ثروتك',
    descEn: 'This is your total net worth, updated in real-time whenever you add a transaction.',
    descAr: 'هذا إجمالي ثروتك يتحدث فورياً عند إضافة أي معاملة.',
    icon: '💰'
  },
  {
    id: 'ai',
    titleEn: 'Meet Penny AI',
    titleAr: 'تعرف على بيني الذكي',
    descEn: 'Ask Penny anything about your finances. Try “How much did I spend on food?”',
    descAr: 'اسأل بيني عن أي شيء مالي. جرب: “كم صرفت على الطعام؟”',
    icon: '🤖'
  },
  {
    id: 'transactions',
    titleEn: 'Log Every Riyal',
    titleAr: 'سجّل كل ريال',
    descEn: 'Add income and expenses here. Penny AI will auto-categorize everything.',
    descAr: 'أضف الدخل والمصاريف. ستصنفها بيني تلقائياً.',
    icon: '📊'
  },
  {
    id: 'heatmap',
    titleEn: 'Tadawul Heat Map',
    titleAr: 'خريطة تداول',
    descEn: 'Watch Saudi stocks in real-time and get AI investment picks.',
    descAr: 'تابع الأسهم السعودية واحصل على توصيات استثمارية.',
    icon: '📈'
  },
  {
    id: 'complete',
    titleEn: "You're Ready!",
    titleAr: 'أنت جاهز!',
    descEn: "Penny is now fully set up for you. Start by adding your first transaction.",
    descAr: 'تم إعداد بيني لك. ابدأ بإضافة أول معاملة.',
    icon: '🎉'
  }
];

export default function WelcomeTour({ lang, onComplete }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const isRtl = lang === 'ar';
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) { handleDone(); return; }
    setExiting(true);
    setTimeout(() => { setStep(s => s + 1); setExiting(false); }, 300);
  };

  const handleDone = () => {
    localStorage.setItem('penny_tour_done', '1');
    onComplete();
  };

  useEffect(() => {
    const id = 'tour-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes tour-slideIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
      @keyframes tour-slideOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-20px); } }
      @keyframes tour-bounce { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
      @keyframes tour-confetti { 0% { transform:translateY(0) rotate(0deg); opacity:1; } 100% { transform:translateY(-80px) rotate(720deg); opacity:0; } }
    `;
    document.head.appendChild(style);
  }, []);

  const confettiColors = ['#C07830','#00A392','#8B6BB5','#22c55e','#f59e0b','#ef4444'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      padding: '24px',
    }}>
      {/* Skip button */}
      <button
        onClick={handleDone}
        style={{
          position: 'absolute', top: '20px',
          [isRtl ? 'left' : 'right']: '20px',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px', padding: '6px 16px', color: '#9BAECF',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        }}
      >{isRtl ? 'تخطي' : 'Skip'}</button>

      {/* Card */}
      <div style={{
        background: 'linear-gradient(145deg, #111E35, #1B2B4B)',
        border: '1px solid rgba(192,120,48,0.20)',
        borderRadius: '28px', padding: '40px 32px',
        width: '100%', maxWidth: '360px', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: exiting ? 'tour-slideOut 0.3s ease forwards' : 'tour-slideIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Confetti on last step */}
        {isLast && [...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${20 + Math.random() * 40}%`,
            left: `${10 + (i / 12) * 80}%`,
            width: '8px', height: '8px', borderRadius: '2px',
            background: confettiColors[i % confettiColors.length],
            animation: `tour-confetti ${1 + Math.random()}s ease forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }} />
        ))}

        {/* Step icon */}
        <div style={{
          fontSize: '56px', marginBottom: '20px',
          animation: 'tour-bounce 2s ease-in-out infinite',
          display: 'inline-block',
        }}>{current.icon}</div>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
          {TOUR_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '20px' : '6px', height: '6px',
              borderRadius: '3px',
              background: i === step ? '#C07830' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <h2 style={{
          fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em',
          background: 'linear-gradient(90deg, #EEF2FF 30%, #C07830 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: '12px',
        }}>{isRtl ? current.titleAr : current.titleEn}</h2>

        <p style={{ fontSize: '14px', color: '#9BAECF', lineHeight: 1.6, marginBottom: '28px' }}>
          {isRtl ? current.descAr : current.descEn}
        </p>

        <button
          onClick={handleNext}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #C07830, #A8692A)',
            color: '#FFF', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(192,120,48,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isLast ? (isRtl ? 'ابدأ مع بيني →' : 'Start with Penny →') : (isRtl ? 'التالي ←' : 'Next →')}
        </button>
      </div>
    </div>
  );
}

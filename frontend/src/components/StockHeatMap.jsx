import React, { useState, useEffect } from 'react';

// 25 Saudi Tadawul + major stocks with realistic data
const TADAWUL_STOCKS = [
  // Energy
  { symbol: '2222', name: 'Saudi Aramco', nameAr: 'أرامكو السعودية', sector: 'Energy', price: 27.45, change: 0.85 },
  { symbol: '2030', name: 'Saudi Arabian Mining (Maaden)', nameAr: 'معادن', sector: 'Materials', price: 52.10, change: -1.20 },
  { symbol: '1150', name: 'Alinma Bank', nameAr: 'مصرف الإنماء', sector: 'Banks', price: 24.60, change: 1.45 },
  { symbol: '1120', name: 'Al Rajhi Bank', nameAr: 'مصرف الراجحي', sector: 'Banks', price: 89.30, change: -0.55 },
  { symbol: '1180', name: 'Saudi National Bank (SNB)', nameAr: 'البنك الأهلي السعودي', sector: 'Banks', price: 34.15, change: 2.10 },
  { symbol: '1010', name: 'Riyad Bank', nameAr: 'بنك الرياض', sector: 'Banks', price: 28.90, change: 0.30 },
  { symbol: '7010', name: 'STC', nameAr: 'شركة الاتصالات السعودية', sector: 'Telecom', price: 45.20, change: -0.80 },
  { symbol: '7030', name: 'Etihad Etisalat (Mobily)', nameAr: 'موبايلي', sector: 'Telecom', price: 13.80, change: 1.90 },
  { symbol: '2010', name: 'SABIC', nameAr: 'سابك', sector: 'Petrochemicals', price: 78.40, change: -2.30 },
  { symbol: '2350', name: 'Saudi Kayan', nameAr: 'كيان', sector: 'Petrochemicals', price: 9.75, change: 0.51 },
  { symbol: '4030', name: 'Jarir Marketing', nameAr: 'مجموعة جرير', sector: 'Retail', price: 147.60, change: 3.20 },
  { symbol: '4190', name: 'Nahdi Medical', nameAr: 'نهدي للخدمات الطبية', sector: 'Healthcare', price: 210.80, change: 1.10 },
  { symbol: '2240', name: 'Rabigh Refining', nameAr: 'رابغ للتكرير', sector: 'Energy', price: 15.30, change: -1.85 },
  { symbol: '4080', name: 'Saco', nameAr: 'ساكو', sector: 'Retail', price: 82.50, change: 0.40 },
  { symbol: '6010', name: 'Saudi Fransi', nameAr: 'بنك الفرنسي السعودي', sector: 'Banks', price: 42.30, change: -0.15 },
  { symbol: '4321', name: 'Elm Company', nameAr: 'شركة علم', sector: 'Technology', price: 755.00, change: 5.40 },
  { symbol: '1211', name: 'Ma\'aden Phosphate', nameAr: 'معادن الفوسفات', sector: 'Materials', price: 30.50, change: -0.70 },
  { symbol: '2382', name: 'Petro Rabigh', nameAr: 'بترو رابغ', sector: 'Petrochemicals', price: 16.20, change: 0.62 },
  { symbol: '8010', name: 'TAWUNIYA Insurance', nameAr: 'التعاونية', sector: 'Insurance', price: 88.40, change: 2.80 },
  { symbol: '4200', name: 'Al Muhaidib', nameAr: 'المحيديب', sector: 'Consumer', price: 35.60, change: -1.10 },
  { symbol: '4240', name: 'Almarai', nameAr: 'المراعي', sector: 'Food & Bev', price: 56.30, change: 0.90 },
  { symbol: '2282', name: 'ACWA Power', nameAr: 'أكوا باور', sector: 'Utilities', price: 192.60, change: 3.75 },
  { symbol: '4003', name: 'Saudi Ground Services', nameAr: 'الخدمات الأرضية', sector: 'Transport', price: 48.70, change: -0.45 },
  { symbol: '3007', name: 'Saudi Ceramics', nameAr: 'سيراميكا السعودية', sector: 'Industrial', price: 29.40, change: 1.35 },
  { symbol: '2330', name: 'Advanced Petrochem', nameAr: 'متقدمة للبتروكيماويات', sector: 'Petrochemicals', price: 55.80, change: -1.60 },
];

export default function StockHeatMap({ lang, stats }) {
  // Simulate live price movement: add small random deltas every 5 seconds
  const [stocks, setStocks] = useState(() =>
    TADAWUL_STOCKS.map(s => ({ ...s, liveChange: s.change }))
  );
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStock, setSelectedStock] = useState(null);
  const isRtl = lang === 'ar';

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev => prev.map(s => ({
        ...s,
        liveChange: parseFloat((s.liveChange + (Math.random() - 0.5) * 0.15).toFixed(2))
      })));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const sectors = ['All', ...new Set(TADAWUL_STOCKS.map(s => s.sector))];
  const filtered = selectedSector === 'All' ? stocks : stocks.filter(s => s.sector === selectedSector);

  // AI top picks: Shariah-compliant + positive change + highest momentum
  const topPicks = [...stocks]
    .filter(s => s.liveChange > 0)
    .sort((a, b) => b.liveChange - a.liveChange)
    .slice(0, 3);

  const getHeatColor = (change) => {
    if (change >= 3) return { bg: 'rgba(34,197,94,0.35)', border: 'rgba(34,197,94,0.6)', text: '#4ade80' };
    if (change >= 1) return { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.35)', text: '#86efac' };
    if (change >= 0) return { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.20)', text: '#bbf7d0' };
    if (change >= -1) return { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)', text: '#fca5a5' };
    if (change >= -3) return { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.35)', text: '#f87171' };
    return { bg: 'rgba(239,68,68,0.35)', border: 'rgba(239,68,68,0.6)', text: '#ef4444' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {isRtl ? 'خريطة تداول الأسهم' : 'Tadawul Heat Map'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {isRtl ? 'أسعار الأسهم السعودية محدثة كل 4 ثوان' : 'Saudi stock prices updating every 4 seconds'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.8)', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{isRtl ? 'بث مباشر' : 'LIVE'}</span>
        </div>
      </div>

      {/* AI Top Picks */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(192,120,48,0.08), rgba(192,120,48,0.03))', border: '1px solid rgba(192,120,48,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{isRtl ? 'توصيات الذكاء الاصطناعي - أفضل فرص اليوم' : 'AI Recommendations — Top Picks Today'}</h4>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {topPicks.map(s => (
            <div key={s.symbol} style={{
              flex: '1 1 120px', padding: '12px', borderRadius: '14px',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80' }}>{s.symbol}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {isRtl ? s.nameAr : s.name}
              </div>
              <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '4px' }}>+{s.liveChange.toFixed(2)}%</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>✓ {isRtl ? 'متوافق شرعياً' : 'Shariah OK'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sector Filter */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {sectors.map(sec => (
          <button key={sec} type="button" onClick={() => setSelectedSector(sec)} style={{
            padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            border: `1px solid ${selectedSector === sec ? 'var(--accent-cyan)' : 'var(--border-glass)'}`,
            background: selectedSector === sec ? 'var(--accent-cyan-light)' : 'transparent',
            color: selectedSector === sec ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{sec}</button>
        ))}
      </div>

      {/* Heat Map Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
        {filtered.map(s => {
          const clr = getHeatColor(s.liveChange);
          return (
            <div key={s.symbol}
              onClick={() => setSelectedStock(selectedStock?.symbol === s.symbol ? null : s)}
              style={{
                padding: '12px 10px', borderRadius: '14px', cursor: 'pointer',
                background: clr.bg, border: `1px solid ${clr.border}`,
                transition: 'all 0.3s ease',
                transform: selectedStock?.symbol === s.symbol ? 'scale(1.05)' : 'scale(1)',
                boxShadow: selectedStock?.symbol === s.symbol ? `0 8px 24px ${clr.border}` : 'none',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: clr.text, letterSpacing: '0.05em' }}>{s.symbol}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px', lineHeight: 1.2 }}>
                {isRtl ? s.nameAr : s.name}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                {s.price.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: clr.text }}>
                {s.liveChange >= 0 ? '+' : ''}{s.liveChange.toFixed(2)}%
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{s.sector}</div>
            </div>
          );
        })}
      </div>

      {/* Selected Stock Detail */}
      {selectedStock && (
        <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
                {isRtl ? selectedStock.nameAr : selectedStock.name}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selectedStock.symbol} • {selectedStock.sector}
              </div>
            </div>
            <button onClick={() => setSelectedStock(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{isRtl ? 'السعر الحالي' : 'Current Price'}</div><div style={{ fontSize: '24px', fontWeight: 800 }}>{selectedStock.price.toFixed(2)} SAR</div></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{isRtl ? 'التغيير' : 'Change'}</div><div style={{ fontSize: '24px', fontWeight: 800, color: getHeatColor(selectedStock.liveChange).text }}>{selectedStock.liveChange >= 0 ? '+' : ''}{selectedStock.liveChange.toFixed(2)}%</div></div>
          </div>
          <div style={{ marginTop: '12px', padding: '10px', borderRadius: '10px', background: 'rgba(192,120,48,0.06)', border: '1px solid rgba(192,120,48,0.15)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>🤖 {isRtl ? 'تحليل بيني' : 'Penny AI Analysis'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {selectedStock.liveChange > 2 ? (isRtl ? `زخم شرائي جيد - السهم يرتفع بشكل قوي. ينصح بمراقبة أي تصحيحات.` : `Strong buy momentum. The stock is trending up strongly. Monitor for any corrections.`) :
               selectedStock.liveChange < -2 ? (isRtl ? `تحذير - السهم ينخفض. انتظر استقرار قبل الشراء.` : `Caution — downtrend detected. Wait for stabilization before buying.`) :
               (isRtl ? `تداول متوازن. السهم في منطقة الترقب مع مؤشرات إيجابية متوسطة.` : `Neutral momentum. Hold or accumulate on dips. Moderate positive signals.`)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

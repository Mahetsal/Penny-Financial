import React, { useState } from 'react';
import { Sparkles, ShieldCheck, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../utils/api';

const SUBSCRIPTION_PRESETS = [
  { merchant: 'Netflix', amount: 56, interval: 'monthly', logo: '🎬' },
  { merchant: 'Spotify', amount: 23, interval: 'monthly', logo: '🎵' },
  { merchant: 'STC Fiber', amount: 287, interval: 'monthly', logo: '🌐' },
  { merchant: 'Tuwaiq Fitness', amount: 350, interval: 'monthly', logo: '💪' },
  { merchant: 'iCloud', amount: 15, interval: 'monthly', logo: '☁️' },
  { merchant: 'YouTube Premium', amount: 30, interval: 'monthly', logo: '📺' },
];

export default function OnboardingWizard({ profile, lang, onComplete, showToast }) {
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState('5000');
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [stocks, setStocks] = useState([
    { symbol: '1150', name: 'Alinma Bank', quantity: '10', purchasePrice: '24.60' }
  ]);
  const [loading, setLoading] = useState(false);

  const isRtl = lang === 'ar';

  const handleSubToggle = (sub) => {
    if (selectedSubs.some(s => s.merchant === sub.merchant)) {
      setSelectedSubs(selectedSubs.filter(s => s.merchant !== sub.merchant));
    } else {
      setSelectedSubs([...selectedSubs, sub]);
    }
  };

  const handleStockChange = (index, field, value) => {
    const updated = [...stocks];
    updated[index][field] = value;
    setStocks(updated);
  };

  const handleAddStockRow = () => {
    setStocks([...stocks, { symbol: '', name: '', quantity: '', purchasePrice: '' }]);
  };

  const handleRemoveStockRow = (index) => {
    setStocks(stocks.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Save budget to localStorage
      localStorage.setItem('penny_monthly_budget', budget);

      // 2. Save active subscriptions to backend
      for (const sub of selectedSubs) {
        const nextRenewal = new Date();
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
        await apiFetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant: sub.merchant,
            amount: parseFloat(sub.amount),
            interval: sub.interval,
            next_renewal: nextRenewal.toISOString().split('T')[0],
            utility_score: 1.0
          })
        });
      }

      // 3. Save stock portfolio to backend
      for (const st of stocks) {
        if (st.symbol && st.quantity && st.purchasePrice) {
          await apiFetch('/api/stocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: st.symbol,
              name: st.name || st.symbol,
              quantity: parseFloat(st.quantity),
              purchase_price: parseFloat(st.purchasePrice),
              current_price: parseFloat(st.purchasePrice)
            })
          });
        }
      }

      // Mark as onboarded
      localStorage.setItem('penny_onboarded', '1');
      if (showToast) {
        showToast(
          isRtl ? 'تم إعداد محفظتك بنجاح!' : 'Your portfolio setup is complete!',
          'success'
        );
      }
      onComplete();
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(
          isRtl ? 'حدث خطأ أثناء حفظ التفضيلات' : 'Failed to save onboarding data',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #090f1d 0%, #0F172A 55%, #0d1a2d 100%)',
      padding: '24px', overflowY: 'auto'
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '55%', paddingBottom: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,120,48,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '-8%', width: '50%', paddingBottom: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,107,181,0.10) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(192,120,48,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(192,120,48,0.02) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: '400px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(192, 120, 48, 0.18)',
        borderRadius: '28px',
        padding: '32px 24px',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        color: '#EEF2FF',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Progress Bar indicator */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              backgroundColor: s <= step ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{
              margin: '0 auto', width: '76px', height: '76px', borderRadius: '50%',
              background: 'conic-gradient(from 135deg, #C07830 0%, #8B6BB5 50%, #C07830 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(192,120,48,0.3)'
            }}>
              <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#C07830' }}>P</span>
              </div>
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#EEF2FF' }}>
              {isRtl ? `مرحباً، ${profile?.name || 'مستخدم بيني'}!` : `Welcome, ${profile?.name || 'Penny User'}!`}
            </h2>
            <p style={{ fontSize: '14px', color: '#9BAECF', lineHeight: 1.5 }}>
              {isRtl
                ? 'لنبدأ رحلتك المالية بتحديد الميزانية والأصول الخاصة بك لتخصيص تحليلات بيني الذكية.'
                : "Let's set up your financial journey by logging your budget, subscriptions, and assets for personalized intelligence."}
            </p>
          </div>
        )}

        {/* Step 2: Budget */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
              {isRtl ? 'حدد ميزانيتك الشهرية' : 'Monthly Budget Plan'}
            </h3>
            <p style={{ fontSize: '13px', color: '#9BAECF', lineHeight: 1.4 }}>
              {isRtl
                ? 'كم تخطط للإنفاق في المتوسط كل شهر؟ سيستخدم الذكاء الاصطناعي هذا المبلغ لتنبيهك ومقارنته.'
                : 'How much do you plan to spend on average per month? Penny uses this to help monitor alerts.'}
            </p>
            <div style={{ position: 'relative', marginTop: '8px' }}>
              <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRtl ? 'right' : 'left']: '16px', color: 'var(--accent-cyan)' }}>
                <DollarSign size={18} />
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingLeft: isRtl ? '16px' : '44px',
                  paddingRight: isRtl ? '44px' : '16px',
                  borderRadius: '16px',
                  border: '2px solid rgba(192,120,48,0.2)',
                  background: 'rgba(10,22,40,0.6)',
                  color: '#EEF2FF',
                  fontSize: '18px',
                  fontWeight: '700',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Subscriptions */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
              {isRtl ? 'الاشتراكات النشطة' : 'Active Subscriptions'}
            </h3>
            <p style={{ fontSize: '13px', color: '#9BAECF', lineHeight: 1.4 }}>
              {isRtl
                ? 'اختر الاشتراكات التي تدفع لها بانتظام. سنراقب تجديدها وفائدتها.'
                : 'Select the subscriptions you currently pay for. Penny will monitor renewals.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {SUBSCRIPTION_PRESETS.map(sub => {
                const selected = selectedSubs.some(s => s.merchant === sub.merchant);
                return (
                  <button
                    key={sub.merchant}
                    onClick={() => handleSubToggle(sub)}
                    style={{
                      padding: '12px',
                      borderRadius: '16px',
                      border: `1.5px solid ${selected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)'}`,
                      background: selected ? 'rgba(192,120,48,0.12)' : 'rgba(255,255,255,0.02)',
                      color: selected ? '#EEF2FF' : '#9BAECF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{sub.logo}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>{sub.merchant}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>{sub.amount} SAR</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Stocks */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
              {isRtl ? 'محفظة الأسهم' : 'Stock Portfolio'}
            </h3>
            <p style={{ fontSize: '13px', color: '#9BAECF', lineHeight: 1.4 }}>
              {isRtl
                ? 'أدخل الأسهم التي تملكها (مثال: الإنماء 1150). سنقوم بتتبع أدائها مباشرة.'
                : 'Log any stocks you own. We will track live valuations and signals.'}
            </p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {stocks.map((st, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={isRtl ? 'الرمز (1150)' : 'Symbol'}
                    value={st.symbol}
                    onChange={(e) => handleStockChange(i, 'symbol', e.target.value)}
                    style={{ flex: 1.5, padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    placeholder={isRtl ? 'الكمية' : 'Qty'}
                    value={st.quantity}
                    onChange={(e) => handleStockChange(i, 'quantity', e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '12px' }}
                  />
                  <input
                    type="number"
                    placeholder={isRtl ? 'السعر' : 'Price'}
                    value={st.purchasePrice}
                    onChange={(e) => handleStockChange(i, 'purchasePrice', e.target.value)}
                    style={{ flex: 1.2, padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#FFF', fontSize: '12px' }}
                  />
                  <button onClick={() => handleRemoveStockRow(i)} style={{ border: 'none', background: 'none', color: '#ff3b6f', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}>×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddStockRow}
                style={{
                  padding: '6px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.2)',
                  background: 'none', color: '#9BAECF', fontSize: '11px', cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                {isRtl ? '+ إضافة سهم آخر' : '+ Add Stock Row'}
              </button>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '12px', marginTop: '8px' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1, padding: '14px', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.12)', background: 'transparent',
                color: '#9BAECF', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <ArrowLeft size={16} />
              {isRtl ? 'السابق' : 'Back'}
            </button>
          )}
          
          <button
            onClick={step < 4 ? () => setStep(step + 1) : handleFinish}
            disabled={loading}
            style={{
              flex: 2, padding: '14px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #C07830, #A8692A)',
              color: '#FFF', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              boxShadow: '0 4px 20px rgba(192,120,48,0.25)',
              opacity: loading ? 0.7 : 1
            }}
          >
            <span>{step === 4 ? (isRtl ? 'ابدأ الاستخدام' : 'Complete Setup') : (isRtl ? 'التالي' : 'Next')}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Skip button for optional steps */}
        {step > 1 && step < 4 && (
          <button
            onClick={() => setStep(step + 1)}
            style={{
              alignSelf: 'center', background: 'none', border: 'none',
              color: '#5D7099', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {isRtl ? 'تخطي هذه الخطوة' : 'Skip this step'}
          </button>
        )}
      </div>
    </div>
  );
}

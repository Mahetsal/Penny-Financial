import React, { useState, useEffect } from 'react';
import { CalendarRange, PlusCircle, Power, PowerOff, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../utils/api';

function Subscriptions({ profile, lang, t }) {
  const isRtl = lang === 'ar';
  const isUsd = profile?.currency === 'USD';
  const currencySymbol = isUsd ? '$' : (isRtl ? 'ر.س' : 'SAR');
  const [subscriptions, setSubscriptions] = useState([]);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setIntervalVal] = useState('monthly');
  const [nextRenewal, setNextRenewal] = useState('');
  const [utility, setUtility] = useState('1.0');

  const fetchSubscriptions = async () => {
    try {
      const res = await apiFetch('/api/subscriptions');
      const data = await res.json();
      const rate = isUsd ? 3.75 : 1;
      const converted = data.map(s => ({
        ...s,
        amount: parseFloat((s.amount / rate).toFixed(2))
      }));
      setSubscriptions(converted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [profile, isUsd]);

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!merchant || !amount || !nextRenewal) return;

    const dbAmount = isUsd ? parseFloat(amount) * 3.75 : parseFloat(amount);

    try {
      const res = await apiFetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant,
          amount: dbAmount,
          interval,
          next_renewal: nextRenewal,
          utility_score: parseFloat(utility)
        })
      });
      if (res.ok) {
        setMerchant('');
        setAmount('');
        setNextRenewal('');
        setUtility('1.0');
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await apiFetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentStatus === 1 ? 0 : 1 })
      });
      if (res.ok) {
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUtility = async (id, val) => {
    try {
      const res = await apiFetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utility_score: parseFloat(val) })
      });
      if (res.ok) {
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    }
  };



  // Utility badge styles helper
  const getUtilityStyle = (score) => {
    if (score >= 0.8) return { color: 'var(--accent-cyan)', label: isRtl ? 'منفعة عالية' : 'High Utility' };
    if (score >= 0.5) return { color: 'var(--accent-blue)', label: isRtl ? 'منفعة متوسطة' : 'Moderate Utility' };
    return { color: 'var(--accent-pink)', label: isRtl ? 'منفعة منخفضة - مراجعة' : 'Low Utility - Review' };
  };

  // Countdown renewal days helper
  const getDaysRemaining = (dateStr) => {
    const today = new Date();
    const renewal = new Date(dateStr);
    const diffTime = renewal - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' }}>{t('subsTitle')}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{t('subsDesc')}</p>
      </div>

      <div className="responsive-subscriptions-layout">
        
        {/* Log Subscription Form */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('registerSub')}</h4>
          <form onSubmit={handleAddSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">{t('merchantName')}</label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="e.g. Netflix, Gym, AWS"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
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
                <label className="form-label">{t('interval')}</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={interval}
                  onChange={(e) => setIntervalVal(e.target.value)}
                >
                  <option value="weekly">{t('weekly')}</option>
                  <option value="monthly">{t('monthly')}</option>
                  <option value="yearly">{t('yearly')}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('nextRenewal')}</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={nextRenewal}
                  onChange={(e) => setNextRenewal(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('utilityScore')}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1.0"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={utility}
                  onChange={(e) => setUtility(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <PlusCircle size={18} />
              {t('saveSub')}
            </button>
          </form>
        </div>

        {/* Subscription List Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{t('subsRecommendations')}</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {subscriptions.map(sub => {
              const utilInfo = getUtilityStyle(sub.utility_score);
              const daysLeft = getDaysRemaining(sub.next_renewal);

              // Translate merchants in Arabic if necessary
              let displayMerchant = sub.merchant;
              if (isRtl) {
                if (sub.merchant === 'Netflix') displayMerchant = 'نيتفليكس (Netflix)';
                if (sub.merchant === 'Gym Membership') displayMerchant = 'اشتراك النادي الرياضي';
                if (sub.merchant === 'Amazon Prime') displayMerchant = 'أمازون برايم (Amazon Prime)';
              }

              return (
                <div key={sub.id} style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: sub.is_active === 1 ? 1 : 0.6
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CalendarRange size={20} color="var(--accent-cyan)" />
                    </div>
                    <div>
                      <h5 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{displayMerchant}</h5>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {isUsd ? `$${sub.amount.toFixed(2)} / ` : (isRtl ? `${sub.amount.toFixed(2)} ر.س / ` : `${sub.amount.toFixed(2)} SAR / `)}
                        {isRtl ? (sub.interval === 'weekly' ? 'أسبوعي' : sub.interval === 'monthly' ? 'شهري' : 'سنوي') : sub.interval}
                      </span>
                    </div>
                  </div>

                  {/* Recommendations, Utility and Timers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {sub.is_active === 1 && sub.utility_score < 0.5 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-pink)' }}>
                        <ShieldAlert size={14} />
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{t('lowUtilityCancel')}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t('utilityLevel')}</span>
                      <select
                        style={{
                          background: 'none',
                          border: 'none',
                          color: utilInfo.color,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: isRtl ? 'left' : 'right',
                          outline: 'none'
                        }}
                        value={sub.utility_score}
                        onChange={(e) => handleUpdateUtility(sub.id, e.target.value)}
                      >
                        <option value="1.0" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>1.0 ({isRtl ? 'مرتفع' : 'High'})</option>
                        <option value="0.8" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>0.8</option>
                        <option value="0.5" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>0.5 ({isRtl ? 'متوسط' : 'Mid'})</option>
                        <option value="0.3" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>0.3 ({isRtl ? 'منخفض' : 'Low'})</option>
                        <option value="0.1" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>0.1 ({isRtl ? 'غير مستخدم' : 'Unused'})</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t('renewalCountdown')}</span>
                      <strong style={{ fontSize: '13px', color: daysLeft <= 3 && sub.is_active === 1 ? 'var(--accent-pink)' : 'var(--text-primary)' }}>
                        {sub.is_active === 1 ? `${daysLeft} ${isRtl ? 'أيام' : 'days'}` : t('paused')}
                      </strong>
                    </div>

                    <button
                      onClick={() => handleToggleActive(sub.id, sub.is_active)}
                      className="btn"
                      style={{
                        padding: '6px',
                        borderRadius: '8px',
                        backgroundColor: sub.is_active === 1 ? 'var(--accent-cyan-light)' : 'var(--bg-tertiary)',
                        border: '1px solid var(--border-glass)',
                        color: sub.is_active === 1 ? 'var(--accent-cyan)' : 'var(--text-tertiary)'
                      }}
                    >
                      {sub.is_active === 1 ? <Power size={16} /> : <PowerOff size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}

export default Subscriptions;

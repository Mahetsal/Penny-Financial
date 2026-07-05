import React, { useState, useEffect } from 'react';
import { PlusCircle, Target, ShieldCheck, Trophy, Trash2, Flame, Star, Zap, Plus } from 'lucide-react';
import { apiFetch } from '../utils/api';

/* ─── Milestone badges ────────────────────────────────────────────── */
function MilestoneBadges({ pct }) {
  const milestones = [
    { threshold: 25, icon: '⚡', label: '25%' },
    { threshold: 50, icon: '🔥', label: '50%' },
    { threshold: 75, icon: '⭐', label: '75%' },
    { threshold: 100, icon: '🏆', label: '100%' },
  ];
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {milestones.map(m => (
        <span
          key={m.threshold}
          title={`${m.label} milestone`}
          style={{
            fontSize: '20px',
            opacity: pct >= m.threshold ? 1 : 0.2,
            filter: pct >= m.threshold ? 'drop-shadow(0 0 6px rgba(192,120,48,0.7))' : 'none',
            transition: 'all 0.4s ease',
            cursor: 'default',
          }}
        >
          {m.icon}
        </span>
      ))}
    </div>
  );
}

/* ─── Goal Card ───────────────────────────────────────────────────── */
function GoalCard({ g, isRtl, t, onFund, onDelete, currencySymbol }) {
  const [fundInput, setFundInput] = useState('');
  const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));

  const getGoalTitle = (title) => {
    if (!isRtl) return title;
    if (title === 'Emergency Fund') return 'صندوق الطوارئ';
    if (title === 'Europe Summer Trip') return 'رحلة الصيف السياحية';
    return title;
  };

  const handleFund = () => {
    if (!fundInput || isNaN(fundInput)) return;
    onFund(g.id, g.current_amount, fundInput);
    setFundInput('');
  };

  return (
    <div
      className="glass-panel"
      style={{
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(192,120,48,0.08) 0%, rgba(139,107,181,0.04) 100%)',
        border: '1px solid var(--border-glass)',
        borderRadius: '24px',
        padding: '24px 28px',
        transition: 'box-shadow 0.3s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(192,120,48,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Decorative glow orb */}
      <div style={{
        position: 'absolute', top: '-30px', right: isRtl ? 'auto' : '-30px', left: isRtl ? '-30px' : 'auto',
        width: '100px', height: '100px', borderRadius: '50%',
        background: `radial-gradient(circle, rgba(192,120,48,${Math.min(0.2, pct / 300)}) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            {getGoalTitle(g.title)}
          </h3>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {g.current_amount.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/ {g.target_amount.toLocaleString()}{currencySymbol || ' SAR'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Large percentage */}
          <span style={{
            fontSize: '38px', fontWeight: 950, letterSpacing: '-0.03em',
            color: pct >= 100 ? '#22c55e' : pct >= 50 ? 'var(--accent-cyan)' : 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {pct}%
          </span>
          {/* Delete button */}
          <button
            onClick={() => onDelete(g.id)}
            title={isRtl ? 'حذف الهدف' : 'Delete goal'}
            style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px', padding: '8px 10px', cursor: 'pointer',
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Thick animated progress bar */}
      <div>
        <div style={{
          width: '100%', height: '16px', borderRadius: '9999px',
          backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: '9999px',
            background: 'linear-gradient(90deg, var(--accent-cyan) 0%, #8B6BB5 50%, #C07830 100%)',
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 0 12px rgba(192,120,48,0.4)',
          }} />
        </div>
      </div>

      {/* Bottom row: target date badge + milestones + quick deposit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Target date badge */}
          {g.target_date && (
            <span style={{
              fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '20px',
              background: 'rgba(192,120,48,0.10)', border: '1px solid rgba(192,120,48,0.25)',
              color: 'var(--accent-cyan)',
            }}>
              📅 {g.target_date}
            </span>
          )}
          <MilestoneBadges pct={pct} />
        </div>

        {/* Quick deposit */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            value={fundInput}
            onChange={e => setFundInput(e.target.value)}
            placeholder={isRtl ? 'المبلغ' : 'Amount'}
            className="form-input"
            style={{ width: '100px', padding: '8px 12px', fontSize: '13px', borderRadius: '12px' }}
            onKeyDown={e => { if (e.key === 'Enter') handleFund(); }}
          />
          <button
            onClick={handleFund}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '12px', gap: '6px' }}
          >
            <Plus size={14} />
            {isRtl ? 'إيداع' : 'Fund'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Goal Modal ──────────────────────────────────────────────── */
function AddGoalModal({ isRtl, t, onSubmit, onClose, currencySymbol }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !target) return;
    setIsSubmitting(true);
    await onSubmit({ title, target, current, date });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-panel text-left animate-fade-in"
        style={{
          width: '100%', maxWidth: '360px',
          padding: '28px', borderRadius: '24px',
          border: '1.5px solid rgba(192,120,48,0.25)',
          background: 'rgba(10,22,40,0.92)',
          display: 'flex', flexDirection: 'column', gap: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
          🎯 {isRtl ? 'إنشاء هدف ادخار جديد' : 'New Savings Goal'}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>{t('goalTitle') || (isRtl ? 'اسم الهدف' : 'Goal Title')}</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%' }}
              placeholder={isRtl ? 'صندوق الطوارئ، سيارة جديدة...' : 'e.g. Emergency Fund, New Car...'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>{t('targetAmount') || (isRtl ? 'المبلغ المستهدف' : 'Target Amount')}</label>
            <input
              type="number"
              className="form-input"
              style={{ width: '100%' }}
              placeholder={`0.00 ${currencySymbol?.trim() || 'SAR'}`}
              value={target}
              onChange={e => setTarget(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>{t('startingAmount') || (isRtl ? 'المبلغ الحالي' : 'Starting Balance')}</label>
            <input
              type="number"
              className="form-input"
              style={{ width: '100%' }}
              placeholder={`0.00 ${currencySymbol?.trim() || 'SAR'}`}
              value={current}
              onChange={e => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>{t('targetDate') || (isRtl ? 'التاريخ المستهدف' : 'Target Date')}</label>
            <input
              type="date"
              className="form-input"
              style={{ width: '100%' }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, justifyContent: 'center' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'إنشاء الهدف' : 'Create Goal')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main SavingsGoals Component ─────────────────────────────────── */
function SavingsGoals({ stats, profile, lang, t }) {
  const [goals, setGoals] = useState([]);
  const [optimalRate, setOptimalRate] = useState(null);
  
  // Create Goal Modal visibility
  const [showModal, setShowModal] = useState(false);

  // Savings Growth Calculator State
  const [calcMonthly, setCalcMonthly] = useState(1000);
  const [calcYears, setCalcYears] = useState(5);

  const isRtl = lang === 'ar';
  const isUsd = profile?.currency === 'USD';
  const currencySymbol = isUsd ? ' USD' : (isRtl ? ' ر.س' : ' SAR');

  const fetchGoals = async () => {
    try {
      const res = await apiFetch('/api/savings');
      const data = await res.json();
      const rate = isUsd ? 3.75 : 1;
      const converted = data.map(g => ({
        ...g,
        current_amount: parseFloat((g.current_amount / rate).toFixed(2)),
        target_amount: parseFloat((g.target_amount / rate).toFixed(2))
      }));
      setGoals(converted);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOptimalRate = async () => {
    try {
      const res = await apiFetch('/api/savings/optimal');
      const data = await res.json();
      setOptimalRate(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGoals();
    fetchOptimalRate();
  }, [stats, profile, isUsd]);

  const handleAddGoal = async ({ title, target, current, date }) => {
    try {
      const rate = isUsd ? 3.75 : 1;
      const dbTarget = parseFloat(target) * rate;
      const dbCurrent = parseFloat(current || 0) * rate;

      const res = await apiFetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          target_amount: dbTarget,
          current_amount: dbCurrent,
          target_date: date,
        }),
      });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFundGoal = async (id, currentVal, fundAmount) => {
    if (!fundAmount || isNaN(fundAmount)) return;
    try {
      const rate = isUsd ? 3.75 : 1;
      const dbAmount = (parseFloat(currentVal) + parseFloat(fundAmount)) * rate;

      const res = await apiFetch(`/api/savings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_amount: dbAmount }),
      });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      const res = await apiFetch(`/api/savings/${id}`, { method: 'DELETE' });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  // Compound growth math (5% rate)
  const calcRate = 0.05 / 12;
  const calcMonths = calcYears * 12;
  const totalPrincipal = calcMonthly * calcMonths;
  const futureValue = calcMonthly * ((Math.pow(1 + calcRate, calcMonths) - 1) / calcRate) * (1 + calcRate);
  const interestEarned = futureValue - totalPrincipal;

  const rateValue = optimalRate ? (optimalRate.optimalSavingsRate * 100).toFixed(1) : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>

      {/* Page title */}
      <div>
        <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em' }}>{t('savingsTitle')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{t('savingsDesc')}</p>
      </div>

      {/* ── Featured: Optimal Rate Card ── */}
      {optimalRate && (
        <div className="glass-panel" style={{
          background: 'linear-gradient(135deg, rgba(192,120,48,0.12) 0%, rgba(139,107,181,0.06) 100%)',
          border: '1px solid rgba(192,120,48,0.3)',
          borderRadius: '28px',
          padding: '32px',
          display: 'flex',
          gap: '28px',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(192,120,48,0.15)',
        }}>
          <div style={{
            width: '90px', height: '90px', flexShrink: 0, borderRadius: '24px',
            background: 'var(--accent-cyan-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid var(--accent-cyan)',
            boxShadow: '0 0 24px rgba(192,120,48,0.35)',
          }}>
            <ShieldCheck size={42} color="var(--accent-cyan)" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('allocationAdvice')}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '58px', fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--accent-cyan)', lineHeight: 1 }}>
                {rateValue}%
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isRtl ? 'نسبة الادخار الموصى بها لميزانيتك' : 'Recommended Savings Allocation'}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '8px', maxWidth: '680px' }}>
              {t('formulaExplanation')}
            </p>
          </div>
        </div>
      )}

      {/* ── Goals grid + calculator two-column layout ── */}
      <div className="responsive-savings-layout">

        {/* Left: Goals list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{t('trackedTargets')}</h4>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {goals.length} {isRtl ? 'هدف نشط' : goals.length === 1 ? 'goal' : 'goals'}
            </span>
          </div>

          {goals.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 32px',
              color: 'var(--text-tertiary)', fontSize: '15px',
              border: '2px dashed var(--border-glass)', borderRadius: '24px',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
              {t('noGoals')}
            </div>
          )}

          {goals.map(g => (
            <GoalCard
              key={g.id}
              g={g}
              isRtl={isRtl}
              t={t}
              onFund={handleFundGoal}
              onDelete={handleDeleteGoal}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>

        {/* Right: Savings Growth Calculator */}
        <div className="glass-panel" style={{
          display: 'flex', flexDirection: 'column', gap: '24px',
          borderRadius: '24px', padding: '28px',
        }}>
          <div>
            <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>
              💰 {isRtl ? 'حاسبة نمو الادخار' : 'Savings Growth Calculator'}
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {isRtl
                ? 'شاهد كيف تنمو مدخراتك مع مرور الوقت بمعدل نمو متوقع 5% سنوياً.'
                : 'See how your savings grow over time with a conservative 5% annual growth rate.'}
            </p>
          </div>

          {/* Monthly Savings Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                {isRtl ? 'الادخار الشهري' : 'Monthly Savings'}
              </span>
              <strong style={{ color: 'var(--accent-cyan)', fontSize: '18px' }}>
                {calcMonthly.toLocaleString()}{currencySymbol}
              </strong>
            </div>
            <input
              type="range" min="100" max="10000" step="100"
              value={calcMonthly} onChange={e => setCalcMonthly(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', height: '8px', borderRadius: '4px', outline: 'none' }}
            />
          </div>

          {/* Years Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                {isRtl ? 'المدى الزمني' : 'Time Horizon'}
              </span>
              <strong style={{ color: 'var(--accent-cyan)', fontSize: '18px' }}>
                {calcYears} {isRtl ? (calcYears >= 3 && calcYears <= 10 ? 'سنوات' : 'سنة') : (calcYears === 1 ? 'Year' : 'Years')}
              </strong>
            </div>
            <input
              type="range" min="1" max="30" step="1"
              value={calcYears} onChange={e => setCalcYears(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', height: '8px', borderRadius: '4px', outline: 'none' }}
            />
          </div>

          {/* Double Segment bar */}
          <div style={{
            width: '100%', height: '18px', borderRadius: '9px',
            backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden',
            display: 'flex', marginTop: '6px',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: `${(totalPrincipal / futureValue) * 100}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--accent-cyan), #8B6BB5)',
              transition: 'width 0.3s ease-out',
            }} title={isRtl ? 'المبلغ الأصلي' : 'Principal'} />
            <div style={{
              flex: 1, height: '100%',
              background: 'linear-gradient(90deg, var(--accent-blue), #c07830)',
              transition: 'width 0.3s ease-out',
            }} title={isRtl ? 'الأرباح المركبة' : 'Compound Interest'} />
          </div>

          {/* Numeric breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                <span>{isRtl ? 'إجمالي المبالغ المودعة:' : 'Total Principal Saved:'}</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{Math.round(totalPrincipal).toLocaleString()}{currencySymbol}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
                <span>{isRtl ? 'الأرباح المركبة المتوقعة:' : 'Expected Compound Growth:'}</span>
              </div>
              <strong style={{ color: 'var(--accent-blue)' }}>+{Math.round(interestEarned).toLocaleString()}{currencySymbol}</strong>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: '16px', borderTop: '1px solid var(--border-glass)',
              fontSize: '18px', fontWeight: 900,
            }}>
              <span>{isRtl ? 'المجموع المتوقع الكلي:' : 'Projected Total Value:'}</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{Math.round(futureValue).toLocaleString()}{currencySymbol}</span>
            </div>
          </div>

          {/* Multiplier badge */}
          <div style={{
            textAlign: 'center', padding: '16px', borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(192,120,48,0.12), rgba(139,107,181,0.06))',
            border: '1px solid rgba(192,120,48,0.22)',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isRtl ? 'معامل نمو الثروة' : 'Wealth Growth Index'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 950, color: 'var(--accent-cyan)', marginTop: '6px' }}>
              {(futureValue / totalPrincipal).toFixed(2)}×
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isRtl ? `عائد متوقع على كل ${isUsd ? 'دولار' : 'ريال'} تدخره` : `growth factor on every ${currencySymbol?.trim() || 'SAR'} logged`}
            </div>
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowModal(true)}
        title={isRtl ? 'إضافة هدف جديد' : 'Add new goal'}
        style={{
          position: 'fixed', bottom: '90px', right: isRtl ? 'auto' : '20px', left: isRtl ? '20px' : 'auto',
          width: '60px', height: '60px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #8B6BB5 100%)',
          boxShadow: '0 8px 24px rgba(192,120,48,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, transition: 'transform 0.2s, box-shadow 0.2s',
          color: 'white',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(192,120,48,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(192,120,48,0.45)'; }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <AddGoalModal
          isRtl={isRtl}
          t={t}
          onSubmit={handleAddGoal}
          onClose={() => setShowModal(false)}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

export default SavingsGoals;

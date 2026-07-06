import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { apiFetch } from '../utils/api';

function Dashboard({ stats, transactions, stocks = [], linkedAccounts = [], profile, lang, t, onNavigate }) {
  const isRtl = lang === 'ar';
  const isUsd = profile?.currency === 'USD';
  const currencySymbol = isUsd ? '$' : (isRtl ? 'ر.س' : 'SAR');

  const [goalsCount, setGoalsCount] = React.useState(0);
  const [tips, setTips] = React.useState([]);
  const [showWeeklySpending, setShowWeeklySpending] = React.useState(true);
  const [showWealthGrowth, setShowWealthGrowth] = React.useState(true);
  const [hoveredBar, setHoveredBar] = React.useState(null);
  const [hoveredPoint, setHoveredPoint] = React.useState(null);

  // Coin Flip Interactive Simulator state
  const [flipClass, setFlipClass] = React.useState('');
  const [isFlipping, setIsFlipping] = React.useState(false);
  const [coinResult, setCoinResult] = React.useState('front');

  const handleCoinClick = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setFlipClass(''); // reset first
    
    // Choose result randomly
    const result = Math.random() < 0.5 ? 'front' : 'back';
    
    // Defer setting the class to ensure reflow triggers animation
    setTimeout(() => {
      setFlipClass(result === 'front' ? 'coin-flip-to-front' : 'coin-flip-to-back');
    }, 10);
    
    // Wait for animation to finish (1.2s)
    setTimeout(() => {
      setCoinResult(result);
      setIsFlipping(false);
    }, 1200);
  };

  React.useEffect(() => {
    apiFetch('/api/savings')
      .then(res => res.json())
      .then(data => setGoalsCount(data.length))
      .catch(err => console.error('Failed to load goals count:', err));

    apiFetch('/api/tips')
      .then(res => res.json())
      .then(data => setTips(data))
      .catch(err => console.error('Failed to load tips:', err));
  }, []);

  const savingsRate = stats.income > 0 
    ? Math.max(0, Math.min(100, Math.round(((stats.income - stats.spending) / stats.income) * 100))) 
    : 0;

  // Calculate growth
  const calculateGrowth = () => {
    if (!transactions || transactions.length === 0) return 0;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const thisMonthIncome = transactions.filter(t => t.date?.startsWith(thisMonth) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const lastMonthIncome = transactions.filter(t => t.date?.startsWith(lastMonthStr) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (lastMonthIncome === 0) return thisMonthIncome > 0 ? 100 : 0;
    return Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100);
  };

  const growth = calculateGrowth();
  const isPositiveGrowth = growth >= 0;

  // Calculate Dynamic Wealth Growth
  const calculateWealthGrowth = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const netChange = transactions
      .filter(t => new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const stockPnl = stocks ? stocks.reduce((sum, s) => sum + (s.pnl || 0), 0) : 0;
    const totalGrowth = netChange + stockPnl;
    
    const stocksVal = stocks ? stocks.reduce((sum, s) => sum + s.quantity * s.current_price, 0) : 0;
    const totalWealthVal = stats.balance + stocksVal;
    
    const prevWealth = totalWealthVal - totalGrowth;
    const growthPct = prevWealth > 0 ? parseFloat(((totalGrowth / prevWealth) * 100).toFixed(1)) : 0;
    
    return {
      amount: totalGrowth,
      percentage: growthPct,
      totalWealth: totalWealthVal
    };
  };

  const wealthGrowth = calculateWealthGrowth();

  // Dynamic AI insight
  const getAIInsight = () => {
    if (!transactions || transactions.length === 0) {
      return isRtl ? 'أضف معاملات لبدء التحليل الذكي' : 'Add transactions to start smart analysis';
    }
    const debits = transactions.filter(t => t.amount < 0);
    const categoryMap = {};
    debits.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
    });
    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats[0];
    if (!topCategory) return isRtl ? 'لا توجد مصروفات لتحليلها' : 'No expenses to analyze';
    
    const catNames = {
      'Food & Dining': 'المطاعم والأغذية',
      'Transportation': 'المواصلات',
      'Entertainment': 'الترفيه',
      'Shopping': 'التسوق',
      'Housing': 'السكن',
      'Utilities': 'الفواتير'
    };
    const catName = isRtl ? (catNames[topCategory[0]] || topCategory[0]) : topCategory[0];
    const pct = stats.spending > 0 ? Math.round((topCategory[1] / stats.spending) * 100) : 0;
    
    return isRtl
      ? `عبدالله، نمط إنفاقك في "${catName}" زاد بنسبة ${pct}% من إجمالي مصاريفك. هل ترغب في وضع حد للحفاظ على أهدافك؟`
      : `Your spending in "${catName}" is ${pct}% of total expenses. Want to set a spending limit?`;
  };

  // Get last 3 transactions for Timeline
  const recentMoves = transactions.slice(0, 3);

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* Hero Section: Wealth Pulse */}
      <section className="relative grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-6 space-y-4">
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
            {isRtl ? 'صحتك المالية اليوم' : 'Financial Health Today'}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {isRtl 
              ? 'نمو محفظتك الاستثمارية يتجاوز التوقعات بنسبة 12% هذا الشهر. استمر في هذا المسار لتحقيق أهدافك.'
              : 'Your portfolio growth exceeds expectations by 12% this month. Keep it up to hit your targets.'
            }
          </p>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => onNavigate('savings')}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-body-md font-semibold hover:opacity-90 transition-all active:scale-95 duration-150"
            >
              {isRtl ? 'تعديل الأهداف' : 'Edit Goals'}
            </button>
            <button 
              onClick={() => onNavigate('transactions')}
              className="border border-primary text-primary px-5 py-2.5 rounded-xl font-body-md font-semibold hover:bg-primary/10 transition-all active:scale-95 duration-150"
            >
              {isRtl ? 'عرض التقارير' : 'View Reports'}
            </button>
          </div>
        </div>
        
        {/* Wealth Growth Visualization (Animated Circle) */}
        <div className="md:col-span-6 flex justify-center relative py-6">
          <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-full wealth-gradient p-1 flex items-center justify-center pulse-gentle">
            <div className="absolute inset-0 rounded-full border-[10px] border-white/20 blur-sm"></div>
            <div className="bg-surface w-[92%] h-[92%] rounded-full flex flex-col items-center justify-center text-center p-6">
              <span className="font-label-md text-label-md text-primary tracking-widest uppercase text-xs">
                {isRtl ? 'إجمالي الثروة' : 'TOTAL WEALTH'}
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="font-headline-xl text-3xl md:text-4xl font-bold text-primary">
                  {wealthGrowth.totalWealth >= 1000 ? `${(wealthGrowth.totalWealth / 1000).toFixed(1)}K` : wealthGrowth.totalWealth.toFixed(0)}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-sm">
                  {currencySymbol}
                </span>
              </div>
              <div className={`flex items-center gap-1 mt-2 font-bold text-xs ${wealthGrowth.amount >= 0 ? 'text-primary' : 'text-error'}`}>
                <span className="material-symbols-outlined text-sm">{wealthGrowth.amount >= 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{wealthGrowth.amount >= 0 ? '+' : ''}{wealthGrowth.amount.toLocaleString()} ({wealthGrowth.percentage >= 0 ? '+' : ''}{wealthGrowth.percentage}%)</span>
              </div>
            </div>
          </div>
          {/* Interactive Orbs */}
          <div className="absolute top-10 right-10 w-12 h-12 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse delay-700"></div>
        </div>
      </section>

      {/* 3D Interactive Coin Flip */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 24px 0', gap: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isRtl ? 'انقر لقلب عملة بيني المحظوظة' : 'Click to Flip Lucky Penny Coin'}
        </span>
        
        <div 
          onClick={handleCoinClick}
          style={{
            perspective: '1000px',
            width: '140px',
            height: '140px',
            cursor: 'pointer',
          }}
        >
          <div 
            className={flipClass}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transformStyle: 'preserve-3d',
              transition: isFlipping ? 'none' : 'transform 0.4s ease',
              transform: isFlipping ? undefined : (coinResult === 'front' ? 'rotateY(0deg)' : 'rotateY(180deg)'),
            }}
          >
            {/* FRONT FACE (HEADS) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '4px solid #C07830',
              boxShadow: '0 12px 28px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.4)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'url(/penny_logo.jpg) no-repeat',
              backgroundSize: '150% 150%',
              backgroundPosition: 'center 22%',
            }} />
            
            {/* BACK FACE (TAILS) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '4px solid #C07830',
              boxShadow: '0 12px 28px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.4)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'url(/penny_coin_back.png) no-repeat',
              backgroundSize: '150% 150%',
              backgroundPosition: 'center center',
            }} />
          </div>
        </div>
        
        {/* Result Indicator */}
        <div style={{
          minHeight: '20px',
          fontSize: '13px',
          fontWeight: 700,
          color: isFlipping ? 'var(--text-secondary)' : 'var(--accent-cyan)',
          transition: 'all 0.3s ease',
          opacity: isFlipping ? 0.6 : 1,
        }}>
          {isFlipping 
            ? (isRtl ? 'جاري قلب العملة...' : 'Flipping...') 
            : (coinResult === 'front' 
                ? (isRtl ? 'الوجه: بيني (المقدمة)' : 'Heads: Penny (Front)') 
                : (isRtl ? 'الكتابة: بيني (الخلفية)' : 'Tails: Penny (Back)'))}
        </div>
      </div>

      {/* AI Assistant Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
            {isRtl ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
          </h3>
          <span className="text-primary font-label-md bg-primary/10 px-3 py-1 rounded-full text-xs font-bold">
            {isRtl ? 'نشط الآن' : 'Active Now'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tips && tips.length > 0 ? (
            tips.slice(0, 3).map((tip, idx) => {
              const getBilingualTip = (tItem) => {
                const isAr = lang === 'ar';
                let title = tItem.title;
                let message = tItem.message;

                if (isAr) {
                  if (tItem.title === 'Low Utility Subscription detected') {
                    title = 'تم رصد اشتراك منخفض الفائدة';
                    message = tItem.message
                      .replace('Your subscription to', 'اشتراكك في')
                      .replace('is flagged with low utility score', 'تم تحديده كمنخفض الفائدة بمعدل')
                      .replace('Consider cancelling it to save funds.', 'نقترح إلغاءه لتوفير الأموال.')
                      .replace('USD/mo', 'دولار/شهرياً');
                  } else if (tItem.title === 'High Dining/Grocery Spending') {
                    title = 'ارتفاع مصاريف المطاعم والأغذية';
                    message = tItem.message
                      .replace('Your food and dining expenses comprise', 'مصاريف الأطعمة والمطاعم تشكل')
                      .replace('of your total spending. Cooking at home twice more per week could save up to $150/month.', 'من إجمالي صرفك. الطبخ في المنزل مرتين إضافيتين أسبوعياً قد يوفر لك حتى 150 دولار/شهر.');
                  } else if (tItem.title === 'Frequent Micro-Transactions') {
                    title = 'معاملات صغيرة متكررة (تسريب مالي)';
                    message = tItem.message
                      .replace('You visited', 'لقد قمت بزيارة')
                      .replace('frequently. Cutting back on micro-transactions can save about $50/month.', 'بشكل متكرر. التقليل من المعاملات الصغيرة يمكن أن يوفر حوالي 50 دولار/شهر.');
                  } else if (tItem.title === 'Automated Micro-Savings') {
                    title = 'الادخار التلقائي المصغر';
                    message = 'حاول تقريب مبالغ عمليات النقل والمواصلات وتحويل الفائض إلى هدف ادخار صندوق الطوارئ.';
                  }
                }
                return { title, message };
              };

              const { title, message } = getBilingualTip(tip);
              const isWarning = tip.type === 'warning';
              const isLeak = tip.type === 'leak';
              
              let bgClass = "glass-card custom-shadow p-4 rounded-xl flex gap-4 items-start";
              let icon = "lightbulb";
              let iconBg = "bg-primary/20 flex items-center justify-center shrink-0 text-primary";
              
              if (isWarning) {
                icon = "auto_awesome";
                iconBg = "bg-primary flex items-center justify-center shrink-0 text-white";
              } else if (isLeak) {
                bgClass += " bg-surface-container-low/50";
                icon = "query_stats";
                iconBg = "bg-secondary flex items-center justify-center shrink-0 text-white";
              } else {
                bgClass += " bg-primary/5";
                icon = "lightbulb";
                iconBg = "bg-primary/20 flex items-center justify-center shrink-0 text-primary";
              }
              
              return (
                <div 
                  key={idx} 
                  className={bgClass} 
                  style={{ 
                    borderRightWidth: isWarning ? '4px' : undefined, 
                    borderRightColor: isWarning ? 'var(--accent-cyan)' : undefined 
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-on-surface-variant">{title}</div>
                    <p className="font-body-md text-sm text-on-surface leading-normal">
                      {message}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-center text-xs text-on-surface-variant py-4">
              {isRtl ? 'تحميل النصائح المالية الذكية...' : 'Loading smart financial advice...'}
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Financial Visualizations */}
      {(() => {
        // Gather real weekly data if available
        const txList = Array.isArray(transactions) ? transactions : [];
        const days = [];
        const dayLabels = [];
        const locale = isRtl ? 'ar-SA' : 'en-US';
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const yyyymmdd = d.toISOString().substring(0, 10);
          days.push(yyyymmdd);
          const label = d.toLocaleDateString(locale, { weekday: 'short' });
          dayLabels.push({ yyyymmdd, label });
        }

        const weeklyData = dayLabels.map(dl => ({ day: dl.label, amount: 0 }));
        
        const spendingMap = {};
        days.forEach(day => { spendingMap[day] = 0; });
        let hasRealWeekly = false;
        txList.forEach(t => {
          const isDebit = t.type === 'debit' || t.amount < 0;
          if (isDebit) {
            const tDate = t.date ? t.date.substring(0, 10) : '';
            if (spendingMap[tDate] !== undefined) {
              spendingMap[tDate] += Math.abs(t.amount);
              hasRealWeekly = true;
            }
          }
        });

        const finalWeeklyData = hasRealWeekly 
          ? dayLabels.map(dl => ({ day: dl.label, amount: spendingMap[dl.yyyymmdd] }))
          : weeklyData;

        const maxSpending = Math.max(...finalWeeklyData.map(d => d.amount), 100);

        // Wealth Growth calculations
        const uniqueMonths = Array.from(new Set(txList.map(t => t.date ? t.date.substring(0, 7) : ''))).filter(Boolean).sort();
        while (uniqueMonths.length < 5) {
          const first = uniqueMonths[0] || '2026-06';
          const d = new Date(first + '-01');
          d.setMonth(d.getMonth() - 1);
          uniqueMonths.unshift(d.toISOString().substring(0, 7));
        }
        
        const baseBalance = stats && stats.balance !== undefined && stats.balance !== null ? stats.balance : 0;
        const hasRealWealth = txList.length > 0;
        const stocksVal = stocks.reduce((acc, s) => acc + (s.quantity * s.current_price), 0);
        let currentWealth = baseBalance + stocksVal;
        
        const wealthHistory = [];
        let runningWealth = currentWealth;
        const reversedMonths = [...uniqueMonths].reverse();
        
        reversedMonths.forEach((m, idx) => {
          const monthTx = txList.filter(t => t.date && t.date.substring(0, 7) === m);
          let netChange = 0;
          monthTx.forEach(t => {
            if (t.type === 'credit' || t.amount > 0) netChange += Math.abs(t.amount);
            else netChange -= Math.abs(t.amount);
          });
          
          const dateObj = new Date(m + '-02');
          const label = dateObj.toLocaleDateString(locale, { month: 'short' });
          
          wealthHistory.push({ month: label, date: m, wealth: runningWealth });
          runningWealth -= netChange;
        });
        const finalWealthData = wealthHistory.reverse();

        const wealthValues = finalWealthData.map(d => d.wealth);
        const minWealth = Math.min(...wealthValues) * 0.9;
        const maxWealth = Math.max(...wealthValues) * 1.1;

        const linePath = finalWealthData.map((d, i) => {
          const x = 50 + i * (430 / (finalWealthData.length - 1));
          const yRatio = (maxWealth - minWealth) > 0 ? (d.wealth - minWealth) / (maxWealth - minWealth) : 0.5;
          const y = 170 - yRatio * 130;
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const areaPath = (() => {
          if (finalWealthData.length === 0) return '';
          const points = finalWealthData.map((d, i) => {
            const x = 50 + i * (430 / (finalWealthData.length - 1));
            const yRatio = (maxWealth - minWealth) > 0 ? (d.wealth - minWealth) / (maxWealth - minWealth) : 0.5;
            const y = 170 - yRatio * 130;
            return `${x},${y}`;
          });
          const firstX = 50;
          const lastX = 50 + (finalWealthData.length - 1) * (430 / (finalWealthData.length - 1));
          return `M ${firstX} 170 L ${points.join(' L ')} L ${lastX} 170 Z`;
        })();

        return (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Weekly Spending Bar Chart Card */}
            <div className="glass-card custom-shadow p-5 rounded-3xl bg-surface border border-outline-variant/50 relative">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">
                    {isRtl ? 'الإنفاق الأسبوعي' : 'Weekly Spending'}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant">
                    {isRtl ? 'إجمالي المصاريف اليومية لآخر ٧ أيام' : 'Total daily expenses for the last 7 days'}
                  </p>
                </div>
                
                <button 
                  onClick={() => setShowWeeklySpending(!showWeeklySpending)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                    showWeeklySpending 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {showWeeklySpending ? 'visibility' : 'visibility_off'}
                  </span>
                  {isRtl ? 'عرض المخطط' : 'Toggle Chart'}
                </button>
              </div>
              
              <div className="relative h-[200px] w-full flex items-center justify-center" dir="ltr">
                {showWeeklySpending ? (
                  <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                    {!hasRealWeekly && (
                      <text
                        x="260"
                        y="100"
                        textAnchor="middle"
                        className="text-[12px] font-bold opacity-60"
                        style={{ fill: 'var(--text-secondary)' }}
                      >
                        {isRtl ? 'لا توجد مصاريف مسجلة هذا الأسبوع' : 'No expenses recorded this week'}
                      </text>
                    )}
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => (
                      <line 
                        key={idx}
                        x1="40" 
                        y1={170 - r * 130} 
                        x2="480" 
                        y2={170 - r * 130} 
                        stroke="var(--outline-variant)" 
                        strokeWidth="0.5" 
                        strokeDasharray="4 4" 
                      />
                    ))}
                    
                    {/* Bars */}
                    {finalWeeklyData.map((d, i) => {
                      const barW = 30;
                      const gap = (440 - 7 * barW) / 6;
                      const x = 40 + i * (barW + gap);
                      const yRatio = maxSpending > 0 ? d.amount / maxSpending : 0;
                      const height = yRatio * 130;
                      const y = 170 - height;
                      const isHovered = hoveredBar === i;
                      
                      return (
                        <g key={i}>
                          <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={height}
                            rx="4"
                            fill={isHovered ? 'var(--primary)' : 'var(--primary-container)'}
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredBar(i)}
                            onMouseLeave={() => setHoveredBar(null)}
                          />
                          
                          {/* X label */}
                          <text
                            x={x + 15}
                            y="185"
                            textAnchor="middle"
                            className="text-[9px] fill-on-surface-variant font-bold"
                          >
                            {d.day}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="text-xs text-on-surface-variant italic">
                    {isRtl ? 'تم إخفاء المخطط البياني' : 'Chart is hidden'}
                  </div>
                )}
                
                {/* Tooltip */}
                {showWeeklySpending && hoveredBar !== null && (
                  <div 
                    className="absolute bg-surface border border-outline rounded-lg p-2 shadow-md text-[10px] pointer-events-none transition-all duration-150 animate-fade-in z-20"
                    style={{
                      left: `${40 + hoveredBar * (30 + (440 - 7 * 30) / 6) - 15}px`,
                      bottom: `${170 - (finalWeeklyData[hoveredBar].amount / maxSpending) * 130 + 35}px`
                    }}
                  >
                    <div className="font-bold text-on-surface">{finalWeeklyData[hoveredBar].day}</div>
                    <div className="text-primary">{finalWeeklyData[hoveredBar].amount.toLocaleString()} {currencySymbol}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Wealth Growth Line Chart Card */}
            <div className="glass-card custom-shadow p-5 rounded-3xl bg-surface border border-outline-variant/50 relative">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">
                    {isRtl ? 'نمو الثروة الصافية' : 'Net Worth Growth'}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant">
                    {isRtl ? 'تطور الثروة الإجمالية على مدى الأشهر الأخيرة' : 'Overall net worth evolution over recent months'}
                  </p>
                </div>
                
                <button 
                  onClick={() => setShowWealthGrowth(!showWealthGrowth)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                    showWealthGrowth 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {showWealthGrowth ? 'visibility' : 'visibility_off'}
                  </span>
                  {isRtl ? 'عرض المخطط' : 'Toggle Chart'}
                </button>
              </div>
              
              <div className="relative h-[200px] w-full flex items-center justify-center" dir="ltr">
                {showWealthGrowth ? (
                  <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                    {!hasRealWealth && (
                      <text
                        x="260"
                        y="100"
                        textAnchor="middle"
                        className="text-[12px] font-bold opacity-60"
                        style={{ fill: 'var(--text-secondary)' }}
                      >
                        {isRtl ? 'لا توجد بيانات نمو أصول حالية' : 'No net worth growth data yet'}
                      </text>
                    )}
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => (
                      <line 
                        key={idx}
                        x1="50" 
                        y1={170 - r * 130} 
                        x2="480" 
                        y2={170 - r * 130} 
                        stroke="var(--outline-variant)" 
                        strokeWidth="0.5" 
                        strokeDasharray="4 4" 
                      />
                    ))}
                    
                    {/* Area under the line */}
                    <path 
                      d={areaPath} 
                      fill="url(#areaGrad)" 
                      className="transition-all duration-300"
                    />
                    
                    {/* The growth path line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3.5"
                      className="animate-draw-line"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000,
                        animation: 'drawLine 2s ease-out forwards'
                      }}
                    />
                    
                    {/* Points & Interactive circles */}
                    {finalWealthData.map((d, i) => {
                      const x = 50 + i * (430 / (finalWealthData.length - 1));
                      const yRatio = (maxWealth - minWealth) > 0 ? (d.wealth - minWealth) / (maxWealth - minWealth) : 0.5;
                      const y = 170 - yRatio * 130;
                      const isHovered = hoveredPoint === i;
                      
                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 8 : 4}
                            fill="var(--primary)"
                            stroke="white"
                            strokeWidth={isHovered ? 2.5 : 1.5}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredPoint(i)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          
                          {/* X label */}
                          <text
                            x={x}
                            y="185"
                            textAnchor="middle"
                            className="text-[9px] fill-on-surface-variant font-bold"
                          >
                            {d.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="text-xs text-on-surface-variant italic">
                    {isRtl ? 'تم إخفاء المخطط البياني' : 'Chart is hidden'}
                  </div>
                )}
                
                {/* Tooltip */}
                {showWealthGrowth && hoveredPoint !== null && (
                  <div 
                    className="absolute bg-surface border border-outline rounded-lg p-2 shadow-md text-[10px] pointer-events-none transition-all duration-150 animate-fade-in z-20"
                    style={{
                      left: `${50 + hoveredPoint * (430 / (finalWealthData.length - 1)) - 30}px`,
                      bottom: `${170 - ((finalWealthData[hoveredPoint].wealth - minWealth) / (maxWealth - minWealth)) * 130 + 35}px`
                    }}
                  >
                    <div className="font-bold text-on-surface">{finalWealthData[hoveredPoint].month}</div>
                    <div className="text-primary">{Math.round(finalWealthData[hoveredPoint].wealth).toLocaleString()} {currencySymbol}</div>
                  </div>
                )}
              </div>
            </div>

          </section>
        );
      })()}

      {/* Asymmetrical Feature Grid (Management Tools) */}
      <section className="space-y-3">
        <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
          {isRtl ? 'أدوات الإدارة' : 'Management Tools'}
        </h3>
        <div className="flex overflow-x-auto no-scrollbar gap-6 pb-2 md:grid md:grid-cols-12 md:h-72">
          {/* Subscriptions Module */}
          <div 
            onClick={() => onNavigate('subscriptions')}
            className="min-w-[280px] md:col-span-7 bg-on-surface text-white rounded-3xl p-6 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] custom-shadow flex flex-col justify-between"
          >
            <div>
              <span className="material-symbols-outlined text-primary text-4xl mb-3">card_membership</span>
              <h4 className="font-headline-lg text-lg font-bold text-white">
                {isRtl ? 'إدارة الاشتراكات' : 'Subscriptions Manager'}
              </h4>
              <p className="font-body-sm text-xs text-slate-300 max-w-xs mt-1 leading-relaxed">
                {isRtl 
                  ? 'تتبع فواتيرك المتكررة والاشتراكات بشكل منظم ومحلي بالكامل.'
                  : 'Track your recurring bills and subscriptions organized and fully locally.'
                }
              </p>
            </div>
            <div className="flex items-end justify-between z-10">
              <span className="text-xs font-bold text-primary">{isRtl ? 'تحكم محلي كامل' : 'Full Local Control'}</span>
              <span className="material-symbols-outlined group-hover:translate-x-[-8px] transition-transform text-white">arrow_back</span>
            </div>
            {/* Decorative element */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
          </div>

          {/* Simulator Module */}
          <div 
            onClick={() => onNavigate('local-ai')}
            className="min-w-[240px] md:col-span-5 bg-primary text-white rounded-3xl p-6 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] custom-shadow flex flex-col justify-between"
          >
            <div className="z-10">
              <span className="material-symbols-outlined text-white text-3xl mb-3">model_training</span>
              <h4 className="font-headline-md text-md font-bold text-white">
                {isRtl ? 'محاكي الأسواق' : 'Market Simulator'}
              </h4>
              <p className="font-body-sm text-xs text-white/80 mt-1 leading-relaxed">
                {isRtl 
                  ? 'اختبر قراراتك المالية في بيئة افتراضية قبل التنفيذ الحقيقي.'
                  : 'Test your financial decisions in a virtual sandbox before executing them for real.'
                }
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm z-10">
              <div className="flex justify-between items-center text-xs">
                <span>{isRtl ? 'دقة التوقع' : 'Prediction Accuracy'}</span>
                <span className="font-bold">94%</span>
              </div>
              <div className="w-full bg-white/20 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-white h-full rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Small Option List below Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div 
            onClick={() => onNavigate('local-ai')}
            className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3 hover:border-primary transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">insights</span>
            </div>
            <div>
              <h5 className="font-body-md font-bold text-sm text-on-surface">{isRtl ? 'توقعات النمو' : 'Growth Forecasts'}</h5>
              <p className="font-label-md text-[10px] text-on-surface-variant">{isRtl ? 'تحليل الذكاء الاصطناعي للأسبوع القادم' : 'AI analysis for the coming week'}</p>
            </div>
            <span className="material-symbols-outlined mr-auto opacity-0 group-hover:opacity-100 transition-opacity text-sm">chevron_left</span>
          </div>

          <div 
            onClick={() => onNavigate('savings')}
            className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3 hover:border-primary transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">security</span>
            </div>
            <div>
              <h5 className="font-body-md font-bold text-sm text-on-surface">{isRtl ? 'إدارة المخاطر' : 'Risk Management'}</h5>
              <p className="font-label-md text-[10px] text-on-surface-variant">{isRtl ? 'تقييم استقرار الأصول الحالية' : 'Stability score of assets'}</p>
            </div>
            <span className="material-symbols-outlined mr-auto opacity-0 group-hover:opacity-100 transition-opacity text-sm">chevron_left</span>
          </div>

          <div 
            onClick={() => onNavigate('subscriptions')}
            className="bg-surface border border-outline-variant rounded-xl p-3 flex items-center gap-3 hover:border-primary transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 bg-tertiary/10 rounded-lg flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <div>
              <h5 className="font-body-md font-bold text-sm text-on-surface">{isRtl ? 'أتمتة الزكاة' : 'Zakat Ledger'}</h5>
              <p className="font-label-md text-[10px] text-on-surface-variant">{isRtl ? 'الحساب التلقائي والزكاة والضرائب' : 'Automatic Zakat and tax tracker'}</p>
            </div>
            <span className="material-symbols-outlined mr-auto opacity-0 group-hover:opacity-100 transition-opacity text-sm">chevron_left</span>
          </div>
        </div>
      </section>

      {/* Recent Activity & Market Moves */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Timeline - Left Column */}
        <div className="md:col-span-8 space-y-3">
          <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
            {isRtl ? 'آخر التحركات' : 'Recent Timeline'}
          </h3>
          <div className="space-y-0 relative pr-4 pl-4">
            {recentMoves.length === 0 ? (
              <p className="text-sm text-on-surface-variant p-4 text-center">
                {isRtl ? 'لا توجد عمليات مسجلة حالياً.' : 'No recent operations recorded.'}
              </p>
            ) : (
              recentMoves.map((tItem, index) => {
                const isExpense = tItem.amount < 0;
                return (
                  <div key={tItem.id || index} className="relative flex gap-5 pb-6 last:pb-0 group">
                    {/* Line connection */}
                    <div className={`absolute top-10 bottom-0 w-[2px] bg-outline-variant group-last:hidden ${isRtl ? 'right-[19px]' : 'left-[19px]'}`}></div>
                    {/* Bullet circle */}
                    <div className={`relative z-10 w-9 h-9 rounded-full bg-surface border-2 ${isExpense ? 'border-secondary' : 'border-primary'} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined ${isExpense ? 'text-secondary' : 'text-primary'} text-lg`}>
                        {isExpense ? 'shopping_cart' : 'payments'}
                      </span>
                    </div>
                    {/* Details content */}
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-body-md font-bold text-sm text-on-surface">{tItem.description}</h4>
                          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                            {isRtl 
                              ? `${isExpense ? 'خصم بقيمة' : 'إيداع بقيمة'} ${Math.abs(tItem.amount).toLocaleString()} ريال` 
                              : `${isExpense ? 'Debited' : 'Deposited'} $${Math.abs(tItem.amount).toLocaleString()}`
                            }
                          </p>
                        </div>
                        <span className="font-label-md text-xs text-on-surface-variant">{tItem.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Market Watch - Right Column */}
        <div className="md:col-span-4 space-y-3">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4">
            <h3 className="font-label-md text-xs text-on-surface-variant mb-4 uppercase tracking-widest font-semibold">
              {isRtl ? 'مؤشرات السوق' : 'Market Watch'}
            </h3>
            
            <div className="space-y-3">
              {stocks && stocks.length > 0 ? (
                stocks.map(s => {
                  const isPositive = s.pnlPct >= 0;
                  const displaySymbol = s.symbol === '2222' ? 'ARA' : s.symbol.toUpperCase();
                  return (
                    <div key={s.id || s.symbol} className="flex items-center justify-between p-2 hover:bg-surface-variant/20 rounded-lg transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {displaySymbol}
                        </div>
                        <div>
                          <div className="font-body-sm font-bold text-sm text-on-surface">{s.name}</div>
                          <div className="font-label-md text-[10px] text-on-surface-variant">
                            {isRtl ? 'سعر السهم' : 'Stock Price'}
                          </div>
                        </div>
                      </div>
                      <div className={`${isRtl ? 'text-left' : 'text-right'} font-sans`}>
                        <div className="font-body-sm font-bold text-sm text-on-surface">{s.current_price.toFixed(2)}</div>
                        <div className={`font-label-md text-xs font-bold ${isPositive ? 'text-primary' : 'text-error'}`}>
                          {isPositive ? '+' : ''}{s.pnlPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-on-surface-variant py-2">
                  {isRtl ? 'لا توجد أسهم للمتابعة' : 'No stocks to watch'}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-outline-variant">
              <button 
                onClick={() => onNavigate('stocks')}
                className="w-full text-center text-primary font-label-md text-xs font-bold py-1.5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                {isRtl ? 'إدارة قائمة المتابعة' : 'Manage Watchlist'}
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Floating Action Button (Contextual) */}
      <div className={`fixed bottom-20 ${isRtl ? 'left-6' : 'right-6'} z-50`}>
        <button 
          onClick={() => onNavigate('transactions')}
          className="w-14 h-14 bg-primary text-white rounded-full custom-shadow flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
        >
          <span className="material-symbols-outlined text-2xl text-white">add</span>
        </button>
      </div>

    </div>
  );
}

export default Dashboard;

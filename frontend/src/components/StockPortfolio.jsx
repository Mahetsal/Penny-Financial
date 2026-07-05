import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlusCircle, RefreshCw, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { apiFetch } from '../utils/api';

function StockPortfolio({ lang, t }) {
  const [portfolio, setPortfolio] = useState([]);
  const [localPrices, setLocalPrices] = useState({});
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [curPrice, setCurPrice] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [cashBalance, setCashBalance] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [toggleStocks, setToggleStocks] = useState(true);
  const [toggleCash, setToggleCash] = useState(true);
  const [toggleSavings, setToggleSavings] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/stocks');
      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCash = async () => {
    try {
      const res = await apiFetch('/api/open-banking/accounts');
      const data = await res.json();
      const sum = data.reduce((acc, curr) => acc + curr.balance, 0);
      setCashBalance(sum);
    } catch (err) {
      console.error('Failed to fetch cash balance:', err);
    }
  };

  const fetchSavings = async () => {
    try {
      const res = await apiFetch('/api/savings');
      const data = await res.json();
      const sum = data.reduce((acc, curr) => acc + (curr.current_amount || 0), 0);
      setSavingsBalance(sum);
    } catch (err) {
      console.error('Failed to fetch savings goals:', err);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchCash();
    fetchSavings();
  }, []);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!symbol || !name || !qty || !buyPrice) return;

    try {
      const res = await apiFetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name,
          quantity: parseFloat(qty),
          purchase_price: parseFloat(buyPrice),
          current_price: parseFloat(curPrice || buyPrice)
        })
      });
      if (res.ok) {
        setSymbol('');
        setName('');
        setQty('');
        setBuyPrice('');
        setCurPrice('');
        setShowAddForm(false);
        fetchPortfolio();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const debounceTimers = useRef({});
  const handleUpdatePrice = useCallback((id, newPrice) => {
    if (!newPrice) return;
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/stocks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_price: parseFloat(newPrice) })
        });
        if (res.ok) {
          await fetchPortfolio();
          setLocalPrices(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);
  }, []);

  const handleDeleteAsset = async (id) => {
    try {
      const res = await apiFetch(`/api/stocks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPortfolio();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isRtl = lang === 'ar';
  const currencyStr = isRtl ? ' ريال' : ' SAR';

  // Translators
  const getAssetName = (stock) => {
    if (!isRtl) return stock.name;
    if (stock.symbol === '1150') return 'مصرف الإنماء';
    if (stock.symbol === '2222') return 'أرامكو السعودية';
    if (stock.symbol === '7010') return 'إس تي سي (stc)';
    if (stock.symbol === '2010') return 'سابك (SABIC)';
    return stock.name;
  };

  // Aggregated totals
  const totalValue = portfolio.reduce((sum, s) => sum + s.currentValue, 0);
  const totalCost = portfolio.reduce((sum, s) => sum + s.costBasis, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isPositivePnL = totalPnL >= 0;

  // Dynamic Asset Allocation
  const stocksValuation = portfolio.reduce((sum, s) => sum + (s.currentValue || s.quantity * s.current_price), 0);
  const totalAssets = stocksValuation + cashBalance + savingsBalance;

  const stocksPct = totalAssets > 0 ? Math.round((stocksValuation / totalAssets) * 100) : 0;
  const savingsPct = totalAssets > 0 ? Math.round((savingsBalance / totalAssets) * 100) : 0;
  const cashPct = totalAssets > 0 ? Math.max(0, 100 - stocksPct - savingsPct) : 0;

  const activeStocksPct = toggleStocks ? stocksPct : 0;
  const activeSavingsPct = toggleSavings ? savingsPct : 0;
  const activeCashPct = toggleCash ? cashPct : 0;

  const stocksStrokeLength = (activeStocksPct / 100) * 251.33;
  const savingsStrokeLength = (activeSavingsPct / 100) * 251.33;
  const cashStrokeLength = (activeCashPct / 100) * 251.33;

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* Header Section */}
      <section className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
            {isRtl ? 'المحفظة الاستثمارية' : 'Investment Portfolio'}
          </h2>
          <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
            {isRtl 
              ? 'متابعة شاملة وتحليل دقيق لجميع أصولك المالية وعوائدها الاستثمارية.'
              : 'Complete tracker and performance metrics for your financial assets and yields.'
            }
          </p>
        </div>
        <button 
          onClick={fetchPortfolio} 
          className="btn btn-secondary flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant bg-surface"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="text-xs">{isRtl ? 'تحديث' : 'Refresh'}</span>
        </button>
      </section>

      {/* Portfolio Overview Card - Match Stitch Screen C */}
      <section className="glass-card rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider mb-1">
              {isRtl ? 'إجمالي صافي الثروة' : 'TOTAL NET WORTH'}
            </p>
            <h2 className="font-headline-xl text-3xl md:text-4xl text-on-surface font-bold">
              {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xl font-normal text-on-surface-variant mr-1.5">{isRtl ? 'ر.س' : 'SAR'}</span>
            </h2>
          </div>
          <div className={`px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold ${isPositivePnL ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
            <span className="material-symbols-outlined text-[16px]">{isPositivePnL ? 'trending_up' : 'trending_down'}</span>
            <span>{isPositivePnL ? '+' : ''}{totalPnLPct.toFixed(1)}%</span>
          </div>
        </div>
        {/* Simple Growth Chart Bars */}
        <div className="w-full h-20 flex items-end gap-1.5 pt-4">
          <div className="bg-primary/20 w-full h-[40%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary/20 w-full h-[60%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary/20 w-full h-[55%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary/20 w-full h-[75%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary/20 w-full h-[65%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary/30 w-full h-[90%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary/40 w-full h-[85%] rounded-t hover:bg-primary transition-colors cursor-pointer"></div>
          <div className="bg-primary w-full h-[100%] rounded-t shadow-[0_-4px_12px_rgba(0,163,146,0.25)]"></div>
        </div>
      </section>

      {/* Asset Allocation Breakdown - Premium Horizontal Stacked Wealth Card */}
      <section className="glass-card rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-md font-bold text-on-surface">
            {isRtl ? 'توزيع المحفظة والأصول' : 'Asset Allocation Breakdown'}
          </h3>
          <span className="text-xs text-on-surface-variant font-semibold">
            {isRtl ? 'تحليل نسبي للأصول الموزعة' : 'Relative asset distribution ratio'}
          </span>
        </div>

        {/* Unified Horizontal Stacked Allocation Bar */}
        <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner" style={{ background: 'var(--bg-tertiary)', marginTop: '8px' }}>
          {stocksPct > 0 && (
            <div 
              style={{ width: `${stocksPct}%`, backgroundColor: '#00A392' }} 
              className="h-full transition-all duration-500 hover:brightness-105" 
              title={`Stocks: ${stocksPct}%`}
            />
          )}
          {savingsPct > 0 && (
            <div 
              style={{ width: `${savingsPct}%`, backgroundColor: '#ff3b6f' }} 
              className="h-full transition-all duration-500 hover:brightness-105" 
              title={`Savings: ${savingsPct}%`}
            />
          )}
          {cashPct > 0 && (
            <div 
              style={{ width: `${cashPct}%`, backgroundColor: '#4F46E5' }} 
              className="h-full transition-all duration-500 hover:brightness-105" 
              title={`Cash: ${cashPct}%`}
            />
          )}
        </div>

        {/* Detailed Stats Info Columns */}
        <div className="grid grid-cols-3 gap-4 pt-6 mt-2 border-t border-outline-variant/40" style={{ textAlign: isRtl ? 'right' : 'left' }}>
          
          {/* Stocks */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00A392' }}></div>
              <span>{isRtl ? 'الأسهم الاستثمارية' : 'Stock Investments'}</span>
            </div>
            <p className="text-sm font-bold text-on-surface">
              {stocksValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-on-surface-variant mr-1">{isRtl ? 'ر.س' : 'SAR'}</span>
            </p>
            <span className="badge badge-success text-[10px] px-2 py-0.5" style={{ display: 'inline-block', backgroundColor: 'rgba(0, 163, 146, 0.1)', color: '#00A392', border: '1px solid rgba(0, 163, 146, 0.2)', borderRadius: '6px' }}>
              {stocksPct}%
            </span>
          </div>

          {/* Savings */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff3b6f' }}></div>
              <span>{isRtl ? 'أهداف الادخار' : 'Savings Goals'}</span>
            </div>
            <p className="text-sm font-bold text-on-surface">
              {savingsBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-on-surface-variant mr-1">{isRtl ? 'ر.س' : 'SAR'}</span>
            </p>
            <span className="badge text-[10px] px-2 py-0.5" style={{ display: 'inline-block', backgroundColor: 'rgba(255, 59, 111, 0.1)', color: '#ff3b6f', border: '1px solid rgba(255, 59, 111, 0.2)', borderRadius: '6px' }}>
              {savingsPct}%
            </span>
          </div>

          {/* Cash */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4F46E5' }}></div>
              <span>{isRtl ? 'النقد السائل' : 'Liquid Cash'}</span>
            </div>
            <p className="text-sm font-bold text-on-surface">
              {cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-on-surface-variant mr-1">{isRtl ? 'ر.س' : 'SAR'}</span>
            </p>
            <span className="badge text-[10px] px-2 py-0.5" style={{ display: 'inline-block', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '6px' }}>
              {cashPct}%
            </span>
          </div>

        </div>
      </section>

      {/* Investment List - Match Stitch Screen C card design */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
            {isRtl ? 'قائمة الاستثمارات' : 'Investments List'}
          </h3>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-primary font-label-md hover:underline font-bold text-xs flex items-center gap-1"
          >
            {showAddForm ? (isRtl ? 'إغلاق النموذج' : 'Close Form') : (isRtl ? '+ تسجيل أصل جديد' : '+ Register New Asset')}
          </button>
        </div>

        {/* Add Asset Form Card */}
        {showAddForm && (
          <div className="glass-card rounded-2xl p-6 shadow-sm animate-fade-in max-w-lg">
            <h4 className="font-headline-md text-md font-bold mb-4 text-on-surface">{isRtl ? 'تسجيل أصل استثماري' : 'Register Investment Asset'}</h4>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="form-label text-xs font-semibold text-on-surface-variant mb-1 block">{isRtl ? 'الرمز' : 'Symbol'}</label>
                  <input
                    type="text"
                    className="form-input text-sm p-2 w-full rounded-lg"
                    placeholder="e.g. 2222, AAPL"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label text-xs font-semibold text-on-surface-variant mb-1 block">{isRtl ? 'اسم الأصل' : 'Asset Name'}</label>
                  <input
                    type="text"
                    className="form-input text-sm p-2 w-full rounded-lg"
                    placeholder="e.g. Saudi Aramco"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs font-semibold text-on-surface-variant mb-1 block">{isRtl ? 'الكمية' : 'Quantity'}</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input text-sm p-2 w-full rounded-lg"
                    placeholder="100"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label text-xs font-semibold text-on-surface-variant mb-1 block">{isRtl ? 'سعر الشراء' : 'Purchase Price'}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input text-sm p-2 w-full rounded-lg"
                    placeholder="32.5"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-on-surface-variant mb-1 block">{isRtl ? 'السعر الحالي (اختياري)' : 'Current Price (Optional)'}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input text-sm p-2 w-full rounded-lg"
                  placeholder="31.40"
                  value={curPrice}
                  onChange={(e) => setCurPrice(e.target.value)}
                />
              </div>

              <button type="submit" className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-95 transition-all shadow-md active:scale-98">
                <PlusCircle size={16} />
                <span>{isRtl ? 'إضافة المحفظة' : 'Add to Portfolio'}</span>
              </button>
            </form>
          </div>
        )}

        {/* List Items */}
        <div className="space-y-3">
          {portfolio.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-on-surface-variant text-sm">
              {isRtl ? 'لا توجد استثمارات مسجلة حالياً.' : 'No investments registered yet.'}
            </div>
          ) : (
            portfolio.map(s => {
              const isProfit = s.pnl >= 0;
              return (
                <div 
                  key={s.id} 
                  className="glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-surface-container-low/50 transition-all duration-150 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center font-bold text-xs text-on-surface-variant group-hover:bg-surface transition-colors uppercase">
                      {s.symbol}
                    </div>
                    <div>
                      <p className="font-body-md font-bold text-sm text-on-surface">{getAssetName(s)}</p>
                      <p className="font-label-md text-xs text-on-surface-variant mt-0.5">
                        {isRtl 
                          ? `${s.quantity} سهم • سعر الشراء ${s.purchase_price.toFixed(2)} ر.س`
                          : `${s.quantity} shares • Avg Cost $${s.purchase_price.toFixed(2)}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-left font-sans flex items-center gap-6">
                    {/* Live price input */}
                    <div className="hidden sm:block">
                      <label className="text-[9px] text-on-surface-variant block text-right pr-1 mb-0.5">{isRtl ? 'تعديل السعر' : 'Edit Price'}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="bg-surface border border-outline-variant rounded px-2 py-0.5 text-xs text-on-surface w-20 text-center"
                        value={localPrices[s.id] !== undefined ? localPrices[s.id] : s.current_price}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalPrices(prev => ({ ...prev, [s.id]: val }));
                          handleUpdatePrice(s.id, val);
                        }}
                      />
                    </div>
                    
                    {/* Totals */}
                    <div className="text-left">
                      <p className="font-body-md font-bold text-sm text-on-surface">
                        {s.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{currencyStr}
                      </p>
                      <p className={`font-label-md text-xs font-bold mt-0.5 ${isProfit ? 'text-primary' : 'text-red-500'}`}>
                        {isProfit ? '+' : ''}{s.pnlPct.toFixed(1)}% {isRtl ? 'اليوم' : 'Today'}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button 
                      onClick={() => handleDeleteAsset(s.id)}
                      className="p-1 rounded-full text-on-surface-variant/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title={isRtl ? 'حذف الأصل' : 'Delete Asset'}
                    >
                      <span className="material-symbols-outlined text-md">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Shariah-Compliance Guidelines Info Box */}
      <section className="glass-card rounded-2xl p-5 border border-outline-variant flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary animate-pulse" />
          <h4 className="font-headline-md text-sm font-bold text-on-surface">{isRtl ? '🕋 إرشادات الفحص الشرعي المالي' : '🕋 Shariah Compliance Filtering'}</h4>
        </div>
        <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
          {isRtl 
            ? 'يقوم تطبيق موجة تلقائياً بفحص الأسهم المضافة استناداً لمعايير الهيئات الشرعية المعتمدة (مثل هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية AAOIFI)، حيث يتم التحقق من ألا تتجاوز نسبة الديون/القيمة السوقية للشركة نسبة ٣٣٪، وألا يتجاوز الدخل غير المطهر نسبة ٥٪ من إجمالي الأرباح.'
            : 'Mawjah AI automatically audits registered stock assets based on AAOIFI Shariah metrics, verifying that debt-to-market-cap stays below 33% and impure income remains under 5% of gross revenues.'
          }
        </p>
      </section>

    </div>
  );
}

export default StockPortfolio;

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function AdminPanel({ lang, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isRtl = lang === 'ar';

  useEffect(() => {
    apiFetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99990,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'linear-gradient(145deg, #0A1628, #111E35)',
        border: '1px solid rgba(192,120,48,0.20)',
        borderRadius: '24px', padding: '28px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#EEF2FF' }}>
              {isRtl ? 'لوحة المشرف' : 'Admin Analytics'}
            </h2>
            <p style={{ fontSize: '12px', color: '#9BAECF', marginTop: '2px' }}>
              {isRtl ? 'بيانات سلوك المستخدمين' : 'User behavior analytics'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9BAECF', cursor: 'pointer', fontSize: '22px' }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#9BAECF', padding: '40px' }}>
            {isRtl ? 'جاري تحميل البيانات...' : 'Loading analytics...'}
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', color: '#ef4444', padding: '40px' }}>
            {isRtl ? 'تعذر تحميل البيانات' : 'Failed to load analytics'}
          </div>
        ) : (
          <>
            {/* Total Events */}
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(192,120,48,0.08)', border: '1px solid rgba(192,120,48,0.20)' }}>
              <div style={{ fontSize: '11px', color: '#9BAECF', fontWeight: 600 }}>{isRtl ? 'إجمالي الأحداث' : 'TOTAL EVENTS'}</div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#C07830', marginTop: '4px' }}>{data.totalEvents.toLocaleString()}</div>
            </div>

            {/* Tab Counts */}
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#EEF2FF', marginBottom: '12px' }}>{isRtl ? 'زيارات التبويبات' : 'Tab Visits'}</div>
              {Object.entries(data.tabCounts || {}).length === 0 ? (
                <div style={{ fontSize: '12px', color: '#5D7099' }}>{isRtl ? 'لا توجد بيانات بعد' : 'No data yet'}</div>
              ) : (
                Object.entries(data.tabCounts).sort((a,b)=>b[1]-a[1]).map(([tab, count]) => (
                  <div key={tab} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, fontSize: '12px', color: '#EEF2FF', fontWeight: 600 }}>{tab}</div>
                    <div style={{ flex: 3, height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (count / Math.max(...Object.values(data.tabCounts))) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #C07830, #8B6BB5)', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#9BAECF', fontWeight: 700, width: '24px', textAlign: isRtl ? 'left' : 'right' }}>{count}</div>
                  </div>
                ))
              )}
            </div>

            {/* Top Keywords */}
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#EEF2FF', marginBottom: '12px' }}>{isRtl ? 'أكثر الكلمات بحثاً' : 'Top Keywords'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(data.topKeywords || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#5D7099' }}>{isRtl ? 'لا توجد بيانات' : 'No keywords yet'}</div>
                ) : (
                  data.topKeywords.slice(0, 15).map(({keyword, count}) => (
                    <span key={keyword} style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      background: 'rgba(139,107,181,0.15)', border: '1px solid rgba(139,107,181,0.25)',
                      color: '#8B6BB5'
                    }}>{keyword} ({count})</span>
                  ))
                )}
              </div>
            </div>

            {/* Hourly Activity */}
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#EEF2FF', marginBottom: '12px' }}>{isRtl ? 'نشاط بالساعة' : 'Hourly Activity'}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px' }}>
                {data.hourCounts.map((count, hour) => {
                  const maxVal = Math.max(...data.hourCounts, 1);
                  const heightPct = (count / maxVal) * 100;
                  return (
                    <div key={hour} title={`${hour}:00 — ${count} events`} style={{
                      flex: 1, borderRadius: '3px 3px 0 0',
                      height: `${Math.max(4, heightPct)}%`,
                      background: heightPct > 60 ? '#C07830' : heightPct > 30 ? 'rgba(192,120,48,0.6)' : 'rgba(255,255,255,0.12)',
                      transition: 'height 0.5s ease',
                      cursor: 'default',
                    }} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '9px', color: '#5D7099' }}>12AM</span>
                <span style={{ fontSize: '9px', color: '#5D7099' }}>12PM</span>
                <span style={{ fontSize: '9px', color: '#5D7099' }}>11PM</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Shield, Server, Cpu, Database, Award, CheckCircle } from 'lucide-react';

function TechShowcase({ lang }) {
  const isRtl = lang === 'ar';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Privacy First Panel */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)', border: '1px solid var(--border-glass)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield color="var(--accent-cyan)" size={20} />
          <span>{isRtl ? 'الخصوصية أولاً — معالجة محلية 100%' : 'Privacy First — 100% On-Device'}</span>
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {isRtl
            ? 'تطبيق بيني مبني على حماية البيانات بالكامل. كافة التحليلات المالية، وتصنيف النصوص بالذكاء الاصطناعي، وقواعد البيانات تعمل بشكل محلي بالكامل على هاتفك دون إرسال أي بايت واحد إلى السحابة.'
            : 'Penny AI is built with privacy at its core. All financial calculations, NLU classification, and database storage run fully locally on your device. Zero bytes leave your phone to the cloud.'}
        </p>
      </div>

      {/* Architecture Diagram */}
      <div className="glass-panel" style={{ border: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          {isRtl ? 'هيكلية النظام التقني' : 'System Architecture'}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{isRtl ? 'واجهة المستخدم والمحرك المحلي' : 'React Frontend & Local NLU'}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{isRtl ? 'تحليل القصد واستخراج المعاملات' : 'Intent Classification & Entity Parser'}</div>
            </div>
          </div>
          
          {/* Arrow */}
          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--accent-cyan)', margin: '-6px 0', fontWeight: 'bold' }}>↓</div>

          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <Server size={18} color="var(--accent-blue)" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{isRtl ? 'منفّذ الإجراءات المالي' : 'Financial Action Executor'}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{isRtl ? 'التحقق الآمن وطلب التأكيد من العميل' : 'Safe validation & user confirmation prompt'}</div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--accent-blue)', margin: '-6px 0', fontWeight: 'bold' }}>↓</div>

          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <Database size={18} color="var(--accent-pink)" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{isRtl ? 'قاعدة البيانات المشفرة محلياً' : 'Local Encrypted SQLite DB'}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{isRtl ? 'تخزين مشفر محلي بالكامل' : '100% offline relational database'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack Badges */}
      <div className="glass-panel" style={{ border: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
          {isRtl ? 'التقنيات المستخدمة' : 'Technologies Used'}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['React', 'Capacitor', 'SQLite', 'Vanilla CSS', 'ONNX-free', 'WASM-free', 'Express', 'Express-Capacitor Bridge'].map((tech) => (
            <span key={tech} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-cyan)', backgroundColor: 'var(--accent-cyan-light)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--accent-cyan)' }}>
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* SAMA Compliance Badge */}
      <div className="glass-panel" style={{ border: '1px solid #d97706', backgroundColor: 'rgba(217, 119, 6, 0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Award size={32} color="#d97706" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '2px' }}>
            {isRtl ? 'مطابق للأنظمة البنكية المفتوحة (SAMA)' : 'SAMA Open Banking Compliant'}
          </h4>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {isRtl
              ? 'مبني وفقاً لمعايير البنك المركزي السعودي للخدمات المصرفية المفتوحة لضمان أعلى مستويات الأمان ومزامنة الحسابات بكفاءة.'
              : 'Designed in compliance with the Saudi Central Bank Open Banking Framework rules to guarantee top security and efficient syncing.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TechShowcase;

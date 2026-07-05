import React, { useState } from 'react';

export default function CardDesign({ profile, lang }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isRtl = lang === 'ar';

  const styles = {
    perspectiveContainer: {
      perspective: '1000px',
      width: '320px',
      height: '190px',
      cursor: 'pointer',
      margin: '0 auto',
    },
    cardInner: {
      position: 'relative',
      width: '100%',
      height: '100%',
      textAlign: 'center',
      transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      transformStyle: 'preserve-3d',
      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    },
    cardFace: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      borderRadius: '20px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 12px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      border: '1px solid rgba(192, 120, 48, 0.25)',
      overflow: 'hidden',
    },
    cardFront: {
      background: 'linear-gradient(135deg, #060D18 0%, #0F1D33 55%, #182C4C 100%)',
    },
    cardBack: {
      background: 'linear-gradient(135deg, #0A1628 0%, #111E35 100%)',
      transform: 'rotateY(180deg)',
      padding: '20px 0 20px 0',
      justifyContent: 'flex-start',
      gap: '16px'
    },
    patternOverlay: {
      position: 'absolute',
      inset: 0,
      opacity: 0.05,
      backgroundImage: `radial-gradient(circle at 20% 20%, #C07830 0%, transparent 60%), 
                        radial-gradient(circle at 80% 80%, #8B6BB5 0%, transparent 60%)`,
      pointerEvents: 'none'
    },
    brandLogo: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      fontFamily: "'IBM Plex Sans Arabic', sans-serif",
      color: '#C07830',
      lineHeight: 1.1,
    },
    chip: {
      width: '38px',
      height: '28px',
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #ECC380 0%, #C09040 100%)',
      position: 'relative',
      border: '1px solid rgba(0,0,0,0.15)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
    },
    number: {
      fontSize: '19px',
      letterSpacing: '3px',
      color: '#F3F4F6',
      fontFamily: "'Courier New', Courier, monospace",
      fontWeight: 'bold',
      textAlign: 'left',
      marginTop: '20px',
      textShadow: '1px 2px 2px rgba(0,0,0,0.8)'
    },
    holder: {
      fontSize: '11px',
      textTransform: 'uppercase',
      color: '#9BAECF',
      letterSpacing: '1px',
      textAlign: 'left',
    },
    holderVal: {
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#EEF2FF',
      textAlign: 'left',
      marginTop: '2px',
      textShadow: '0 1px 1px rgba(0,0,0,0.4)'
    },
    expiry: {
      fontSize: '10px',
      color: '#9BAECF',
      textAlign: 'right',
    },
    expiryVal: {
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#EEF2FF',
      fontFamily: "'Courier New', Courier, monospace",
      textAlign: 'right',
      marginTop: '2px'
    }
  };

  return (
    <div 
      style={styles.perspectiveContainer}
      onClick={() => setIsFlipped(!isFlipped)}
      title={isRtl ? 'انقر لقلب البطاقة' : 'Click to flip card'}
    >
      <div style={styles.cardInner}>
        
        {/* FRONT */}
        <div style={{ ...styles.cardFace, ...styles.cardFront }}>
          <div style={styles.patternOverlay} />
          
          {/* Header logo & chip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
            <div style={styles.brandLogo}>
              <span style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '0.5px', color: '#00A392' }}>{isRtl ? 'بيني' : 'Penny'}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.85, color: '#EEF2FF' }}>LOCAL WALLET</span>
            </div>
            <div style={styles.chip}>
              {/* Chip metallic lines */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0,0,0,0.2)' }} />
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          {/* Number */}
          <div style={{ ...styles.number, zIndex: 2, color: '#00A392' }}>
            •••• •••• •••• 2026
          </div>

          {/* Footer details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 2 }}>
            <div>
              <div style={styles.holder}>{isRtl ? 'حامل المحفظة' : 'WALLET HOLDER'}</div>
              <div style={styles.holderVal}>{profile?.name || 'Penny User'}</div>
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div>
                <div style={styles.expiry}>{isRtl ? 'الإصدار' : 'ISSUED'}</div>
                <div style={styles.expiryVal}>07/26</div>
              </div>
              {/* Mada / Visa brand logo placeholder */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#00A392', fontFamily: 'sans-serif', fontStyle: 'italic', lineHeight: 1 }}>penny</span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div style={{ ...styles.cardFace, ...styles.cardBack }}>
          {/* Black magnetic strip */}
          <div style={{ width: '100%', height: '36px', background: '#111', marginTop: '10px' }} />
          
          {/* CVV strip */}
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
            <span style={{ fontSize: '8px', color: '#9BAECF', marginBottom: '4px' }}>SECURE OFFLINE SIGNATURE</span>
            <div style={{ display: 'flex', width: '100%', height: '30px', background: '#FFF', borderRadius: '4px', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontStyle: 'italic', color: '#111', fontSize: '13px', marginInlineEnd: '10px' }}>999</span>
            </div>
          </div>

          {/* Terms info */}
          <div style={{ padding: '0 20px', fontSize: '7px', color: '#5D7099', textAlign: 'left', lineHeight: 1.4, marginTop: 'auto' }}>
            This wallet is secure and works entirely offline. All financial data is encrypted and saved strictly on this local device.
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_DURATION = 3000;
const EXIT_ANIMATION_MS = 300;

const typeConfig = {
  success: {
    icon: CheckCircle2,
    color: 'var(--accent-cyan)',
    bgTint: 'rgba(0, 163, 146, 0.12)',
    borderColor: 'rgba(0, 163, 146, 0.25)',
  },
  error: {
    icon: XCircle,
    color: 'var(--accent-pink)',
    bgTint: 'rgba(255, 59, 111, 0.12)',
    borderColor: 'rgba(255, 59, 111, 0.25)',
  },
  info: {
    icon: Info,
    color: 'var(--accent-blue)',
    bgTint: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.25)',
  },
};

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
    }, TOAST_DURATION);

    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (exiting) {
      const exitTimer = setTimeout(() => {
        onRemove(toast.id);
      }, EXIT_ANIMATION_MS);
      return () => clearTimeout(exitTimer);
    }
  }, [exiting, toast.id, onRemove]);

  const config = typeConfig[toast.type] || typeConfig.info;
  const IconComponent = config.icon;

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    maxWidth: '320px',
    width: 'max-content',
    padding: '10px 16px',
    borderRadius: '12px',
    background: config.bgTint,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${config.borderColor}`,
    boxShadow: 'var(--shadow-md)',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    pointerEvents: 'auto',
    animation: exiting
      ? `toastSlideOut ${EXIT_ANIMATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
      : `toastSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
  };

  return (
    <div style={itemStyle}>
      <IconComponent size={16} color={config.color} style={{ flexShrink: 0 }} />
      <span style={{ lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  const containerStyle = {
    position: 'fixed',
    top: '16px',
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastKeyframes />
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return context;
}

/* Inject keyframes once via a tiny style element */
function ToastKeyframes() {
  return (
    <style>{`
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateY(-12px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes toastSlideOut {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-12px) scale(0.96);
        }
      }
    `}</style>
  );
}

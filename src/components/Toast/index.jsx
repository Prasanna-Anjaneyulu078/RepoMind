import React from 'react';
import './index.css';

const Toast = ({ toasts }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-message">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--tertiary-fixed)' }}>
            {toast.icon || 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

export default Toast;

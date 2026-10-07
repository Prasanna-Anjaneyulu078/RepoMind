import React, { useEffect, useRef } from 'react';
import './index.css';

const ErrorModal = ({ isOpen, title, message, onClose, onRetry }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="error-modal-backdrop" onClick={onClose}>
      <div 
        className="error-modal-content" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
      >
        <div className="error-modal-header">
          <div className="error-modal-title-group">
            <span className="material-symbols-outlined error-modal-icon">warning</span>
            <h3 id="error-modal-title">{title}</h3>
          </div>
          <button className="error-modal-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="error-modal-body">
          <p>{message}</p>
        </div>
        <div className="error-modal-footer">
          {onRetry && (
            <button className="btn-error-retry" onClick={() => { onClose(); onRetry(); }} aria-label="Retry request">
              Retry
            </button>
          )}
          <button className="btn-action-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;

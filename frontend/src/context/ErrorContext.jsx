import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ErrorModal from '../components/ErrorModal/index.jsx';
import { apiEventEmitter } from '../utils/apiClient.js';

const ErrorContext = createContext(null);

export const ErrorProvider = ({ children }) => {
  const [errorState, setErrorState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onRetry: null
  });

  const showError = useCallback((normalizedError, retryCallback) => {
    setErrorState(prev => {
      // Deduplicate rapid identical popups
      if (prev.isOpen && prev.title === normalizedError.title && prev.message === normalizedError.message) {
        return prev;
      }
      return {
        isOpen: true,
        title: normalizedError.title,
        message: normalizedError.message,
        onRetry: retryCallback || null
      };
    });
  }, []);

  const closeError = useCallback(() => {
    setErrorState(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleApiError = (e) => {
      showError(e.detail.normalized, e.detail.customRetry);
    };
    apiEventEmitter.addEventListener('apiError', handleApiError);
    return () => apiEventEmitter.removeEventListener('apiError', handleApiError);
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ showError, closeError }}>
      {children}
      <ErrorModal
        isOpen={errorState.isOpen}
        title={errorState.title}
        message={errorState.message}
        onClose={closeError}
        onRetry={errorState.onRetry}
      />
    </ErrorContext.Provider>
  );
};

export const useError = () => useContext(ErrorContext);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ErrorProvider } from './context/ErrorContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorProvider>
  </StrictMode>
);

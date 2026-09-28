import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './i18n/I18nContext';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import { initErrorMonitoring } from './services/errorMonitoringService';
import './index.css';

// Initialize central production error monitoring
initErrorMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AppErrorBoundary fallbackTitle="JIPAS Students Hub Error Recovery">
        <App />
      </AppErrorBoundary>
    </I18nProvider>
  </StrictMode>,
);

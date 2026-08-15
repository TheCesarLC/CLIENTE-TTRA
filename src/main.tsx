import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SiteProvider } from './context/SiteContext';
import { initSecurityShield } from './lib/security';

// Initialize anti-tamper and DevTools protection
initSecurityShield();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteProvider>
      <App />
    </SiteProvider>
  </StrictMode>,
);

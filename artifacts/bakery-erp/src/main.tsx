import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// في الـ production، نستخدم رابط الـ API من متغير البيئة
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
  (window as any).__API_BASE_URL__ = apiUrl;
}

createRoot(document.getElementById('root')!).render(<App />);

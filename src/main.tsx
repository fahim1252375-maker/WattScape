import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('WattScape root element is missing.');

createRoot(rootElement).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);

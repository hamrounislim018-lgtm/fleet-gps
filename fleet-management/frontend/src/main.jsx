import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './i18n';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000
    }
  }
});

// Error boundary to show real errors instead of blank page
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#060d1a', color: '#e2e8f0', minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '16px', padding: '24px', fontFamily: 'monospace'
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ color: '#ef4444', fontSize: '20px', margin: 0 }}>خطأ في التطبيق</h2>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
            padding: '16px', maxWidth: '700px', width: '100%', overflowX: 'auto'
          }}>
            <p style={{ color: '#f87171', margin: 0, whiteSpace: 'pre-wrap', fontSize: '13px' }}>
              {this.state.error?.toString()}
            </p>
            {this.state.error?.stack && (
              <p style={{ color: '#94a3b8', margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: '11px' }}>
                {this.state.error.stack}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#10b981', color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Cairo, Inter, sans-serif' }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

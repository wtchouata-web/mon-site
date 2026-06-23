import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global memory fallback polyfill for localStorage and sessionStorage inside sandboxed iframes
const setupStoragePolyfills = () => {
  const createMockStorage = () => {
    let storage: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem: (key: string, value: string): void => {
        storage[key] = String(value);
      },
      removeItem: (key: string): void => {
        delete storage[key];
      },
      clear: (): void => {
        storage = {};
      },
      key: (index: number): string | null => {
        const keys = Object.keys(storage);
        return keys[index] || null;
      },
      get length(): number {
        return Object.keys(storage).length;
      }
    };
  };

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } catch (e) {
    console.warn("localStorage is not accessible. Injecting mock fallback store.");
    try {
      const mock = createMockStorage();
      Object.defineProperty(window, 'localStorage', {
        value: mock,
        writable: true,
        configurable: true
      });
    } catch (err) {
      console.error("Could not define custom localStorage polyfill:", err);
    }
  }

  try {
    const testKey = '__session_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
  } catch (e) {
    console.warn("sessionStorage is not accessible. Injecting mock fallback store.");
    try {
      const mock = createMockStorage();
      Object.defineProperty(window, 'sessionStorage', {
        value: mock,
        writable: true,
        configurable: true
      });
    } catch (err) {
      console.error("Could not define custom sessionStorage polyfill:", err);
    }
  }
};

setupStoragePolyfills();

// Global error handlers to prevent blank screen and display useful debug info
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #fff5f5; color: #c53030; font-family: monospace; border: 2px solid #feb2b2; margin: 20px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="margin-top: 0; border-bottom: 2px dashed #fecaca; padding-bottom: 8px;">🚨 Erreur de chargement de l'application</h2>
        <p><strong>Message:</strong> ${event.message}</p>
        <p><strong>Fichier:</strong> ${event.filename}:${event.lineno}:${event.colno}</p>
        <pre style="background: #fff; padding: 12px; border: 1px solid #fecaca; border-radius: 4px; overflow-x: auto; font-size: 13px; max-height: 250px;">${event.error?.stack || 'Pas de trace de pile'}</pre>
        <p style="font-size: 12px; color: #742a2a; margin-top: 12px;">Cette erreur empêche l'affichage de l'application.</p>
        <button onclick="try { localStorage.clear(); sessionStorage.clear(); window.location.reload(); } catch(e) { alert('Impossible de vider le cache: ' + e.message); }" style="padding: 10px 16px; background: #c53030; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: sans-serif; transition: background 0.2s;">
          Effacer le Stockage & Réessayer
        </button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #fff5f5; color: #c53030; font-family: monospace; border: 2px solid #feb2b2; margin: 20px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="margin-top: 0; border-bottom: 2px dashed #fecaca; padding-bottom: 8px;">⚠️ Rejet de promesse non géré</h2>
        <p><strong>Raison:</strong> ${event.reason}</p>
        <pre style="background: #fff; padding: 12px; border: 1px solid #fecaca; border-radius: 4px; overflow-x: auto; font-size: 13px;">${event.reason?.stack || 'Pas de trace de pile'}</pre>
        <button onclick="try { localStorage.clear(); sessionStorage.clear(); window.location.reload(); } catch(e) { alert('Impossible de vider le cache: ' + e.message); }" style="padding: 10px 16px; background: #c53030; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: sans-serif; transition: background 0.2s;">
          Effacer le Stockage & Réessayer
        </button>
      </div>
    `;
  }
});

interface SimpleErrorBoundaryProps {
  children: React.ReactNode;
}

interface SimpleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SimpleErrorBoundary extends React.Component<SimpleErrorBoundaryProps, SimpleErrorBoundaryState> {
  constructor(props: SimpleErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): SimpleErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("React Error Boundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fff5f5', color: '#c53030', fontFamily: 'monospace', border: '2px solid #feb2b2', margin: '20px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, borderBottom: '2px dashed #fecaca', paddingBottom: '8px' }}>🚨 Erreur de rendu React</h2>
          <p><strong>Message:</strong> {this.state.error?.message}</p>
          <pre style={{ background: '#fff', padding: '12px', border: '1px solid #fecaca', borderRadius: '4px', overflowX: 'auto', fontSize: '13px', maxHeight: '250px' }}>
            {this.state.error?.stack || 'Pas de trace de pile'}
          </pre>
          <button 
            onClick={() => { 
              try {
                localStorage.clear(); 
                sessionStorage.clear();
                window.location.reload(); 
              } catch (e) {
                alert('Impossible de vider le cache');
              }
            }}
            style={{ padding: '10px 16px', background: '#c53030', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif' }}
          >
            Effacer le Stockage Local & Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SimpleErrorBoundary>
      <App />
    </SimpleErrorBoundary>
  </StrictMode>,
);


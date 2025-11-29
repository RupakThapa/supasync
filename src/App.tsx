import { useState, useEffect, useCallback } from 'react';
import { getSupabaseAccounts, type SupabaseAccount } from './config/supabaseAccounts';
import { pingAccount, type PingStatus } from './services/keepAlive';
import './App.css';

type AccountStatus = 'idle' | 'running' | 'success' | 'error';

interface AccountState {
  account: SupabaseAccount;
  status: AccountStatus;
  message?: string;
}

function App() {
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const [shouldAutoRun, setShouldAutoRun] = useState(false);

  // Load accounts from env on mount
  useEffect(() => {
    const envAccounts = getSupabaseAccounts();
    setAccounts(envAccounts.map(account => ({ account, status: 'idle' })));
    
    // Load last run time from localStorage
    const savedLastRun = localStorage.getItem('keepalive_last_run');
    if (savedLastRun) {
      setLastRun(new Date(savedLastRun));
    }

    // Check if auto-run is requested via URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('run') === 'true') {
      setShouldAutoRun(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const updateAccountStatus = useCallback((accountId: number, status: AccountStatus, message?: string) => {
    setAccounts(prev => prev.map(a => 
      a.account.id === accountId ? { ...a, status, message } : a
    ));
  }, []);

  const runKeepAlive = useCallback(async () => {
    if (accounts.length === 0 || isRunning) return;

    setIsRunning(true);
    setProgress(0);

    // Reset all to running
    setAccounts(prev => prev.map(a => ({ ...a, status: 'running' as AccountStatus, message: undefined })));

    let completed = 0;

    // Process accounts one by one for visual effect
    for (const accountState of accounts) {
      updateAccountStatus(accountState.account.id, 'running');
      
      const result = await pingAccount(accountState.account);
      
      updateAccountStatus(
        accountState.account.id,
        result.status === 'success' ? 'success' : 'error',
        result.message
      );

      completed++;
      setProgress((completed / accounts.length) * 100);
      
      // Small delay between accounts for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const now = new Date();
    setLastRun(now);
    localStorage.setItem('keepalive_last_run', now.toISOString());
    setIsRunning(false);
  }, [accounts, isRunning, updateAccountStatus]);

  // Auto-run when ?run=true was in URL (for cron jobs)
  useEffect(() => {
    if (shouldAutoRun && accounts.length > 0 && !isRunning) {
      const timer = setTimeout(() => {
        runKeepAlive();
        setShouldAutoRun(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoRun, accounts.length, isRunning, runKeepAlive]);

  const getStatusIcon = (status: AccountStatus) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'running': return '◌';
      default: return '○';
    }
  };

  const formatLastRun = () => {
    if (!lastRun) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastRun.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 24) {
      return lastRun.toLocaleDateString() + ' ' + lastRun.toLocaleTimeString();
    }
    if (hours > 0) return `${hours}h ${minutes}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const successCount = accounts.filter(a => a.status === 'success').length;
  const errorCount = accounts.filter(a => a.status === 'error').length;

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <h1>Supabase Keep-Alive</h1>
          </div>
          <p className="subtitle">Keep your free-tier projects active</p>
        </header>

        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <h2>No Accounts Configured</h2>
            <p>Add your Supabase credentials to the <code>.env</code> file:</p>
            <pre className="env-example">
{`VITE_SUPABASE_1_NAME=My Project
VITE_SUPABASE_1_URL=https://xxx.supabase.co
VITE_SUPABASE_1_KEY=your-anon-key

VITE_SUPABASE_2_NAME=Another Project
VITE_SUPABASE_2_URL=https://yyy.supabase.co
VITE_SUPABASE_2_KEY=another-key`}
            </pre>
            <p className="hint">Then restart the dev server</p>
          </div>
        ) : (
          <>
            <div className="stats-bar">
              <div className="stat">
                <span className="stat-number">{accounts.length}</span>
                <span className="stat-label">Accounts</span>
              </div>
              {successCount > 0 && (
                <div className="stat success">
                  <span className="stat-number">{successCount}</span>
                  <span className="stat-label">Success</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="stat error">
                  <span className="stat-number">{errorCount}</span>
                  <span className="stat-label">Failed</span>
                </div>
              )}
              <div className="stat">
                <span className="stat-label">Last run:</span>
                <span className="stat-time">{formatLastRun()}</span>
              </div>
            </div>

            <button
              className={`ping-button ${isRunning ? 'running' : ''}`}
              onClick={runKeepAlive}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <span className="spinner"></span>
                  Running...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Ping All Accounts
                </>
              )}
            </button>

            {isRunning && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-text">{Math.round(progress)}%</span>
              </div>
            )}

            <div className="accounts-list">
              {accounts.map((item, index) => (
                <div 
                  key={item.account.id} 
                  className={`account-row ${item.status}`}
                >
                  <div className="account-number">#{index + 1}</div>
                  <div className={`status-icon ${item.status}`}>
                    {item.status === 'running' ? (
                      <span className="mini-spinner"></span>
                    ) : (
                      getStatusIcon(item.status)
                    )}
                  </div>
                  <div className="account-info">
                    <span className="account-name">{item.account.name}</span>
                    <span className="account-url">
                      {item.account.url.replace('https://', '').replace('.supabase.co', '')}
                    </span>
                  </div>
                  {item.message && item.status === 'error' && (
                    <div className="error-badge" title={item.message}>
                      !
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="instructions">
              <h3>📋 Setup Required</h3>
              <p>Run this SQL in each Supabase project's SQL Editor:</p>
              <pre className="sql-code">
{`CREATE TABLE IF NOT EXISTS _keepalive_ping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ping_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ping_type TEXT DEFAULT 'keepalive',
  metadata JSONB
);

ALTER TABLE _keepalive_ping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON _keepalive_ping 
  FOR ALL TO anon USING (true) WITH CHECK (true);`}
              </pre>
            </div>
          </>
        )}

        <footer className="footer">
          <p>💡 For daily automation, deploy this app and set up a cron job to visit the page</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

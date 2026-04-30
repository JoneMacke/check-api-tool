import React, { useState, useMemo, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const CONSOLE_URL = import.meta.env.VITE_CONSOLE_URL || '';
const QUOTA_PER_USD = Number(import.meta.env.VITE_QUOTA_PER_USD || 500000);

const fmtUsd = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return (Number(n) / QUOTA_PER_USD).toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
};

const fmtDate = (ts) => {
  if (!ts) return '永不过期';
  const d = new Date(Number(ts) * 1000);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-CN', { hour12: false });
};

async function fetchTokenUsage(key) {
  const url = `${API_BASE}/api/usage/token`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${key}`,
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok && res.status !== 304) {
    let detail = '';
    try {
      detail = await res.text();
    } catch (_) {}
    throw new Error(`HTTP ${res.status} ${res.statusText} ${detail}`);
  }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error('响应不是合法 JSON：/api/usage/token 没有命中代理函数，请确认 Vercel 已重新部署最新代码');
  }
  const ok =
    json.code === true ||
    json.code === 'success' ||
    json.code === 1 ||
    json.success === true;
  if (!ok) {
    throw new Error(json.message || json.msg || '查询失败');
  }
  return json.data || json;
}

function Toast({ type = 'error', children, onClose }) {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{type === 'success' ? '✓' : '!'}</span>
      <span>{children}</span>
      <button onClick={onClose} aria-label="close">×</button>
    </div>
  );
}

function MoneyCard({ label, value, note, accent = 'white' }) {
  return (
    <article className={`money-card ${accent}`}>
      <div className="money-label">{label}</div>
      <div className="money-value">{value}</div>
      {note && <div className="money-note">{note}</div>}
    </article>
  );
}

function DetailRow({ label, value, note, accent = 'white' }) {
  return (
    <article className={`detail-row ${accent}`}>
      <div className="avatar">{accent === 'date' ? '⏳' : '💳'}</div>
      <div className="detail-main">
        <h3>{label}</h3>
        {note && <span>{note}</span>}
      </div>
      <div className="detail-value">{value}</div>
    </article>
  );
}

export default function App() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const onQuery = useCallback(async () => {
    const k = key.trim();
    if (!k) {
      showToast('error', '请输入令牌喵～');
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const d = await fetchTokenUsage(k);
      setData(d);
      showToast('success', '查询成功，余额已捕获！');
    } catch (e) {
      showToast('error', e.message || '查询失败');
    } finally {
      setLoading(false);
    }
  }, [key, showToast]);

  const usage = useMemo(() => {
    if (!data) return null;
    const granted = data.total_granted ?? data.totalGranted;
    const used = data.total_used ?? data.totalUsed;
    const available =
      data.total_available ??
      data.totalAvailable ??
      (granted != null && used != null ? granted - used : null);
    const unlimited = data.unlimited_quota ?? data.unlimitedQuota;
    return {
      granted,
      used,
      available,
      unlimited,
      expiresAt: fmtDate(data.expires_at ?? data.expiresAt),
    };
  }, [data]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>令牌查询</h1>
        {CONSOLE_URL && (
          <a className="console-link" href={CONSOLE_URL} target="_blank" rel="noreferrer">
            + 控制台
          </a>
        )}
      </header>

      <section className="search-panel">
        <div className="search-row">
          <input
            id="token-input"
            type="text"
            value={key}
            placeholder="请输入令牌"
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onQuery()}
            spellCheck={false}
          />
          <button className="search-btn" onClick={onQuery} disabled={loading} aria-label="查询">
            {loading ? '查询中' : '查询'}
          </button>
        </div>
        {key && <button className="clear-btn" onClick={() => setKey('')}>清空令牌</button>}
      </section>

      {!data && !loading && (
        <section className="empty-state">
          <button className="empty-query-btn" type="button" onClick={onQuery} aria-label="开始查询">
            开始查询
          </button>
          <p>输入令牌并点击查询，额度信息会显示在这里。</p>
        </section>
      )}

      {loading && <section className="empty-state loading">正在查询令牌额度…</section>}

      {usage && (
        <>
          <section className="overview-section">
            <div className="section-head">
              <h2>额度概览</h2>
            </div>
          <div className="usage-grid">
            <MoneyCard label="总额度" value={usage.unlimited ? '无限额度' : fmtUsd(usage.granted)} accent="teal" />
            <MoneyCard label="剩余额度" value={usage.unlimited ? '无限额度' : fmtUsd(usage.available)} />
          </div>
          </section>

          <section className="details-section">
            <h2>使用详情</h2>
            <div className="details-list">
              <DetailRow label="已使用额度" value={fmtUsd(usage.used)} />
              <DetailRow label="到期时间" value={usage.expiresAt} note="有效期" accent="date" />
            </div>
          </section>
        </>
      )}

      <footer>© {new Date().getFullYear()} check-api-tool</footer>

      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.msg}</Toast>}
    </main>
  );
}

import React, { useState, useMemo, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const CONSOLE_URL = import.meta.env.VITE_CONSOLE_URL || '';
const QUOTA_PER_USD = Number(import.meta.env.VITE_QUOTA_PER_USD || 500000);

const fmtUsd = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return `${(Number(n) / QUOTA_PER_USD).toLocaleString('en-US', {
    maximumFractionDigits: 4,
  })}$`;
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

  const onCopy = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      showToast('success', '已复制完整 JSON');
    } catch {
      showToast('error', '复制失败');
    }
  }, [data, showToast]);

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
      name: data.name || '未命名令牌',
      expiresAt: fmtDate(data.expires_at ?? data.expiresAt),
    };
  }, [data]);

  return (
    <main className="anime-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="star-field" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>

      <header className="topbar">
        <div className="brand-mark">🔑 令牌查询</div>
        {CONSOLE_URL && (
          <a className="console-link" href={CONSOLE_URL} target="_blank" rel="noreferrer">
            前往控制台 ↗
          </a>
        )}
      </header>

      <section className="hero-card">
        <div className="hero-copy">
          <div className="badge">Neko API Key Tool</div>
          <h1>魔法令牌余额查询</h1>
        </div>
        <div className="mascot" aria-hidden="true">
          <div className="cat-ear left" />
          <div className="cat-ear right" />
          <div className="cat-face">ฅ^•ﻌ•^ฅ</div>
          <span>Balance Quest</span>
        </div>
      </section>

      <section className="query-panel">
        <label htmlFor="token-input">召唤令牌</label>
        <div className="input-row">
          <span className="lock">🔮</span>
          <input
            id="token-input"
            type="text"
            value={key}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onQuery()}
            spellCheck={false}
          />
          {key && <button className="ghost-btn" onClick={() => setKey('')}>清空</button>}
          <button className="primary-btn" onClick={onQuery} disabled={loading}>
            {loading ? '占卜中…' : '开始查询'}
          </button>
        </div>
      </section>

      <section className="result-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Result</span>
            <h2>余额卡片</h2>
          </div>
          <button className="copy-btn" onClick={onCopy} disabled={!data}>复制 JSON</button>
        </div>

        {!data && !loading && (
          <div className="empty-state">
            <div>🌙</div>
            <p>等待令牌输入中，查询后会在这里显示美元额度。</p>
          </div>
        )}

        {loading && <div className="empty-state loading">魔法水晶正在读取额度…</div>}

        {usage && (
          <div className="usage-grid">
            <MoneyCard label="总额度" value={usage.unlimited ? '无限额度' : fmtUsd(usage.granted)} note="Total quota" accent="teal" />
            <MoneyCard label="剩余额度" value={usage.unlimited ? '无限额度' : fmtUsd(usage.available)} note="Available" />
            <MoneyCard label="已使用额度" value={fmtUsd(usage.used)} note="Used" />
            <MoneyCard label="到期时间" value={usage.expiresAt} note={usage.name} accent="date" />
          </div>
        )}
      </section>

      <footer>© {new Date().getFullYear()} check-api-tool · made with neko magic</footer>

      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.msg}</Toast>}
    </main>
  );
}

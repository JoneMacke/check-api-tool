import React, { useState, useMemo, useCallback } from 'react';

/**
 * 二次元风格令牌查询前端
 * - 原生 fetch
 * - 同源请求 /api/...，线上由 Vercel Serverless Function 代理到真实后端
 * - 仅突出美元额度，隐藏原始 Token quota 数值
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';
const QUOTA_PER_USD = Number(import.meta.env.VITE_QUOTA_PER_USD || 500000);

const fmt = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-US');
};

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
  // 注意：线上使用无尾斜杠路径，命中 Vercel 函数 api/usage/token.js，避免被静态站点 fallback 成 index.html。
  const url = `${API_BASE}/api/usage/token`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${key}`,
      'Cache-Control': 'no-cache',
    },
  });
  // 上游可能因为 ETag 返回 304；走 cache:'no-store' 后正常应是 200
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
  // 兼容 code: true / "success" / 1
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

function MoneyCard({ label, quota, unlimited, accent = 'pink' }) {
  return (
    <article className={`money-card ${accent}`}>
      <div className="money-label">{label}</div>
      <div className="money-value">{unlimited ? '无限额度' : fmtUsd(quota)}</div>
    </article>
  );
}

function MiniInfo({ label, value, note }) {
  return (
    <div className="mini-info">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <em>{note}</em>}
    </div>
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
    const models = data.model_limits || data.modelLimits || {};
    return {
      granted,
      used,
      available,
      unlimited,
      name: data.name || '未命名令牌',
      expiresAt: fmtDate(data.expires_at ?? data.expiresAt),
      modelText: data.model_limits_enabled || data.modelLimitsEnabled ? '已启用' : '未启用',
      modelNote: Object.keys(models).length ? Object.keys(models).join(', ') : '无模型白名单限制',
    };
  }, [data]);

  return (
    <main className="anime-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="star-field" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>

      <header className="topbar">
        <div className="brand-mark">🔑 令牌查询</div>
        <a className="console-link" href="https://api.katioai.com" target="_blank" rel="noreferrer">
          前往控制台 ↗
        </a>
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
            <MoneyCard label="剩余美元额度" quota={usage.available} unlimited={usage.unlimited} accent="pink" />
            <MoneyCard label="总美元额度" quota={usage.granted} unlimited={usage.unlimited} accent="violet" />
            <MoneyCard label="已使用美元额度" quota={usage.used} unlimited={false} accent="blue" />

            <div className="detail-card">
              <MiniInfo label="令牌名称" value={usage.name} />
              <MiniInfo label="过期时间" value={usage.expiresAt} />
              <MiniInfo label="模型限制" value={usage.modelText} note={usage.modelNote} />
              <MiniInfo label="额度单位" value="美元额度" note="原始 quota 数值已隐藏" />
            </div>
          </div>
        )}
      </section>

      <footer>© {new Date().getFullYear()} check-api-tool · made with neko magic</footer>

      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.msg}</Toast>}
    </main>
  );
}

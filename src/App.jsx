import React, { useState, useMemo, useCallback } from 'react';

/**
 * 极简令牌查询前端
 * - 原生 fetch，零包装
 * - 同源请求 /api/...，由 Vercel rewrite / Nginx 反代到真实后端
 * - 兼容上游响应：{ code: true|"success", data: {...}, message: "ok" }
 */

// 同源（部署后由 vercel.json rewrite 转发到上游）。本地开发时可以在 .env 里覆盖：
//   VITE_API_BASE=https://api.katioai.com
const API_BASE = import.meta.env.VITE_API_BASE || '';

const fmt = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('en-US');
};

const fmtQuota = (n) => {
  // 上游 quota 单位：1 美元 = 500000
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return `$${(Number(n) / 500000).toFixed(4)}`;
};

const fmtDate = (ts) => {
  if (!ts) return '永不过期';
  const d = new Date(Number(ts) * 1000);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-CN', { hour12: false });
};

async function fetchTokenUsage(key) {
  const url = `${API_BASE}/api/usage/token/`;
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
    throw new Error('响应不是合法 JSON，可能 API 地址错误或被反代页面拦截');
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
  const colors = {
    error: { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c', icon: '✕' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', fg: '#166534', icon: '✓' },
  }[type];
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        padding: '10px 18px',
        borderRadius: 10,
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
        fontSize: 14,
        maxWidth: '90vw',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: colors.fg,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
        }}
      >
        {colors.icon}
      </span>
      <span>{children}</span>
      <button
        onClick={onClose}
        style={{
          marginLeft: 8,
          border: 'none',
          background: 'transparent',
          color: colors.fg,
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
        }}
        aria-label="close"
      >
        ×
      </button>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #eef2f7',
        borderRadius: 14,
        padding: '18px 20px',
        flex: '1 1 200px',
        minWidth: 200,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#0f172a' }}>
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
          {hint}
        </div>
      )}
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
      showToast('error', '请输入令牌（sk-xxxx）');
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const d = await fetchTokenUsage(k);
      setData(d);
      showToast('success', '查询成功');
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
      showToast('success', '已复制到剪贴板');
    } catch {
      showToast('error', '复制失败');
    }
  }, [data, showToast]);

  const stats = useMemo(() => {
    if (!data) return null;
    const granted = data.total_granted ?? data.totalGranted;
    const used = data.total_used ?? data.totalUsed;
    const available =
      data.total_available ??
      data.totalAvailable ??
      (granted != null && used != null ? granted - used : null);
    const unlimited = data.unlimited_quota ?? data.unlimitedQuota;
    return [
      {
        label: '令牌名称',
        value: data.name || '-',
      },
      {
        label: '总额度',
        value: unlimited ? '不限' : fmt(granted),
        hint: unlimited ? '无限额度' : fmtQuota(granted),
      },
      {
        label: '已使用',
        value: fmt(used),
        hint: fmtQuota(used),
      },
      {
        label: '剩余可用',
        value: unlimited ? '不限' : fmt(available),
        hint: unlimited ? '无限额度' : fmtQuota(available),
      },
      {
        label: '过期时间',
        value: fmtDate(data.expires_at ?? data.expiresAt),
      },
      {
        label: '模型限制',
        value:
          data.model_limits_enabled || data.modelLimitsEnabled
            ? '已启用'
            : '未启用',
        hint:
          data.model_limits && Object.keys(data.model_limits).length
            ? Object.keys(data.model_limits).join(', ')
            : '无',
      },
    ];
  }, [data]);

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '40px 16px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <header
        style={{
          width: '100%',
          maxWidth: 880,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🔑</span>
          <h1 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>
            令牌查询
          </h1>
        </div>
        <a
          href="https://api.katioai.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#6366f1', textDecoration: 'none', fontSize: 13 }}
        >
          api.katioai.com ↗
        </a>
      </header>

      <section
        style={{
          width: '100%',
          maxWidth: 880,
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          borderRadius: 20,
          padding: '36px 28px',
          color: '#fff',
          boxShadow: '0 20px 50px rgba(99, 102, 241, 0.25)',
        }}
      >
        <h2
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          令牌查询
        </h2>
        <p
          style={{
            textAlign: 'center',
            opacity: 0.85,
            marginTop: 6,
            marginBottom: 22,
            fontSize: 13,
          }}
        >
          输入 sk-xxxx 形式的令牌，即可查询额度使用情况
        </p>
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
          }}
        >
          <span style={{ padding: '0 10px', fontSize: 18 }}>🔐</span>
          <input
            type="text"
            value={key}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onQuery()}
            spellCheck={false}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              padding: '12px 4px',
              color: '#0f172a',
              background: 'transparent',
            }}
          />
          {key && (
            <button
              onClick={() => setKey('')}
              title="清空"
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                width: 28,
                height: 28,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ×
            </button>
          )}
          <button
            onClick={onQuery}
            disabled={loading}
            style={{
              border: 'none',
              background: loading ? '#94a3b8' : '#2563eb',
              color: '#fff',
              padding: '0 22px',
              height: 44,
              borderRadius: 10,
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background .2s',
            }}
          >
            {loading ? '查询中…' : '立即查询'}
          </button>
        </div>
      </section>

      <section
        style={{
          width: '100%',
          maxWidth: 880,
          marginTop: 28,
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #eef2f7',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              color: '#0f172a',
              borderLeft: '3px solid #6366f1',
              paddingLeft: 10,
            }}
          >
            查询结果
          </h3>
          <button
            onClick={onCopy}
            disabled={!data}
            style={{
              border: '1px solid #e2e8f0',
              background: data ? '#fff' : '#f8fafc',
              color: data ? '#475569' : '#cbd5e1',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: data ? 'pointer' : 'not-allowed',
              fontSize: 13,
            }}
          >
            📋 复制令牌信息
          </button>
        </div>

        {!data && !loading && (
          <div
            style={{
              padding: '36px 0',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 14,
            }}
          >
            ⚠️ 请输入有效的令牌后查询，以查看额度详情。
          </div>
        )}

        {loading && (
          <div
            style={{
              padding: '36px 0',
              textAlign: 'center',
              color: '#6366f1',
              fontSize: 14,
            }}
          >
            正在查询，请稍候…
          </div>
        )}

        {data && stats && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            {stats.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        )}
      </section>

      <footer
        style={{
          marginTop: 40,
          color: '#94a3b8',
          fontSize: 12,
        }}
      >
        © {new Date().getFullYear()} check-api-tool · Powered by Vite + React
      </footer>

      {toast && (
        <Toast type={toast.type} onClose={() => setToast(null)}>
          {toast.msg}
        </Toast>
      )}
    </div>
  );
}

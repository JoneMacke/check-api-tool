/**
 * 解析 REACT_APP_BASE_URL 环境变量。
 * 支持两种格式：
 *   1) JSON 字符串：{"server1": "https://a.com", "server2": "https://b.com"}
 *   2) 单个 URL 字符串：https://a.com
 *
 * 如果未配置或解析失败，返回一个安全的默认对象，避免应用直接白屏。
 */
const FALLBACK = { default: '' };

export function parseBaseUrls() {
  const raw = process.env.REACT_APP_BASE_URL;
  if (!raw) {
    // 开发环境给出更明显的提示
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[check-api-tool] 未配置 REACT_APP_BASE_URL，使用默认空地址。请在 .env 中设置该环境变量。',
      );
    }
    return { ...FALLBACK };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed).filter(
        ([, v]) => typeof v === 'string' && v.length > 0,
      );
      if (entries.length === 0) return { ...FALLBACK };
      return Object.fromEntries(entries);
    }
  } catch (e) {
    // 不是 JSON，按单个 URL 处理
  }

  if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
    return { default: raw.trim() };
  }

  // eslint-disable-next-line no-console
  console.error(
    '[check-api-tool] REACT_APP_BASE_URL 格式非法，应为 JSON 对象字符串或合法 URL：',
    raw,
  );
  return { ...FALLBACK };
}

export const baseUrls = parseBaseUrls();

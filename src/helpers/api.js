import axios from 'axios';
import { showError } from './utils';

/**
 * 全局 axios 实例。
 * 注意：所有请求实际上都使用绝对 URL（${baseUrl}/...），
 * 因此这里不再设置 baseURL，避免与 REACT_APP_SERVER 的歧义。
 * 如需统一前缀，请改为在调用处拼接，或重新启用 baseURL 配置。
 */
export const API = axios.create({
  timeout: 15000,
  // 把 304 也当成成功响应（部分反代/上游会对 GET 返回 304）
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  // 加随机参数避免缓存导致的 304
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    showError(error);
    return Promise.reject(error);
  },
);

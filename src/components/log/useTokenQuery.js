import { useState } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { API } from '../../helpers';

export const TOKEN_REGEX = /^sk-[a-zA-Z0-9]{48}$/;

const emptyTabState = () => ({
  totalGranted: 0,
  totalUsed: 0,
  totalAvailable: 0,
  unlimitedQuota: false,
  expiresAt: 0,
  tokenName: '',
  logs: [],
  tokenValid: false,
});

/**
 * 封装多 Tab 站点的查询逻辑。
 * 返回 { tabData, loading, fetchData, resetData, getActive }
 */
export function useTokenQuery() {
  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(false);

  const resetData = (key) => {
    setTabData((prev) => ({ ...prev, [key]: emptyTabState() }));
  };

  const fetchData = async ({ apikey, baseUrl, activeTabKey }) => {
    if (!apikey) {
      Toast.warning('请先输入令牌，再进行查询');
      return;
    }
    if (!TOKEN_REGEX.test(apikey)) {
      Toast.error('令牌格式非法！');
      return;
    }
    // baseUrl 允许为空字符串：此时所有请求会走同源（由部署平台 rewrite 反代到上游），用于绕过 CORS
    if (baseUrl === undefined || baseUrl === null) {
      Toast.error('未配置 NewAPI 地址（REACT_APP_BASE_URL）');
      return;
    }

    setLoading(true);
    const next = { ...emptyTabState() };

    try {
      if (process.env.REACT_APP_SHOW_BALANCE === 'true') {
        const usageRes = await API.get(`${baseUrl}/api/usage/token/`, {
          headers: { Authorization: `Bearer ${apikey}` },
        });
        const usageData = usageRes.data;
        if (usageData.code) {
          const d = usageData.data;
          next.unlimitedQuota = d.unlimited_quota;
          next.totalGranted = d.total_granted;
          next.totalUsed = d.total_used;
          next.totalAvailable = d.total_available;
          next.expiresAt = d.expires_at;
          next.tokenName = d.name;
          next.tokenValid = true;
        } else {
          Toast.error(usageData.message || '查询令牌信息失败');
        }
      }
    } catch (e) {
      Toast.error('查询令牌信息失败，请检查令牌是否正确');
      resetData(activeTabKey);
      setLoading(false);
      return false;
    }

    try {
      if (process.env.REACT_APP_SHOW_DETAIL === 'true') {
        const logRes = await API.get(`${baseUrl}/api/log/token`, {
          headers: { Authorization: `Bearer ${apikey}` },
        });
        const { success, data: logData } = logRes.data;
        if (success) {
          next.logs = logData.reverse();
        } else {
          Toast.error('查询调用详情失败，请输入正确的令牌');
        }
      }
    } catch (e) {
      Toast.error('查询失败，请输入正确的令牌');
      resetData(activeTabKey);
      setLoading(false);
      return false;
    }

    setTabData((prev) => ({ ...prev, [activeTabKey]: next }));
    setLoading(false);
    return true;
  };

  const getActive = (key) => tabData[key] || emptyTabState();

  return { tabData, loading, fetchData, resetData, getActive };
}

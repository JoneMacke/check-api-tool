import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Tabs } from '@douyinfe/semi-ui';
import { IconKey } from '@douyinfe/semi-icons';
import { ITEMS_PER_PAGE } from '../constants';
import { baseUrls } from '../helpers/baseUrl';
import { useTokenQuery } from './log/useTokenQuery';
import TokenInfoPanel, { TokenInfoExtra } from './log/TokenInfoPanel';
import LogsPanel, { LogsExtra, exportCSV } from './log/LogsPanel';
import { copyText } from './log/clipboard';
import { renderQuota } from '../helpers/render';
import { timestamp2string } from '../helpers';

const { TabPane } = Tabs;

const SHOW_BALANCE = process.env.REACT_APP_SHOW_BALANCE !== 'false';
const SHOW_DETAIL = process.env.REACT_APP_SHOW_DETAIL !== 'false';

const SectionTitle = ({ children }) => (
  <div className="nk-section-title">
    <span className="nk-section-title__bar" />
    <span>{children}</span>
  </div>
);

const LogsTable = () => {
  const tabKeys = useMemo(() => Object.keys(baseUrls), []);
  const [apikey, setAPIKey] = useState('');
  const [activeTabKey, setActiveTabKey] = useState(tabKeys[0] || 'default');
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [hasQueried, setHasQueried] = useState(false);

  const { loading, fetchData, getActive } = useTokenQuery();
  const baseUrl = baseUrls[activeTabKey] || '';
  const activeTabData = getActive(activeTabKey);

  useEffect(() => {
    setHasQueried(false);
  }, [activeTabKey]);

  const handleQuery = async () => {
    const ok = await fetchData({ apikey, baseUrl, activeTabKey });
    if (ok) setHasQueried(true);
  };

  const handleCopyTokenInfo = (e) => {
    e.stopPropagation();
    const { totalGranted, totalUsed, totalAvailable, unlimitedQuota, expiresAt, tokenName } =
      activeTabData;
    const info = `令牌名称: ${tokenName || '未知'}
令牌总额: ${unlimitedQuota ? '无限' : renderQuota(totalGranted, 3)}
剩余额度: ${unlimitedQuota ? '无限制' : renderQuota(totalAvailable, 3)}
已用额度: ${unlimitedQuota ? '不进行计算' : renderQuota(totalUsed, 3)}
有效期至: ${expiresAt === 0 ? '永不过期' : timestamp2string(expiresAt)}`;
    copyText(info);
  };

  const handleExport = (e) => {
    e.stopPropagation();
    exportCSV(activeTabData.logs);
  };

  const renderContent = () => (
    <div className="nk-container">
      {/* Hero search */}
      <div className="nk-hero">
        <h1>令牌查询</h1>
        <Input
          showClear
          value={apikey}
          onChange={setAPIKey}
          placeholder="请输入要查询的令牌 sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          prefix={<IconKey style={{ color: '#6366f1', marginLeft: 4 }} />}
          suffix={
            <Button
              type="primary"
              theme="solid"
              size="large"
              onClick={handleQuery}
              loading={loading}
              disabled={apikey === ''}
            >
              立即查询
            </Button>
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleQuery();
          }}
        />
      </div>

      {/* Token info section */}
      {SHOW_BALANCE && hasQueried && (
        <Card
          style={{ marginTop: 24 }}
          title={<SectionTitle>查询结果</SectionTitle>}
          headerExtraContent={<TokenInfoExtra data={activeTabData} onCopy={handleCopyTokenInfo} />}
          bordered={false}
        >
          <TokenInfoPanel
            data={activeTabData}
            loading={loading && !hasQueried ? false : loading}
          />
        </Card>
      )}

      {/* Logs section */}
      {SHOW_DETAIL && hasQueried && (
        <Card
          style={{ marginTop: 20 }}
          title={<SectionTitle>调用详情</SectionTitle>}
          headerExtraContent={<LogsExtra data={activeTabData} onExport={handleExport} />}
          bordered={false}
        >
          <LogsPanel
            logs={activeTabData.logs}
            loading={loading}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </Card>
      )}
    </div>
  );

  if (tabKeys.length > 1) {
    return (
      <Tabs type="line" onChange={setActiveTabKey} activeKey={activeTabKey}>
        {tabKeys.map((key) => (
          <TabPane tab={key} itemKey={key} key={key}>
            {renderContent()}
          </TabPane>
        ))}
      </Tabs>
    );
  }

  return renderContent();
};

export default LogsTable;

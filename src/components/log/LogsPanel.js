import React from 'react';
import { Button, Empty, Skeleton, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import { IconDownload, IconHistogram } from '@douyinfe/semi-icons';
import { IllustrationNoContent, IllustrationNoContentDark } from '@douyinfe/semi-illustrations';
import Papa from 'papaparse';
import { buildLogColumns, renderTimestamp } from './columns';
import { copyText } from './clipboard';
import { renderQuota } from '../../helpers/render';

const { Text } = Typography;

const exportCSV = (logs) => {
  const csvData = logs.map((log) => ({
    时间: renderTimestamp(log.created_at),
    模型: log.model_name,
    用时: log.use_time,
    提示: log.prompt_tokens,
    补全: log.completion_tokens,
    花费: log.quota,
    详情: log.content,
  }));
  const csvString = '\ufeff' + Papa.unparse(csvData);

  try {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.csv';

    if (
      navigator.userAgent.indexOf('Safari') > -1 &&
      navigator.userAgent.indexOf('Chrome') === -1
    ) {
      link.target = '_blank';
      link.setAttribute('target', '_blank');
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (err) {
    Toast.error('导出失败，请稍后重试');
    // eslint-disable-next-line no-console
    console.error('Export failed:', err);
  }
};

const LogsSummary = ({ logs }) => {
  if (!logs || logs.length === 0) return null;
  const total = logs.length;
  const totalPrompt = logs.reduce((s, l) => s + (l.prompt_tokens || 0), 0);
  const totalCompletion = logs.reduce((s, l) => s + (l.completion_tokens || 0), 0);
  const totalQuota = logs.reduce((s, l) => s + (l.quota || 0), 0);
  const models = new Set(logs.map((l) => l.model_name).filter(Boolean));

  const Item = ({ label, value }) => (
    <div
      style={{
        flex: '1 1 140px',
        padding: '10px 14px',
        background: 'var(--semi-color-fill-0)',
        borderRadius: 10,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
        {value}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      <Item label="调用次数" value={total} />
      <Item label="使用模型数" value={models.size} />
      <Item label="提示 tokens" value={totalPrompt.toLocaleString()} />
      <Item label="补全 tokens" value={totalCompletion.toLocaleString()} />
      <Item label="总花费" value={renderQuota(totalQuota, 4)} />
    </div>
  );
};

const LogsPanel = ({ logs, loading, pageSize, onPageSizeChange }) => {
  const columns = React.useMemo(() => buildLogColumns(copyText), []);

  if (loading) {
    return <Skeleton loading active placeholder={<Skeleton.Paragraph rows={6} />} />;
  }

  return (
    <>
      <LogsSummary logs={logs} />
      <Table
        columns={columns}
        dataSource={logs}
        empty={
          <Empty
            image={<IllustrationNoContent style={{ width: 140, height: 140 }} />}
            darkModeImage={<IllustrationNoContentDark style={{ width: 140, height: 140 }} />}
            title={<Text strong>暂无调用记录</Text>}
            description={<Text type="tertiary">该令牌目前没有日志数据</Text>}
            style={{ padding: 24 }}
          />
        }
        pagination={{
          pageSize,
          hideOnSinglePage: true,
          showSizeChanger: true,
          pageSizeOpts: [10, 20, 50, 100],
          onPageSizeChange,
          showTotal: (total) => `共 ${total} 条`,
          showQuickJumper: true,
          total: logs.length,
          style: { marginTop: 12 },
        }}
      />
    </>
  );
};

export const LogsExtra = ({ data, onExport }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    <Tag shape="circle" color="green" prefixIcon={<IconHistogram />}>
      汇率：$1 = 500,000 tokens
    </Tag>
    <Button
      icon={<IconDownload />}
      theme="borderless"
      type="primary"
      onClick={onExport}
      disabled={!data.tokenValid || data.logs.length === 0}
    >
      导出 CSV
    </Button>
  </div>
);

export { exportCSV };
export default LogsPanel;

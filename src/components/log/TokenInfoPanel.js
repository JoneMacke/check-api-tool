import React from 'react';
import { Button, Progress, Skeleton, Tag, Tooltip, Typography } from '@douyinfe/semi-ui';
import { IconCopy, IconTickCircle, IconAlertTriangle } from '@douyinfe/semi-icons';
import { renderQuota } from '../../helpers/render';
import { timestamp2string } from '../../helpers';

const { Text } = Typography;

const StatCard = ({ icon, color, label, value, sub }) => (
  <div className="nk-stat">
    <div className={`nk-stat__icon nk-stat__icon--${color}`}>{icon}</div>
    <div className="nk-stat__label">{label}</div>
    <div className="nk-stat__value">{value}</div>
    {sub ? <div className="nk-stat__sub">{sub}</div> : null}
  </div>
);

const TokenInfoPanel = ({ data, loading }) => {
  const {
    totalGranted,
    totalUsed,
    totalAvailable,
    unlimitedQuota,
    expiresAt,
    tokenName,
    tokenValid,
  } = data;

  if (loading) {
    return (
      <Skeleton
        loading
        active
        placeholder={
          <div className="nk-stat-grid">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton.Paragraph rows={3} key={i} />
            ))}
          </div>
        }
      />
    );
  }

  if (!tokenValid) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 4px',
          color: 'var(--semi-color-text-2)',
        }}
      >
        <IconAlertTriangle style={{ color: 'var(--semi-color-warning)' }} />
        <Text type="tertiary">请输入有效的令牌后查询，以查看额度详情。</Text>
      </div>
    );
  }

  const usedPct =
    !unlimitedQuota && totalGranted > 0
      ? Math.min(100, Math.max(0, (totalUsed / totalGranted) * 100))
      : 0;

  const expiresText =
    expiresAt === 0 ? '永不过期' : timestamp2string(expiresAt);

  const isExpiringSoon =
    expiresAt !== 0 && expiresAt * 1000 - Date.now() < 7 * 24 * 3600 * 1000 && expiresAt * 1000 > Date.now();
  const isExpired = expiresAt !== 0 && expiresAt * 1000 < Date.now();

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Tag size="large" color="violet" shape="circle">
          {tokenName || '未命名令牌'}
        </Tag>
        <Tag
          size="large"
          shape="circle"
          color={isExpired ? 'red' : isExpiringSoon ? 'orange' : 'green'}
          prefixIcon={isExpired ? <IconAlertTriangle /> : <IconTickCircle />}
        >
          {isExpired ? '已过期' : isExpiringSoon ? '即将过期' : '可用'}
        </Tag>
        {unlimitedQuota ? (
          <Tag size="large" shape="circle" color="blue">
            无限额度
          </Tag>
        ) : null}
      </div>

      <div className="nk-stat-grid">
        <StatCard
          icon={<span>💳</span>}
          color="indigo"
          label="令牌总额"
          value={unlimitedQuota ? '∞' : renderQuota(totalGranted, 3)}
          sub={unlimitedQuota ? '无限制额度' : '总授予额度'}
        />
        <StatCard
          icon={<span>💰</span>}
          color="emerald"
          label="剩余额度"
          value={unlimitedQuota ? '∞' : renderQuota(totalAvailable, 3)}
          sub={unlimitedQuota ? '无限制' : '可继续消费'}
        />
        <StatCard
          icon={<span>📊</span>}
          color="amber"
          label="已用额度"
          value={unlimitedQuota ? '—' : renderQuota(totalUsed, 3)}
          sub={unlimitedQuota ? '不进行计算' : `占比 ${usedPct.toFixed(1)}%`}
        />
        <StatCard
          icon={<span>⏰</span>}
          color="pink"
          label="有效期至"
          value={
            <Tooltip content={expiresText} position="top">
              <span>{expiresText}</span>
            </Tooltip>
          }
          sub={expiresAt === 0 ? '长期有效' : isExpired ? '已过期' : '到期前请及时续费'}
        />
      </div>

      {!unlimitedQuota && totalGranted > 0 ? (
        <div className="nk-usage">
          <div className="nk-usage__head">
            <span>用量进度</span>
            <span>
              {renderQuota(totalUsed, 3)} / {renderQuota(totalGranted, 3)}
            </span>
          </div>
          <Progress
            percent={usedPct}
            stroke={
              usedPct >= 90
                ? 'var(--semi-color-danger)'
                : usedPct >= 70
                ? 'var(--semi-color-warning)'
                : 'var(--semi-color-success)'
            }
            showInfo={false}
            size="large"
            aria-label="quota-usage"
          />
        </div>
      ) : null}
    </div>
  );
};

export const TokenInfoExtra = ({ data, onCopy }) => (
  <Button
    icon={<IconCopy />}
    theme="borderless"
    type="primary"
    onClick={onCopy}
    disabled={!data.tokenValid}
  >
    复制令牌信息
  </Button>
);

export default TokenInfoPanel;

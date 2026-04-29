import React from 'react';
import { Tag, Tooltip, Space } from '@douyinfe/semi-ui';
import Paragraph from '@douyinfe/semi-ui/lib/es/typography/paragraph';
import { stringToColor, renderModelPrice, renderQuota } from '../../helpers/render';
import { timestamp2string } from '../../helpers';

const renderTimestamp = (ts) => timestamp2string(ts);

const renderIsStream = (bool) =>
  bool ? (
    <Tag color="blue" size="large">
      流
    </Tag>
  ) : (
    <Tag color="purple" size="large">
      非流
    </Tag>
  );

const renderUseTime = (type) => {
  const time = parseInt(type, 10);
  if (time < 101)
    return (
      <Tag color="green" size="large">
        {' '}
        {time} 秒{' '}
      </Tag>
    );
  if (time < 300)
    return (
      <Tag color="orange" size="large">
        {' '}
        {time} 秒{' '}
      </Tag>
    );
  return (
    <Tag color="red" size="large">
      {' '}
      {time} 秒{' '}
    </Tag>
  );
};

const isBillableType = (record) => record.type === 0 || record.type === 2;

/**
 * 生成日志表格列配置
 * @param {(text: string) => void} copyText - 复制函数
 */
export function buildLogColumns(copyText) {
  return [
    {
      title: '时间',
      dataIndex: 'created_at',
      render: renderTimestamp,
      sorter: (a, b) => a.created_at - b.created_at,
    },
    {
      title: '令牌名称',
      dataIndex: 'token_name',
      render: (text, record) =>
        isBillableType(record) ? (
          <Tag color="grey" size="large" onClick={() => copyText(text)}>
            {' '}
            {text}{' '}
          </Tag>
        ) : null,
      sorter: (a, b) => ('' + a.token_name).localeCompare(b.token_name),
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      render: (text, record) =>
        isBillableType(record) ? (
          <Tag color={stringToColor(text)} size="large" onClick={() => copyText(text)}>
            {' '}
            {text}{' '}
          </Tag>
        ) : null,
      sorter: (a, b) => ('' + a.model_name).localeCompare(b.model_name),
    },
    {
      title: '用时',
      dataIndex: 'use_time',
      render: (text, record) =>
        record.model_name?.startsWith('mj_') ? null : (
          <Space>
            {renderUseTime(text)}
            {renderIsStream(record.is_stream)}
          </Space>
        ),
      sorter: (a, b) => a.use_time - b.use_time,
    },
    {
      title: '提示',
      dataIndex: 'prompt_tokens',
      render: (text, record) =>
        record.model_name?.startsWith('mj_') ? null : isBillableType(record) ? (
          <span> {text} </span>
        ) : null,
      sorter: (a, b) => a.prompt_tokens - b.prompt_tokens,
    },
    {
      title: '补全',
      dataIndex: 'completion_tokens',
      render: (text, record) =>
        parseInt(text, 10) > 0 && isBillableType(record) ? <span> {text} </span> : null,
      sorter: (a, b) => a.completion_tokens - b.completion_tokens,
    },
    {
      title: '花费',
      dataIndex: 'quota',
      render: (text, record) => (isBillableType(record) ? <div>{renderQuota(text, 6)}</div> : null),
      sorter: (a, b) => a.quota - b.quota,
    },
    {
      title: '详情',
      dataIndex: 'content',
      render: (text, record) => {
        let other = null;
        try {
          other = JSON.parse(record.other && record.other !== '' ? record.other : '{}');
        } catch (e) {
          return (
            <Tooltip content="该版本不支持显示计算详情">
              <Paragraph ellipsis={{ rows: 2 }}>{text}</Paragraph>
            </Tooltip>
          );
        }
        if (other == null) {
          return (
            <Paragraph ellipsis={{ rows: 2, showTooltip: { type: 'popover' } }}>{text}</Paragraph>
          );
        }
        const content = renderModelPrice(
          record.prompt_tokens,
          record.completion_tokens,
          other.model_ratio,
          other.model_price,
          other.completion_ratio,
          other.group_ratio,
        );
        return (
          <Tooltip content={content}>
            <Paragraph ellipsis={{ rows: 2 }}>{text}</Paragraph>
          </Tooltip>
        );
      },
    },
  ];
}

export { renderTimestamp };

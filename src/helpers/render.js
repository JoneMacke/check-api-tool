/**
 * 渲染相关的工具函数（已精简为应用实际用到的部分）。
 */

const colors = [
  'amber',
  'blue',
  'cyan',
  'green',
  'grey',
  'indigo',
  'light-blue',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'violet',
  'yellow',
];

/**
 * 把任意字符串映射为一个稳定的 Semi Tag 颜色，便于在表格中给模型名上色。
 */
export function stringToColor(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

/**
 * 把后端的额度数值（quota，1 quota = 1/500000 USD）格式化为美元字符串。
 */
export function renderQuota(quota, digits = 2) {
  const quotaPerUnit = 500000;
  return '$' + (quota / quotaPerUnit).toFixed(digits);
}

/**
 * 在日志表格里以 tooltip 形式展示某次调用的价格明细。
 */
export function renderModelPrice(
  inputTokens,
  completionTokens,
  modelRatio,
  modelPrice = -1,
  completionRatio,
  groupRatio,
) {
  if (modelPrice !== -1) {
    return '模型价格：$' + modelPrice * groupRatio;
  }
  if (completionRatio === undefined) {
    completionRatio = 0;
  }
  // 1 倍率 = $0.002 / 1K tokens，因此这里乘以 2.0
  const inputRatioPrice = modelRatio * 2.0 * groupRatio;
  const completionRatioPrice = modelRatio * 2.0 * completionRatio * groupRatio;
  const price =
    (inputTokens / 1000000) * inputRatioPrice +
    (completionTokens / 1000000) * completionRatioPrice;
  return (
    <article>
      <p>提示 ${inputRatioPrice} / 1M tokens</p>
      <p>补全 ${completionRatioPrice} / 1M tokens</p>
      <p></p>
      <p>
        提示 {inputTokens} tokens / 1M tokens * ${inputRatioPrice} + 补全 {completionTokens} tokens
        / 1M tokens * ${completionRatioPrice} = ${price.toFixed(6)}
      </p>
    </article>
  );
}

import { Toast, Modal } from '@douyinfe/semi-ui';

/**
 * 兼容性更好的"复制到剪贴板"。
 * 优先使用 navigator.clipboard，HTTP/旧浏览器/Safari 走 execCommand 兜底。
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      Toast.success('已复制：' + text);
      return true;
    }
  } catch (_) {
    // fallthrough to execCommand
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand('copy');
    textArea.remove();
    if (ok) {
      Toast.success('已复制：' + text);
      return true;
    }
    Modal.error({ title: '无法复制到剪贴板，请手动复制', content: text });
    return false;
  } catch (err) {
    Modal.error({ title: '无法复制到剪贴板，请手动复制', content: text });
    return false;
  }
}

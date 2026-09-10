/**
 * 从 User-Agent 推断设备名称，例如：
 * "Chrome · Windows"、"Safari · iPhone"、"Firefox · Android"
 */
export function parseDeviceName(userAgent: string): string {
  const ua = userAgent || '';

  let os = '未知系统';
  if (/Windows NT 10/.test(ua)) os = 'Windows';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/iPhone|iPod/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X/.test(ua)) os = 'Mac';
  else if (/CrOS/.test(ua)) os = 'Chromebook';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = '未知浏览器';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Version\/.*Safari\//.test(ua)) browser = 'Safari';
  else if (/MicroMessenger\//.test(ua)) browser = '微信';
  else if (/QQBrowser/.test(ua)) browser = 'QQ浏览器';

  return `${browser} · ${os}`;
}

/**
 * 从请求对象获取客户端真实 IP。
 * 不直接解析 X-Forwarded-For / X-Real-IP——这些头部可被客户端任意伪造。
 * 一律使用 Express 依据 `trust proxy` 设置计算出的 req.ip：
 * 只有来自受信代理（见 main.ts 的 TRUST_PROXY 配置）的代理头才会被采纳，
 * 其余情况下回退到 TCP 连接的对端地址。
 */
export function getClientIp(req: any): string | null {
  const ip =
    req?.ip ||
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    null;
  if (typeof ip !== 'string' || ip.length === 0) return null;
  // 规范化 IPv6 映射的 IPv4 地址（如 ::ffff:203.0.113.7）
  return ip.replace(/^::ffff:/, '').slice(0, 45);
}

/**
 * 截断 UA 后存储，仅用于展示与审计（不作为设备复用/识别依据）
 */
export function fingerprint(userAgent: string): string {
  return (userAgent || 'unknown').slice(0, 128);
}

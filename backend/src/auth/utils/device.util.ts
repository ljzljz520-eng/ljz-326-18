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
 * 从请求对象获取客户端真实 IP
 */
export function getClientIp(req: any): string | null {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return (
    req?.headers?.['x-real-ip'] ||
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    req?.ip ||
    null
  );
}

/**
 * 截断 UA，作为设备指纹存储（避免过长）
 */
export function fingerprint(userAgent: string): string {
  return (userAgent || 'unknown').slice(0, 128);
}

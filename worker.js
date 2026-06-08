/**
 * VoiceForge · Cloudflare Worker 代理
 * 
 * 部署步骤：
 * 1. 打开 https://workers.cloudflare.com 注册/登录
 * 2. 创建 Worker → 粘贴此文件全部内容 → 保存并部署
 * 3. 复制 Worker 地址（格式：https://xxx.workers.dev）
 * 4. 填入 index.html 的 PROXY_BASE 变量中
 */

const FISH_API = 'https://api.fish.audio';

// 允许的来源（填你的 GitHub Pages 地址，* 表示全部允许）
const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env) {
    // 处理 CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);

    // 只代理 /v1/ 开头的路径
    if (!url.pathname.startsWith('/v1/')) {
      return new Response('VoiceForge Proxy · OK', { status: 200 });
    }

    // 转发到 Fish Audio
    const targetURL = FISH_API + url.pathname + url.search;

    const headers = new Headers(request.headers);
    headers.delete('origin');
    headers.delete('referer');
    headers.set('host', 'api.fish.audio');

    try {
      const upstream = await fetch(targetURL, {
        method:  request.method,
        headers: headers,
        body:    request.method !== 'GET' ? request.body : undefined,
      });

      // 复制响应头并加上 CORS
      const respHeaders = new Headers(upstream.headers);
      Object.entries(corsHeaders(request)).forEach(([k, v]) => respHeaders.set(k, v));

      return new Response(upstream.body, {
        status:  upstream.status,
        headers: respHeaders,
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status:  502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }
  }
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN === '*' ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age':       '86400',
  };
}

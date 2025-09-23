import { ProxyAgent } from 'undici';

let cachedProxyAgent = null;

export function getProxyAgent() {
  if (cachedProxyAgent !== null) {
    return cachedProxyAgent;
  }

  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    null;

  cachedProxyAgent = proxy ? new ProxyAgent(proxy) : undefined;
  return cachedProxyAgent;
}

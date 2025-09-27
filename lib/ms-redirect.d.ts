import type { NextApiRequest } from 'next';

type HeaderValue = string | string[] | undefined;

export interface RedirectRequestLike {
  headers: Partial<Record<string, HeaderValue>>;
}

export interface EnsureAbsoluteUrlOptions {
  host?: string;
  isLocal?: boolean;
  label: string;
  protocol?: string;
}

export declare function resolveMicrosoftRedirectUri(req: RedirectRequestLike | NextApiRequest): string;
export declare const DEFAULT_PROD_REDIRECT_URI: string;
export declare const DEFAULT_DEV_REDIRECT_URI: string;

export declare const _internal: {
  pickEnvValue(keys: string[]): string | undefined;
  ensureAbsoluteUrl(value: string, options: EnsureAbsoluteUrlOptions): string;
  getRequestHost(req: RedirectRequestLike | NextApiRequest): string;
  getForwardedProtocol(req: RedirectRequestLike | NextApiRequest): string | undefined;
};

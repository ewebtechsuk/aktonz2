import type { NextApiRequest, NextApiResponse } from 'next';

export type ApiHttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

export interface ApiHeaderOptions {
  methods?: readonly ApiHttpMethod[];
}

export function applyApiHeaders(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: ApiHeaderOptions,
): void;

export function handlePreflight(req: NextApiRequest, res: NextApiResponse): boolean;

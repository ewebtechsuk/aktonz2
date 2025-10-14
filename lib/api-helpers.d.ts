import type { NextApiRequest, NextApiResponse } from 'next';

export interface ApiHeaderOptions {
  methods?: readonly string[];
}

export function applyApiHeaders(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: ApiHeaderOptions,
): void;

export function handlePreflight(req: NextApiRequest, res: NextApiResponse): boolean;

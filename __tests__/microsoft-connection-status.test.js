import { describeMicrosoftConnection } from '../lib/microsoft-connection-status.js';

describe('describeMicrosoftConnection', () => {
  test('returns connected messaging when status is healthy', () => {
    const descriptor = describeMicrosoftConnection({
      loading: false,
      loaded: true,
      data: { connected: true, expiresInSeconds: 60 * 60 * 48 },
      error: null,
    });

    expect(descriptor.status).toBe('connected');
    expect(descriptor.tone).toBe('success');
    expect(descriptor.bannerMessage).toContain('Microsoft 365 is connected');
    expect(descriptor.actionLabel).toBe('Refresh connection');
    expect(descriptor.suppressQuery).toBe(false);
  });

  test('marks the connector as expired when tokens have elapsed', () => {
    const descriptor = describeMicrosoftConnection({
      loading: false,
      loaded: true,
      data: { connected: true, expiresInSeconds: -30, expiresAt: Date.now() - 30 * 1000 },
      error: null,
    });

    expect(descriptor.status).toBe('expired');
    expect(descriptor.tone).toBe('error');
    expect(descriptor.bannerMessage).toContain('expired');
    expect(descriptor.actionLabel).toBe('Reconnect Microsoft 365');
    expect(descriptor.suppressQuery).toBe(true);
  });

  test('surfaces load errors when the API call fails', () => {
    const descriptor = describeMicrosoftConnection({
      loading: false,
      loaded: true,
      data: null,
      error: 'Unable to load status',
    });

    expect(descriptor.status).toBe('error');
    expect(descriptor.tone).toBe('error');
    expect(descriptor.bannerMessage).toBe('Unable to load status');
    expect(descriptor.actionLabel).toBe('Connect Microsoft 365');
    expect(descriptor.suppressQuery).toBe(true);
  });
});

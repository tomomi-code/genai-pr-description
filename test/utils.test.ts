import { isNewerApiVersion } from '../src/utils';

describe('isNewerApiVersion', () => {
  it('returns false for versions before 2024-12-01-preview', () => {
    expect(isNewerApiVersion('2024-11-30-preview')).toBe(false);
    expect(isNewerApiVersion('2023-12-01-preview')).toBe(false);
    expect(isNewerApiVersion('2024-01-01-preview')).toBe(false);
  });

  it('returns true for 2024-12-01-preview and later', () => {
    expect(isNewerApiVersion('2024-12-01-preview')).toBe(true);
    expect(isNewerApiVersion('2025-01-01-preview')).toBe(true);
    expect(isNewerApiVersion('2024-12-02-preview')).toBe(true);
    expect(isNewerApiVersion('2024-12-01-preview')).toBe(true);
  });

  it('handles missing -preview', () => {
    expect(isNewerApiVersion('2024-12-01')).toBe(true);
    expect(isNewerApiVersion('2024-11-30')).toBe(false);
  });
});
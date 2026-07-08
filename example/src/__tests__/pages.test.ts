import {
  DEFAULT_PAGE_ID,
  PAGE_CONFIGS,
  PAGE_ORDER,
} from '../constants/pages';

describe('pages config', () => {
  it('defines exactly 3 pages in order', () => {
    expect(PAGE_ORDER).toEqual(['home', 'explore', 'account']);
    expect(Object.keys(PAGE_CONFIGS)).toHaveLength(3);
  });

  it('defaults to home', () => {
    expect(DEFAULT_PAGE_ID).toBe('home');
  });

  it('gives each page 3 CTAs with unique events', () => {
    const events = new Set<string>();

    for (const pageId of PAGE_ORDER) {
      const config = PAGE_CONFIGS[pageId];
      expect(config.ctas).toHaveLength(3);
      for (const cta of config.ctas) {
        expect(cta.id).toMatch(/^cta[1-3]$/);
        expect(cta.label.length).toBeGreaterThan(0);
        expect(events.has(cta.event)).toBe(false);
        events.add(cta.event);
      }
    }
  });

  it('uses RN_ prefixed unique inline and tooltip placeholder IDs', () => {
    const placeholderIds = new Set<string>();

    for (const pageId of PAGE_ORDER) {
      const config = PAGE_CONFIGS[pageId];
      expect(config.inlinePlaceholderId).toMatch(/^RN_\w+_inline$/);
      expect(config.tooltipPlaceholderId).toMatch(/^RN_\w+_tooltip$/);
      expect(placeholderIds.has(config.inlinePlaceholderId)).toBe(false);
      expect(placeholderIds.has(config.tooltipPlaceholderId)).toBe(false);
      placeholderIds.add(config.inlinePlaceholderId);
      placeholderIds.add(config.tooltipPlaceholderId);
    }
  });
});

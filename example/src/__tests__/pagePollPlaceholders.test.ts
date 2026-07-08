import {
  PAGE_CONFIGS,
  PAGE_ORDER,
} from '../constants/pages';

describe('page poll placeholders', () => {
  it('each page has distinct inline and tooltip placeholder IDs', () => {
    for (const pageId of PAGE_ORDER) {
      const config = PAGE_CONFIGS[pageId];
      expect(config.inlinePlaceholderId).toMatch(/^RN_.*_inline$/);
      expect(config.tooltipPlaceholderId).toMatch(/^RN_.*_tooltip$/);
      expect(config.inlinePlaceholderId).not.toBe(config.tooltipPlaceholderId);
    }
  });
});

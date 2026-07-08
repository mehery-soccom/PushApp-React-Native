export type PageId = 'home' | 'explore' | 'account';

export type PageCtaConfig = {
  id: string;
  label: string;
  event: string;
};

export type PageConfig = {
  id: PageId;
  tabLabel: string;
  pageName: string;
  inlinePlaceholderId: string;
  tooltipPlaceholderId: string;
  ctas: [PageCtaConfig, PageCtaConfig, PageCtaConfig];
};

function buildCtas(
  pageId: PageId,
  displayName: string
): [PageCtaConfig, PageCtaConfig, PageCtaConfig] {
  return [
    {
      id: 'cta1',
      label: `${displayName} CTA 1`,
      event: `${pageId}_cta_1_clicked`,
    },
    {
      id: 'cta2',
      label: `${displayName} CTA 2`,
      event: `${pageId}_cta_2_clicked`,
    },
    {
      id: 'cta3',
      label: `${displayName} CTA 3`,
      event: `${pageId}_cta_3_clicked`,
    },
  ];
}

export const PAGE_CONFIGS: Record<PageId, PageConfig> = {
  home: {
    id: 'home',
    tabLabel: 'Home',
    pageName: 'home',
    inlinePlaceholderId: 'RN_home_inline',
    tooltipPlaceholderId: 'RN_home_tooltip',
    ctas: buildCtas('home', 'Home'),
  },
  explore: {
    id: 'explore',
    tabLabel: 'Explore',
    pageName: 'explore',
    inlinePlaceholderId: 'RN_explore_inline',
    tooltipPlaceholderId: 'RN_explore_tooltip',
    ctas: buildCtas('explore', 'Explore'),
  },
  account: {
    id: 'account',
    tabLabel: 'Account',
    pageName: 'account',
    inlinePlaceholderId: 'RN_account_inline',
    tooltipPlaceholderId: 'RN_account_tooltip',
    ctas: buildCtas('account', 'Account'),
  },
};

export const PAGE_ORDER: PageId[] = ['home', 'explore', 'account'];

export const DEFAULT_PAGE_ID: PageId = 'home';

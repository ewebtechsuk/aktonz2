/**
 * @jest-environment node
 */

import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('../components/account/AccountLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="account-layout">{children}</div>,
}));

jest.mock('../lib/format.mjs', () => {
  const formatPriceGBP = jest.fn((value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    return `£${amount.toLocaleString('en-GB')}`;
  });
  return {
    __esModule: true,
    formatPriceGBP,
  };
});

jest.mock('../lib/offer-frequency.mjs', () => {
  const formatOfferFrequencyLabel = jest.fn((value) => {
    if (!value) return '';
    const normalized = String(value).trim().toLowerCase();
    if (['pcm', 'per month', 'per calendar month'].includes(normalized)) {
      return 'Per month';
    }
    return value;
  });
  return {
    __esModule: true,
    formatOfferFrequencyLabel,
  };
});

jest.mock(
  '../styles/Account.module.css',
  () => ({
    pageSections: 'pageSections',
    panel: 'panel',
    panelHeader: 'panelHeader',
    primaryCta: 'primaryCta',
    registerGrid: 'registerGrid',
    formGroup: 'formGroup',
    groupLabel: 'groupLabel',
    rangeControls: 'rangeControls',
    selectWrap: 'selectWrap',
    selectCaption: 'selectCaption',
    select: 'select',
    selectFull: 'selectFull',
    groupHint: 'groupHint',
    pillRow: 'pillRow',
    pillOption: 'pillOption',
    pillOptionActive: 'pillOptionActive',
    chipRow: 'chipRow',
    chipOption: 'chipOption',
    chipOptionActive: 'chipOptionActive',
    sectionHeader: 'sectionHeader',
    ghostButton: 'ghostButton',
    mapPanel: 'mapPanel',
    mapShell: 'mapShell',
    mapSurface: 'mapSurface',
    mapToolbar: 'mapToolbar',
    mapMode: 'mapMode',
    mapModeActive: 'mapModeActive',
    mapIllustration: 'mapIllustration',
    mapFootnote: 'mapFootnote',
    mapSearch: 'mapSearch',
    searchInput: 'searchInput',
    searchIcon: 'searchIcon',
    searchField: 'searchField',
    helperText: 'helperText',
    areaChips: 'areaChips',
    areaChip: 'areaChip',
    areaChipActive: 'areaChipActive',
    chipRemove: 'chipRemove',
    flexOptions: 'flexOptions',
    flexOption: 'flexOption',
    flexOptionActive: 'flexOptionActive',
    textArea: 'textArea',
  }),
  { virtual: true },
);

describe('Account dashboard price filters', () => {
  it('renders readable rent frequency labels', async () => {
    const pageModule = await import('../pages/account/index.js');
    const AccountDashboard = pageModule.default?.default ?? pageModule.default ?? pageModule;

    const markup = renderToStaticMarkup(<AccountDashboard />);

    expect(markup).toContain('£1,500 Per month');
    expect(markup).toContain('£3,200 Per month');
    expect(markup).toContain('£3,500 Per month');
    expect(markup).not.toContain('pcm');
  });
});

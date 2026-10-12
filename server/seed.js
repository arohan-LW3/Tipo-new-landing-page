// Starting data used until the owners save something through the admin. It is
// the Batch 1 timeline that used to be hardcoded in TraceabilityPage.jsx.
//
// Each tile's body is a stack of rows. A row with an empty label renders as a
// bare right-aligned value (used for a coordinate line directly under a
// place-name row). `emphasis` rows render their value large and gold, like a
// place name; plain rows render small and white. `footer` is always the
// date/duration field and always sits in the separate footer strip.
export const SEED_TILES = [
  {
    title: 'Collection of Herbs',
    rows: [
      { label: 'Sourced from', value: 'Telam Bédum, Dhemaji', emphasis: true },
      { label: '', value: '27.76°N, 94.99°E' },
    ],
    footer: { label: 'Collected on', value: '09 Oct 2025' },
  },
  {
    title: 'EPOB Preparation',
    rows: [
      { label: 'Sourced from', value: 'Memberchuk, Dhemaji', emphasis: true },
      { label: '', value: '27.57°N, 94.74°E' },
      { label: '', value: 'Majulipur, Dhemaji', emphasis: true },
      { label: '', value: '27.76°N, 95.06°E' },
    ],
    footer: { label: 'Collected on', value: '10 Oct 2025' },
  },
  {
    title: 'Preparation of Fermentation',
    rows: [
      { label: 'Prepared at', value: 'Memberchuk, Dhemaji', emphasis: true },
      { label: '', value: '27.57°N, 94.74°E' },
      { label: 'Prepared by', value: 'Ardha SHG & Polo SHG', emphasis: true },
    ],
    footer: { label: 'Prepared on', value: '02 Nov 2025' },
  },
  {
    title: 'Transportation',
    rows: [
      { label: 'From', value: 'Laimekuri', emphasis: true },
      { label: '', value: '27.76°N, 95.06°E' },
      { label: 'To', value: 'Guwahati Biotech Park', emphasis: true },
      { label: '', value: '26.19°N, 91.67°E' },
    ],
    footer: { label: 'Duration', value: '10 Hours' },
  },
  {
    title: 'Fermentation-Storage Facility',
    rows: [
      { label: 'Stored at', value: 'Amingaon, Guwahati', emphasis: true },
      { label: '', value: '26.17°N, 91.71°E' },
      { label: 'Storage facility', value: 'Guwahati Biotech Park', emphasis: true },
    ],
    footer: { label: 'Duration', value: '23 Days' },
  },
  {
    title: 'Extraction & Stabilisation',
    rows: [
      { label: 'Extracted at', value: 'Sonaighuli, Dispur', emphasis: true },
      { label: '', value: '26.14°N, 91.74°E' },
      { label: 'Facility', value: 'Guwahati Biotech Park', emphasis: true },
    ],
    footer: { label: 'Duration', value: '3 Months' },
  },
  {
    title: 'Bottling',
    rows: [
      { label: 'Bottled at', value: 'Sonaighuli, Dispur', emphasis: true },
      { label: '', value: '26.14°N, 91.74°E' },
      { label: 'Facility', value: 'Guwahati Biotech Park', emphasis: true },
    ],
    footer: { label: 'Bottled on', value: '07 Mar 2026' },
  },
]

export function seedData() {
  return {
    batches: [
      {
        id: '1',
        live: true,
        tiles: structuredClone(SEED_TILES),
        serials: [],
        updatedAt: null,
        updatedBy: null,
      },
    ],
  }
}

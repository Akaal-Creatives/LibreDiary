import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimeReport } from '../useTimeReport';

const mockRows = [
  {
    id: 'r1',
    databaseId: 'db-1',
    position: 0,
    cells: { 'dur-prop': 3_600_000 },
    createdById: 'user-1',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'r2',
    databaseId: 'db-1',
    position: 1,
    cells: { 'dur-prop': 1_800_000 },
    createdById: 'user-2',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 'r3',
    databaseId: 'db-1',
    position: 2,
    cells: { 'dur-prop': 5_400_000 },
    createdById: 'user-1',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
  },
];

vi.mock('@/stores/databases', () => ({
  useDatabasesStore: () => ({
    sortedProperties: [
      {
        id: 'name-prop',
        databaseId: 'db-1',
        name: 'Task',
        type: 'TEXT',
        position: 0,
        config: null,
      },
      {
        id: 'dur-prop',
        databaseId: 'db-1',
        name: 'Time Spent',
        type: 'DURATION',
        position: 1,
        config: { precision: 'minutes', format: 'hms' },
      },
    ],
    filteredAndSortedRows: mockRows,
  }),
}));

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => ({
    members: [
      { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } },
      { user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' } },
    ],
  }),
}));

describe('useTimeReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds DURATION properties', () => {
    const { durationProperties } = useTimeReport();
    expect(durationProperties.value).toHaveLength(1);
    expect(durationProperties.value[0]!.name).toBe('Time Spent');
  });

  it('selects first DURATION property by default', () => {
    const { activeProperty } = useTimeReport();
    expect(activeProperty.value?.id).toBe('dur-prop');
  });

  it('computes total milliseconds', () => {
    const { summary } = useTimeReport();
    expect(summary.value.totalMs).toBe(10_800_000); // 3h
  });

  it('computes average milliseconds', () => {
    const { summary } = useTimeReport();
    expect(summary.value.averageMs).toBe(3_600_000); // 1h
  });

  it('computes row count', () => {
    const { summary } = useTimeReport();
    expect(summary.value.rowCount).toBe(3);
  });

  it('computes per-user breakdown sorted by total descending', () => {
    const { summary } = useTimeReport();
    const perUser = summary.value.perUser;
    expect(perUser).toHaveLength(2);
    expect(perUser[0]!.userName).toBe('Alice');
    expect(perUser[0]!.totalMs).toBe(9_000_000); // 2.5h
    expect(perUser[0]!.rowCount).toBe(2);
    expect(perUser[1]!.userName).toBe('Bob');
    expect(perUser[1]!.totalMs).toBe(1_800_000);
    expect(perUser[1]!.rowCount).toBe(1);
  });

  it('formats milliseconds using property config', () => {
    const { formatMs } = useTimeReport();
    expect(formatMs(5_400_000)).toBe('1h 30m');
  });

  it('filters rows by dateFrom', () => {
    const { dateFrom, summary } = useTimeReport();
    dateFrom.value = '2026-03-04';
    // Only r2 and r3 should match
    expect(summary.value.rowCount).toBe(2);
    expect(summary.value.totalMs).toBe(7_200_000);
  });

  it('filters rows by dateTo', () => {
    const { dateTo, summary } = useTimeReport();
    dateTo.value = '2026-03-04';
    // Only r1 should match
    expect(summary.value.rowCount).toBe(1);
    expect(summary.value.totalMs).toBe(3_600_000);
  });

  it('clears date filters', () => {
    const { dateFrom, dateTo, clearFilters, summary } = useTimeReport();
    dateFrom.value = '2026-03-04';
    dateTo.value = '2026-03-06';
    expect(summary.value.rowCount).toBe(1);

    clearFilters();
    expect(dateFrom.value).toBe('');
    expect(dateTo.value).toBe('');
    expect(summary.value.rowCount).toBe(3);
  });

  it('returns empty summary when no duration property exists', () => {
    const { selectedPropertyId, summary } = useTimeReport();
    selectedPropertyId.value = 'nonexistent';
    expect(summary.value.totalMs).toBe(0);
    expect(summary.value.rowCount).toBe(0);
    expect(summary.value.perUser).toHaveLength(0);
  });

  it('includes rows on the exact dateFrom boundary', () => {
    const { dateFrom, summary } = useTimeReport();
    dateFrom.value = '2026-03-01';
    // r1 is exactly on 2026-03-01 — should be included
    expect(summary.value.rowCount).toBe(3);
  });

  it('includes rows on the exact dateTo boundary', () => {
    const { dateTo, summary } = useTimeReport();
    dateTo.value = '2026-03-10';
    // r3 is exactly on 2026-03-10 — should be included (dateTo is inclusive)
    expect(summary.value.rowCount).toBe(3);
  });

  it('filters single-day range correctly', () => {
    const { dateFrom, dateTo, summary } = useTimeReport();
    dateFrom.value = '2026-03-05';
    dateTo.value = '2026-03-05';
    // Only r2 (2026-03-05) should match
    expect(summary.value.rowCount).toBe(1);
    expect(summary.value.totalMs).toBe(1_800_000);
  });

  it('returns empty when dateFrom is after all rows', () => {
    const { dateFrom, summary } = useTimeReport();
    dateFrom.value = '2026-12-01';
    expect(summary.value.rowCount).toBe(0);
    expect(summary.value.totalMs).toBe(0);
  });

  it('returns empty when dateTo is before all rows', () => {
    const { dateTo, summary } = useTimeReport();
    dateTo.value = '2026-01-01';
    expect(summary.value.rowCount).toBe(0);
    expect(summary.value.totalMs).toBe(0);
  });
});

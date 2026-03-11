import { ref, computed } from 'vue';
import { useDatabasesStore } from '@/stores/databases';
import { useOrganizationsStore } from '@/stores/organizations';
import { formatDuration } from '@librediary/shared/utils';
import type { DurationConfig } from '@librediary/shared/utils';
import type { DatabaseProperty } from '@librediary/shared';

export interface TimeReportEntry {
  userId: string;
  userName: string;
  totalMs: number;
  rowCount: number;
}

export interface TimeReportSummary {
  totalMs: number;
  averageMs: number;
  rowCount: number;
  perUser: TimeReportEntry[];
}

export function useTimeReport() {
  const databasesStore = useDatabasesStore();
  const organizationsStore = useOrganizationsStore();

  const dateFrom = ref<string>('');
  const dateTo = ref<string>('');
  const selectedPropertyId = ref<string>('');

  const durationProperties = computed<DatabaseProperty[]>(() => {
    return databasesStore.sortedProperties.filter((p) => p.type === 'DURATION');
  });

  const activeProperty = computed<DatabaseProperty | null>(() => {
    if (selectedPropertyId.value) {
      return durationProperties.value.find((p) => p.id === selectedPropertyId.value) ?? null;
    }
    return durationProperties.value[0] ?? null;
  });

  const durationConfig = computed<DurationConfig>(() => {
    const config = activeProperty.value?.config as Record<string, unknown> | null;
    return {
      precision: (config?.precision as DurationConfig['precision']) ?? 'seconds',
      format: (config?.format as DurationConfig['format']) ?? 'hms',
    };
  });

  const filteredRows = computed(() => {
    let rows = databasesStore.filteredAndSortedRows;

    if (dateFrom.value) {
      const from = new Date(dateFrom.value);
      rows = rows.filter((r) => new Date(r.createdAt) >= from);
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.createdAt) <= to);
    }

    return rows;
  });

  const summary = computed<TimeReportSummary>(() => {
    const propId = activeProperty.value?.id;
    if (!propId) {
      return { totalMs: 0, averageMs: 0, rowCount: 0, perUser: [] };
    }

    const userMap = new Map<string, { totalMs: number; rowCount: number }>();
    let totalMs = 0;
    let rowCount = 0;

    for (const row of filteredRows.value) {
      const cells = row.cells as Record<string, unknown>;
      const value = cells[propId];
      if (value == null) continue;
      const ms = Number(value);
      if (isNaN(ms) || ms === 0) continue;

      totalMs += ms;
      rowCount++;

      const userId = row.createdById;
      const entry = userMap.get(userId) ?? { totalMs: 0, rowCount: 0 };
      entry.totalMs += ms;
      entry.rowCount++;
      userMap.set(userId, entry);
    }

    const perUser: TimeReportEntry[] = Array.from(userMap.entries()).map(([userId, data]) => {
      const member = organizationsStore.members.find((m) => m.user.id === userId);
      return {
        userId,
        userName: member?.user?.name ?? member?.user?.email ?? userId,
        totalMs: data.totalMs,
        rowCount: data.rowCount,
      };
    });

    // Sort by total descending
    perUser.sort((a, b) => b.totalMs - a.totalMs);

    return {
      totalMs,
      averageMs: rowCount > 0 ? Math.round(totalMs / rowCount) : 0,
      rowCount,
      perUser,
    };
  });

  function formatMs(ms: number): string {
    return formatDuration(ms, durationConfig.value);
  }

  function exportCsv(): void {
    const propName = activeProperty.value?.name ?? 'Duration';
    const headers = ['User', propName, 'Entries'];
    const rows = summary.value.perUser.map((entry) => [
      entry.userName,
      formatMs(entry.totalMs),
      String(entry.rowCount),
    ]);

    rows.push(['Total', formatMs(summary.value.totalMs), String(summary.value.rowCount)]);
    rows.push(['Average', formatMs(summary.value.averageMs), '']);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-report-${propName.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters(): void {
    dateFrom.value = '';
    dateTo.value = '';
  }

  return {
    dateFrom,
    dateTo,
    selectedPropertyId,
    durationProperties,
    activeProperty,
    summary,
    formatMs,
    exportCsv,
    clearFilters,
  };
}

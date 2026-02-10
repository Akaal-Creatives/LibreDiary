<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n';
import {
  flattenKeys,
  computeTranslationStats,
  type TranslationStats,
} from '@/i18n/translation-utils';

// Statically import all locale files (page is code-split via router lazy loading)
import enGB from '@/locales/en-GB.json';
import enUS from '@/locales/en-US.json';
import fr from '@/locales/fr.json';
import es from '@/locales/es.json';
import de from '@/locales/de.json';
import it from '@/locales/it.json';
import ptBR from '@/locales/pt-BR.json';
import ja from '@/locales/ja.json';
import zhCN from '@/locales/zh-CN.json';
import ko from '@/locales/ko.json';
import ar from '@/locales/ar.json';
import hi from '@/locales/hi.json';
import ru from '@/locales/ru.json';
import nl from '@/locales/nl.json';
import tr from '@/locales/tr.json';
import pl from '@/locales/pl.json';
import sv from '@/locales/sv.json';

const { t } = useI18n();

const localeMessages: Record<LocaleCode, Record<string, unknown>> = {
  'en-GB': enGB,
  'en-US': enUS,
  fr: fr,
  es: es,
  de: de,
  it: it,
  'pt-BR': ptBR,
  ja: ja,
  'zh-CN': zhCN,
  ko: ko,
  ar: ar,
  hi: hi,
  ru: ru,
  nl: nl,
  tr: tr,
  pl: pl,
  sv: sv,
};

const masterKeys = computed(() => flattenKeys(enGB as Record<string, unknown>));

const translationStats = computed<TranslationStats[]>(() => {
  const stats: TranslationStats[] = [];

  for (const [code, meta] of Object.entries(SUPPORTED_LOCALES)) {
    const messages = localeMessages[code as LocaleCode] ?? {};
    stats.push(
      computeTranslationStats(masterKeys.value, messages as Record<string, unknown>, code, meta)
    );
  }

  // Sort: complete first, then partial by percentage desc, then skeleton alphabetically
  return stats.sort((a, b) => {
    const statusOrder = { complete: 0, partial: 1, skeleton: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    if (a.status === 'partial' && b.status === 'partial') {
      return b.percentage - a.percentage;
    }

    if (a.status === 'skeleton' && b.status === 'skeleton') {
      return a.name.localeCompare(b.name);
    }

    return 0;
  });
});

const fullyTranslatedCount = computed(
  () => translationStats.value.filter((s) => s.status === 'complete').length
);

const expandedLocales = ref<Set<string>>(new Set());

function toggleExpand(locale: string) {
  if (expandedLocales.value.has(locale)) {
    expandedLocales.value.delete(locale);
  } else {
    expandedLocales.value.add(locale);
  }
  // Trigger reactivity
  expandedLocales.value = new Set(expandedLocales.value);
}

function downloadLocale(stats: TranslationStats) {
  const messages = localeMessages[stats.locale as LocaleCode] ?? {};
  const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${stats.locale}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="admin-translations">
    <div class="page-header">
      <h1 class="page-title">{{ t('admin.translationsTitle') }}</h1>
      <p class="page-description">{{ t('admin.translationsDescription') }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ Object.keys(SUPPORTED_LOCALES).length }}</span>
        <span class="stat-label">{{ t('admin.totalLanguages') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ fullyTranslatedCount }}</span>
        <span class="stat-label">{{ t('admin.fullyTranslated') }}</span>
      </div>
      <div class="stat-item stat-item--link">
        <a href="/docs/TRANSLATING.md" target="_blank" rel="noopener noreferrer" class="guide-link">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 2.25H7.5C8.29565 2.25 9.05871 2.56607 9.62132 3.12868C10.1839 3.69129 10.5 4.45435 10.5 5.25V15.75C10.5 15.1533 10.2629 14.581 9.84099 14.159C9.41903 13.7371 8.84674 13.5 8.25 13.5H3V2.25Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M15 2.25H10.5C9.70435 2.25 8.94129 2.56607 8.37868 3.12868C7.81607 3.69129 7.5 4.45435 7.5 5.25V15.75C7.5 15.1533 7.73705 14.581 8.15901 14.159C8.58097 13.7371 9.15326 13.5 9.75 13.5H15V2.25Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('admin.translationContributionGuide') }}
        </a>
        <span class="stat-label">docs/TRANSLATING.md</span>
      </div>
    </div>

    <!-- Translation Table -->
    <section class="translations-section">
      <!-- Table Header -->
      <div class="table-header">
        <span class="col-language">{{ t('admin.translationLanguage') }}</span>
        <span class="col-progress">{{ t('admin.translationProgress') }}</span>
        <span class="col-keys">{{ t('admin.translationKeys') }}</span>
        <span class="col-status">{{ t('admin.translationStatus') }}</span>
        <span class="col-actions"></span>
      </div>

      <!-- Table Rows -->
      <div v-for="stats in translationStats" :key="stats.locale" class="translation-row">
        <div class="row-main">
          <!-- Language -->
          <div class="col-language">
            <span class="locale-native">{{ stats.nativeName }}</span>
            <span v-if="stats.nativeName !== stats.name" class="locale-english">{{
              stats.name
            }}</span>
            <span class="locale-code">{{ stats.locale }}</span>
          </div>

          <!-- Progress -->
          <div class="col-progress">
            <div class="progress-bar">
              <div
                class="progress-bar-fill"
                :class="{
                  'fill-complete': stats.status === 'complete',
                  'fill-partial': stats.status === 'partial',
                  'fill-skeleton': stats.status === 'skeleton',
                }"
                :style="{ width: `${stats.percentage}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ stats.percentage }}%</span>
          </div>

          <!-- Keys -->
          <div class="col-keys">
            <span class="keys-count">{{ stats.translatedKeys }}/{{ stats.totalKeys }}</span>
          </div>

          <!-- Status -->
          <div class="col-status">
            <span class="status-badge" :class="`status-badge--${stats.status}`">
              {{
                t(
                  `admin.translationStatus${stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}`
                )
              }}
            </span>
          </div>

          <!-- Actions -->
          <div class="col-actions">
            <button
              v-if="stats.missingKeys.length > 0"
              class="expand-btn"
              :title="
                expandedLocales.has(stats.locale)
                  ? t('admin.translationHideMissing')
                  : t('admin.translationShowMissing')
              "
              @click="toggleExpand(stats.locale)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                :class="{ rotated: expandedLocales.has(stats.locale) }"
              >
                <path
                  d="M5 3L9 7L5 11"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              class="download-btn"
              :title="t('admin.translationDownload')"
              @click="downloadLocale(stats)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2V9.5M7 9.5L4 6.5M7 9.5L10 6.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 11H12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Expanded Missing Keys -->
        <div v-if="expandedLocales.has(stats.locale)" class="missing-keys-list">
          <code v-for="key in stats.missingKeys" :key="key" class="missing-key">{{ key }}</code>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-translations {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.page-description {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-item--link {
  justify-content: center;
}

.guide-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--admin-accent, var(--color-accent));
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.guide-link:hover {
  opacity: 0.8;
}

/* Translations Section */
.translations-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 200px 1fr 80px 100px 70px;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.translation-row {
  border-bottom: 1px solid var(--color-border-subtle);
}

.translation-row:last-child {
  border-bottom: none;
}

.row-main {
  display: grid;
  grid-template-columns: 200px 1fr 80px 100px 70px;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.row-main:hover {
  background: var(--color-hover);
}

/* Language Column */
.col-language {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.locale-native {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.locale-english {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.locale-code {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-family: monospace;
}

/* Progress Column */
.col-progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.fill-complete {
  background: var(--color-success, #22c55e);
}

.fill-partial {
  background: var(--color-warning, #f59e0b);
}

.fill-skeleton {
  background: var(--color-border-strong, #94a3b8);
}

.progress-text {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 32px;
  text-align: right;
}

/* Keys Column */
.col-keys {
  text-align: center;
}

.keys-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* Status Column */
.col-status {
  text-align: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.status-badge--complete {
  color: var(--color-success, #22c55e);
  background: rgba(34, 197, 94, 0.1);
}

.status-badge--partial {
  color: var(--color-warning, #f59e0b);
  background: rgba(245, 158, 11, 0.1);
}

.status-badge--skeleton {
  color: var(--color-text-tertiary);
  background: var(--color-hover);
}

/* Actions Column */
.col-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
}

.expand-btn,
.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.expand-btn:hover,
.download-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.expand-btn svg {
  transition: transform 0.2s ease;
}

.expand-btn svg.rotated {
  transform: rotate(90deg);
}

/* Missing Keys List */
.missing-keys-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4) var(--space-4);
  padding-left: calc(200px + var(--space-4) + var(--space-3));
}

.missing-key {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
</style>

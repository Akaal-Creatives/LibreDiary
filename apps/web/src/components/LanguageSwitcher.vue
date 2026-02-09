<script setup lang="ts">
import { ref } from 'vue';
import { useLocale } from '@/composables';
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n';

const { currentLocale, setLocale } = useLocale();
const isOpen = ref(false);

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function selectLocale(locale: LocaleCode) {
  setLocale(locale);
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.language-switcher')) {
    isOpen.value = false;
  }
}
</script>

<template>
  <div class="language-switcher" v-on="isOpen ? { 'click.capture': handleClickOutside } : {}">
    <button
      class="language-toggle"
      :title="$t('language.selectLanguage')"
      :aria-label="$t('language.selectLanguage')"
      @click="toggleMenu"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6.75" stroke="currentColor" stroke-width="1.5" />
        <path d="M2.25 9H15.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path
          d="M9 2.25C10.6569 4.03568 11.6046 6.46263 11.625 9C11.6046 11.5374 10.6569 13.9643 9 15.75"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M9 2.25C7.34315 4.03568 6.39543 6.46263 6.375 9C6.39543 11.5374 7.34315 13.9643 9 15.75"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <div v-if="isOpen" class="language-menu">
      <button
        v-for="(meta, code) in SUPPORTED_LOCALES"
        :key="code"
        class="language-option"
        :class="{ active: currentLocale === code }"
        @click="selectLocale(code as LocaleCode)"
      >
        <span class="locale-name">{{ meta.name }}</span>
        <svg
          v-if="currentLocale === code"
          class="check-icon"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M2.5 7L5.5 10L11.5 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.language-switcher {
  position: relative;
}

.language-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.language-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.language-menu {
  position: absolute;
  right: 0;
  bottom: 100%;
  z-index: 50;
  min-width: 160px;
  margin-bottom: var(--space-2);
  padding: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.language-option {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.language-option:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.language-option.active {
  color: var(--color-accent);
  font-weight: 500;
}

.locale-name {
  flex: 1;
}

.check-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}
</style>

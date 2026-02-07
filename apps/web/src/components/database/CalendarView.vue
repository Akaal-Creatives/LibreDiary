<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDatabasesStore } from '@/stores';

const databasesStore = useDatabasesStore();

type CalendarMode = 'month' | 'week' | 'day';

const currentDate = ref(new Date());
const viewMode = ref<CalendarMode>('month');
const dragEventId = ref<string | null>(null);
const dragOverDate = ref<string | null>(null);

const datePropertyId = computed(() => {
  const config = databasesStore.activeView?.config as Record<string, unknown> | null;
  return (config?.dateProperty as string) ?? null;
});

const dateProperties = computed(() => databasesStore.properties.filter((p) => p.type === 'DATE'));

const titleProperty = computed(() => databasesStore.sortedProperties[0] ?? null);

const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const monthLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
  return formatter.format(currentDate.value);
});

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Day of week (0=Sun, 1=Mon, ...) — convert to Mon-start (0=Mon, 6=Sun)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Total cells: fill leading days + month days + trailing days to complete last week
  const totalDays = daysInMonth + startDow;
  const totalCells = Math.ceil(totalDays / 7) * 7;

  const today = new Date();
  const todayStr = formatDate(today);

  const days: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - startDow + i);
    const dateStr = formatDate(date);
    days.push({
      date,
      dateStr,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: dateStr === todayStr,
    });
  }

  return days;
});

interface CalendarEvent {
  rowId: string;
  title: string;
  dateStr: string;
}

const eventsInView = computed<CalendarEvent[]>(() => {
  if (!datePropertyId.value || !titleProperty.value) return [];

  const allRows = databasesStore.filteredAndSortedRows;
  const events: CalendarEvent[] = [];

  // Determine visible date range based on view mode
  let startStr: string;
  let endStr: string;

  if (viewMode.value === 'week') {
    const first = weekDays.value[0];
    const last = weekDays.value[weekDays.value.length - 1];
    if (!first || !last) return [];
    startStr = first.dateStr;
    endStr = last.dateStr;
  } else {
    const firstCell = calendarDays.value[0];
    const lastCell = calendarDays.value[calendarDays.value.length - 1];
    if (!firstCell || !lastCell) return [];
    startStr = firstCell.dateStr;
    endStr = lastCell.dateStr;
  }

  for (const row of allRows) {
    const dateVal = (row.cells as Record<string, unknown>)[datePropertyId.value];
    if (dateVal == null || dateVal === '') continue;
    const dateStr = String(dateVal);
    if (dateStr < startStr || dateStr > endStr) continue;

    const title = String((row.cells as Record<string, unknown>)[titleProperty.value!.id] ?? '');
    events.push({ rowId: row.id, title, dateStr });
  }

  return events;
});

function eventsForDate(dateStr: string): CalendarEvent[] {
  return eventsInView.value.filter((e) => e.dateStr === dateStr);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Week view computeds
const weekDays = computed<CalendarDay[]>(() => {
  const d = new Date(currentDate.value);
  // Get Monday of the current week
  let dow = d.getDay() - 1;
  if (dow < 0) dow = 6;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);

  const today = new Date();
  const todayStr = formatDate(today);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = formatDate(date);
    days.push({
      date,
      dateStr,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth.value,
      isToday: dateStr === todayStr,
    });
  }
  return days;
});

// Day view computeds
const currentDayStr = computed(() => formatDate(currentDate.value));

const dayLabel = computed(() => {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(currentDate.value);
});

const dayEvents = computed<CalendarEvent[]>(() => {
  if (!datePropertyId.value || !titleProperty.value) return [];
  const dateStr = currentDayStr.value;
  return databasesStore.filteredAndSortedRows
    .filter((row) => {
      const val = (row.cells as Record<string, unknown>)[datePropertyId.value!];
      return val != null && String(val) === dateStr;
    })
    .map((row) => ({
      rowId: row.id,
      title: String((row.cells as Record<string, unknown>)[titleProperty.value!.id] ?? ''),
      dateStr,
    }));
});

function setViewMode(mode: CalendarMode) {
  viewMode.value = mode;
}

function navigatePrev() {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() - 1);
  } else if (viewMode.value === 'week') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 1);
  }
  currentDate.value = d;
}

function navigateNext() {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() + 1);
  } else if (viewMode.value === 'week') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + 1);
  }
  currentDate.value = d;
}

function navigateToday() {
  currentDate.value = new Date();
}

async function setDateProperty(propertyId: string) {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = { ...((view.config as Record<string, unknown>) ?? {}), dateProperty: propertyId };
  await databasesStore.updateView(view.id, { config });
}

function onEventDragStart(event: DragEvent, rowId: string) {
  dragEventId.value = rowId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rowId);
  }
}

function onDayDragOver(event: DragEvent, dateStr: string) {
  event.preventDefault();
  if (dragEventId.value) {
    dragOverDate.value = dateStr;
  }
}

function onDayDragLeave() {
  dragOverDate.value = null;
}

async function onDayDrop(event: DragEvent, dateStr: string) {
  event.preventDefault();
  dragOverDate.value = null;
  if (!dragEventId.value || !datePropertyId.value) return;

  await databasesStore.updateRowCell(dragEventId.value, datePropertyId.value, dateStr);
  dragEventId.value = null;
}

function onEventDragEnd() {
  dragEventId.value = null;
  dragOverDate.value = null;
}
</script>

<template>
  <div class="calendar-view">
    <!-- Date property selector — prompt when none configured -->
    <div v-if="!datePropertyId" class="calendar-date-property-bar calendar-date-property-prompt">
      <div class="date-property-prompt-content">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect
            x="2"
            y="3"
            width="16"
            height="15"
            rx="2"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <path d="M2 7.5H18" stroke="currentColor" stroke-width="1.2" />
          <path d="M6 1.5V4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M14 1.5V4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        <span class="date-property-label">Date property</span>
        <select
          class="date-property-select"
          @change="setDateProperty(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled selected>Select a date property</option>
          <option v-for="prop in dateProperties" :key="prop.id" :value="prop.id">
            {{ prop.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Date property bar when configured -->
    <div v-else class="calendar-date-property-bar">
      <span class="date-property-label">Date property</span>
      <select
        class="date-property-select"
        :value="datePropertyId"
        @change="setDateProperty(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="prop in dateProperties" :key="prop.id" :value="prop.id">
          {{ prop.name }}
        </option>
      </select>
    </div>

    <!-- Calendar content -->
    <div v-if="datePropertyId" class="calendar-content">
      <!-- Navigation header -->
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="calendar-nav-btn calendar-nav-prev" @click="navigatePrev">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="calendar-nav-btn calendar-nav-today" @click="navigateToday">Today</button>
          <button class="calendar-nav-btn calendar-nav-next" @click="navigateNext">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <span v-if="viewMode === 'month'" class="calendar-month-label">{{ monthLabel }}</span>
        <span v-else-if="viewMode === 'day'" class="calendar-month-label">{{ dayLabel }}</span>
        <span v-else class="calendar-month-label">{{ monthLabel }}</span>

        <!-- Mode switcher -->
        <div class="calendar-mode-switcher">
          <button
            class="calendar-mode-btn calendar-mode-btn--month"
            :class="{ active: viewMode === 'month' }"
            @click="setViewMode('month')"
          >
            Month
          </button>
          <button
            class="calendar-mode-btn calendar-mode-btn--week"
            :class="{ active: viewMode === 'week' }"
            @click="setViewMode('week')"
          >
            Week
          </button>
          <button
            class="calendar-mode-btn calendar-mode-btn--day"
            :class="{ active: viewMode === 'day' }"
            @click="setViewMode('day')"
          >
            Day
          </button>
        </div>
      </div>

      <!-- MONTH VIEW -->
      <div v-if="viewMode === 'month'" class="calendar-grid">
        <!-- Weekday headers -->
        <div v-for="day in weekdays" :key="day" class="calendar-weekday">
          {{ day }}
        </div>

        <!-- Day cells -->
        <div
          v-for="day in calendarDays"
          :key="day.dateStr"
          class="calendar-day"
          :class="{
            'calendar-day--today': day.isToday,
            'calendar-day--outside': !day.isCurrentMonth,
            'calendar-day--drop-target': dragOverDate === day.dateStr && dragEventId !== null,
          }"
          @dragover="onDayDragOver($event, day.dateStr)"
          @dragleave="onDayDragLeave"
          @drop="onDayDrop($event, day.dateStr)"
        >
          <span class="day-number">{{ day.dayNumber }}</span>
          <div class="day-events">
            <div
              v-for="event in eventsForDate(day.dateStr)"
              :key="event.rowId"
              class="calendar-event"
              :class="{ 'calendar-event--dragging': dragEventId === event.rowId }"
              draggable="true"
              @dragstart="onEventDragStart($event, event.rowId)"
              @dragend="onEventDragEnd"
            >
              {{ event.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- WEEK VIEW -->
      <div v-else-if="viewMode === 'week'" class="calendar-week-grid">
        <div
          v-for="day in weekDays"
          :key="day.dateStr"
          class="week-day-col"
          :class="{
            'calendar-day--today': day.isToday,
            'calendar-day--drop-target': dragOverDate === day.dateStr && dragEventId !== null,
          }"
          @dragover="onDayDragOver($event, day.dateStr)"
          @dragleave="onDayDragLeave"
          @drop="onDayDrop($event, day.dateStr)"
        >
          <div class="week-day-header">
            <span class="week-day-name">{{ weekdays[weekDays.indexOf(day)] }}</span>
            <span class="week-day-number" :class="{ 'today-badge': day.isToday }">{{
              day.dayNumber
            }}</span>
          </div>
          <div class="week-day-events">
            <div
              v-for="event in eventsForDate(day.dateStr)"
              :key="event.rowId"
              class="calendar-event"
              :class="{ 'calendar-event--dragging': dragEventId === event.rowId }"
              draggable="true"
              @dragstart="onEventDragStart($event, event.rowId)"
              @dragend="onEventDragEnd"
            >
              {{ event.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- DAY VIEW -->
      <div v-else class="calendar-day-view">
        <div class="day-view-events">
          <div v-for="event in dayEvents" :key="event.rowId" class="calendar-event day-view-event">
            {{ event.title }}
          </div>
          <div v-if="dayEvents.length === 0" class="day-view-empty">No events on this day</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Date property bar */
.calendar-date-property-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.calendar-date-property-prompt {
  flex: 1;
  justify-content: center;
  padding: var(--space-20) var(--space-6);
  border-bottom: none;
}

.date-property-prompt-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
}

.date-property-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.date-property-select {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.date-property-select:focus {
  border-color: var(--color-accent);
}

/* Calendar content */
.calendar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Header / navigation */
.calendar-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.calendar-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.calendar-nav-btn:hover {
  background: var(--color-hover);
  color: var(--color-text-primary);
}

.calendar-month-label {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

/* Mode switcher */
.calendar-mode-switcher {
  display: flex;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.calendar-mode-btn {
  padding: var(--space-1) var(--space-3);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-right: 1px solid var(--color-border);
  transition: all var(--transition-fast);
}

.calendar-mode-btn:last-child {
  border-right: none;
}

.calendar-mode-btn:hover {
  background: var(--color-hover);
  color: var(--color-text-secondary);
}

.calendar-mode-btn.active {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  font-weight: 600;
}

/* Grid */
.calendar-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 0;
}

/* Weekday headers */
.calendar-weekday {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border-subtle);
  user-select: none;
}

/* Day cells */
.calendar-day {
  display: flex;
  flex-direction: column;
  padding: var(--space-1) var(--space-2);
  min-height: 80px;
  border-right: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  transition: background var(--transition-fast);
  overflow: hidden;
}

.calendar-day:nth-child(7n + 14) {
  border-right: none;
}

.calendar-day--outside {
  background: var(--color-surface-sunken);
}

.calendar-day--outside .day-number {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.calendar-day--today .day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-weight: 700;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.calendar-day--drop-target {
  background: var(--color-accent-subtle);
  outline: 2px dashed var(--color-accent);
  outline-offset: -2px;
}

.day-number {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  line-height: 24px;
  user-select: none;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--space-1);
  overflow-y: auto;
}

/* Event chips */
.calendar-event {
  padding: 1px var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent-hover);
  background: var(--color-accent-muted);
  border-radius: var(--radius-sm);
  cursor: grab;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all var(--transition-fast);
  user-select: none;
}

.calendar-event:hover {
  background: var(--color-accent-subtle);
  box-shadow: var(--shadow-sm);
}

.calendar-event--dragging {
  opacity: 0.4;
  cursor: grabbing;
}

/* Week View */
.calendar-week-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 0;
}

.week-day-col {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border-subtle);
  min-height: 200px;
  transition: background var(--transition-fast);
}

.week-day-col:last-child {
  border-right: none;
}

.week-day-col.calendar-day--today {
  background: color-mix(in srgb, var(--color-accent) 4%, transparent);
}

.week-day-col.calendar-day--drop-target {
  background: var(--color-accent-subtle);
  outline: 2px dashed var(--color-accent);
  outline-offset: -2px;
}

.week-day-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  user-select: none;
}

.week-day-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.week-day-number {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.week-day-number.today-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-weight: 700;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.week-day-events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2);
  overflow-y: auto;
}

/* Day View */
.calendar-day-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-6);
  min-height: 0;
}

.day-view-events {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.day-view-event {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
}

.day-view-empty {
  padding: var(--space-8);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}
</style>

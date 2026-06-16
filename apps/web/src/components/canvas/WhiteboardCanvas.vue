<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from './canvasTypes';
import { ELEMENT_DEFAULTS } from './canvasTypes';

// vue-konva components are globally registered via app.use(VueKonva) in main.ts

const props = defineProps<{
  elements: Record<string, CanvasElement>;
  activeTool: string;
}>();

const emit = defineEmits<{
  addElement: [el: CanvasElement];
  updateElement: [id: string, patch: Partial<CanvasElement>];
  deleteElement: [id: string];
}>();

const stageRef = shallowRef<any>(null);
const transformerRef = shallowRef<any>(null);
const selectedId = ref<string | null>(null);

const stageWidth = ref(window.innerWidth);
const stageHeight = ref(window.innerHeight - 120);
const scale = ref(1);
const stagePos = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const lastPointer = ref<{ x: number; y: number } | null>(null);

const stageConfig = computed(() => ({
  width: stageWidth.value,
  height: stageHeight.value,
  x: stagePos.value.x,
  y: stagePos.value.y,
  scaleX: scale.value,
  scaleY: scale.value,
  draggable: false,
}));

const elementList = computed(() => Object.values(props.elements));

function getPointerOnCanvas() {
  const stage = stageRef.value?.getStage();
  const pos = stage?.getPointerPosition();
  if (!pos) return null;
  return {
    x: (pos.x - stagePos.value.x) / scale.value,
    y: (pos.y - stagePos.value.y) / scale.value,
  };
}

function handleStageClick(e: any) {
  if (e.target === e.target.getStage()) {
    selectedId.value = null;
    transformerRef.value?.getNode()?.nodes([]);
    return;
  }
  if (props.activeTool === 'select') return;

  const pos = getPointerOnCanvas();
  if (!pos) return;

  const defaults = ELEMENT_DEFAULTS[props.activeTool as keyof typeof ELEMENT_DEFAULTS] ?? {};
  const w = (defaults.width ?? 160) as number;
  const h = (defaults.height ?? 100) as number;

  const el: CanvasElement = {
    id: uuidv4(),
    type: props.activeTool as CanvasElement['type'],
    x: pos.x - w / 2,
    y: pos.y - h / 2,
    width: w,
    height: h,
    ...defaults,
  } as CanvasElement;

  if (el.type === 'arrow') {
    el.x2 = el.x + 150;
    el.y2 = el.y;
  }

  emit('addElement', el);
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const scaleBy = 1.08;
  const stage = stageRef.value?.getStage();
  if (!stage) return;

  const oldScale = scale.value;
  const pointer = stage.getPointerPosition()!;
  const mousePointTo = {
    x: (pointer.x - stagePos.value.x) / oldScale,
    y: (pointer.y - stagePos.value.y) / oldScale,
  };

  const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
  scale.value = Math.max(0.1, Math.min(5, newScale));
  stagePos.value = {
    x: pointer.x - mousePointTo.x * scale.value,
    y: pointer.y - mousePointTo.y * scale.value,
  };
}

function handleMouseDown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning.value = true;
    lastPointer.value = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isPanning.value || !lastPointer.value) return;
  stagePos.value = {
    x: stagePos.value.x + (e.clientX - lastPointer.value.x),
    y: stagePos.value.y + (e.clientY - lastPointer.value.y),
  };
  lastPointer.value = { x: e.clientX, y: e.clientY };
}

function handleMouseUp() {
  isPanning.value = false;
  lastPointer.value = null;
}

function selectElement(id: string, konvaNode: any) {
  if (props.activeTool !== 'select') return;
  selectedId.value = id;
  const tr = transformerRef.value?.getNode();
  if (tr) {
    tr.nodes([konvaNode]);
    tr.getLayer()?.batchDraw();
  }
}

function handleDragEnd(id: string, e: any) {
  emit('updateElement', id, { x: e.target.x(), y: e.target.y() });
}

function handleTransformEnd(id: string, e: any) {
  const node = e.target;
  emit('updateElement', id, {
    x: node.x(),
    y: node.y(),
    width: Math.max(20, node.width() * node.scaleX()),
    height: Math.max(20, node.height() * node.scaleY()),
    rotation: node.rotation(),
  });
  node.scaleX(1);
  node.scaleY(1);
}

function handleTextDblClick(id: string, e: any) {
  const stage = stageRef.value?.getStage();
  const node = e.target;
  node.hide();
  stage?.draw();

  const containerRect = stage?.container().getBoundingClientRect();
  const absPos = node.absolutePosition();

  const textarea = document.createElement('textarea');
  textarea.value = props.elements[id]?.text ?? '';
  textarea.style.cssText = [
    `position:fixed`,
    `left:${(containerRect?.left ?? 0) + absPos.x}px`,
    `top:${(containerRect?.top ?? 0) + absPos.y}px`,
    `width:${Math.max(120, node.width() * scale.value)}px`,
    `min-height:${Math.max(28, node.height() * scale.value)}px`,
    `font-size:${14 * scale.value}px`,
    `padding:6px`,
    `border:2px solid #6b8f71`,
    `border-radius:4px`,
    `resize:none`,
    `outline:none`,
    `background:transparent`,
    `font-family:inherit`,
    `z-index:9999`,
  ].join(';');
  document.body.appendChild(textarea);
  textarea.focus();

  function finish() {
    emit('updateElement', id, { text: textarea.value });
    textarea.remove();
    node.show();
    stage?.draw();
  }
  textarea.addEventListener('blur', finish, { once: true });
  textarea.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') textarea.blur();
  });
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId.value) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    emit('deleteElement', selectedId.value);
    selectedId.value = null;
    transformerRef.value?.getNode()?.nodes([]);
  }
}

function exportAsPng() {
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'canvas.png';
  a.click();
}

defineExpose({ exportAsPng });
</script>

<template>
  <div
    class="canvas-wrap"
    :class="{ panning: isPanning }"
    tabindex="0"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @keydown="handleKeyDown"
  >
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      :style="{ cursor: isPanning ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }"
      @click="handleStageClick"
    >
      <v-layer>
        <!-- Sticky Notes -->
        <template v-for="el in elementList" :key="el.id">
          <v-group
            v-if="el.type === 'sticky'"
            :config="{
              x: el.x, y: el.y,
              draggable: activeTool === 'select',
              rotation: el.rotation ?? 0,
            }"
            @dragend="(e: any) => handleDragEnd(el.id, e)"
            @click="(e: any) => selectElement(el.id, e.target.parent)"
          >
            <v-rect
              :config="{
                width: el.width, height: el.height,
                fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth,
                cornerRadius: 4,
                shadowColor: 'rgba(0,0,0,0.12)', shadowBlur: 8, shadowOffsetY: 3,
              }"
            />
            <v-text
              :config="{
                text: el.text, width: el.width, height: el.height,
                padding: 10, fontSize: 14, fill: '#374151', wrap: 'word',
              }"
              @dblclick="(e: any) => handleTextDblClick(el.id, e)"
            />
          </v-group>

          <!-- Rectangle -->
          <v-rect
            v-else-if="el.type === 'rectangle'"
            :config="{
              x: el.x, y: el.y, width: el.width, height: el.height,
              fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth,
              cornerRadius: 4, draggable: activeTool === 'select', rotation: el.rotation ?? 0,
            }"
            @dragend="(e: any) => handleDragEnd(el.id, e)"
            @transformend="(e: any) => handleTransformEnd(el.id, e)"
            @click="(e: any) => selectElement(el.id, e.target)"
          />

          <!-- Circle -->
          <v-circle
            v-else-if="el.type === 'circle'"
            :config="{
              x: el.x + el.width / 2, y: el.y + el.height / 2,
              radius: el.width / 2,
              fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth,
              draggable: activeTool === 'select',
            }"
            @dragend="(e: any) => handleDragEnd(el.id, e)"
            @click="(e: any) => selectElement(el.id, e.target)"
          />

          <!-- Arrow -->
          <v-line
            v-else-if="el.type === 'arrow'"
            :config="{
              points: [el.x, el.y, el.x2 ?? el.x + 150, el.y2 ?? el.y],
              stroke: el.stroke, strokeWidth: el.strokeWidth,
              lineCap: 'round', lineJoin: 'round',
              draggable: activeTool === 'select',
            }"
            @dragend="(e: any) => handleDragEnd(el.id, e)"
            @click="(e: any) => selectElement(el.id, e.target)"
          />

          <!-- Text -->
          <v-text
            v-else-if="el.type === 'text'"
            :config="{
              x: el.x, y: el.y, text: el.text,
              fontSize: 16, fill: '#111827',
              draggable: activeTool === 'select', rotation: el.rotation ?? 0,
            }"
            @dragend="(e: any) => handleDragEnd(el.id, e)"
            @dblclick="(e: any) => handleTextDblClick(el.id, e)"
            @click="(e: any) => selectElement(el.id, e.target)"
          />
        </template>

        <!-- Selection transformer -->
        <v-transformer
          ref="transformerRef"
          :config="{
            rotateEnabled: true,
            borderStroke: '#6b8f71',
            anchorStroke: '#6b8f71',
            anchorFill: '#ffffff',
            anchorSize: 8,
          }"
        />
      </v-layer>
    </v-stage>

    <!-- Zoom indicator -->
    <div class="zoom-indicator">{{ Math.round(scale * 100) }}%</div>

    <!-- Hint bar -->
    <div class="canvas-hint">
      Alt+drag or middle-click to pan · Scroll to zoom · Del to delete selected
    </div>
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-surface, #f8fafc);
  background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
  background-size: 24px 24px;
  outline: none;
}

.canvas-wrap.panning {
  cursor: grabbing !important;
}

.zoom-indicator {
  position: absolute;
  right: var(--space-4, 1rem);
  bottom: var(--space-4, 1rem);
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-text-tertiary, #94a3b8);
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  user-select: none;
  pointer-events: none;
}

.canvas-hint {
  position: absolute;
  bottom: var(--space-4, 1rem);
  left: 50%;
  padding: 2px 12px;
  font-size: 11px;
  color: var(--color-text-tertiary, #94a3b8);
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  transform: translateX(-50%);
  user-select: none;
  pointer-events: none;
}
</style>

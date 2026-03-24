<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Annotation, AnnotationToolState, FreehandAnnotation } from './types';

const props = defineProps<{
  imageWidth: number;
  imageHeight: number;
  annotations: Annotation[];
  toolState: AnnotationToolState;
  active: boolean;
}>();

const emit = defineEmits<{
  'annotation:create': [annotation: Annotation];
  'annotation:update': [annotation: Annotation];
  'annotation:delete': [annotationId: string];
}>();

// Drawing state
const isDrawing = ref(false);
const currentPoints = ref<number[]>([]);
const drawStart = ref<{ x: number; y: number } | null>(null);

const stageConfig = computed(() => ({
  width: props.imageWidth,
  height: props.imageHeight,
}));

const cursorStyle = computed(() => {
  if (props.toolState.activeTool === 'select') return 'default';
  if (props.toolState.activeTool === 'text') return 'text';
  return 'crosshair';
});

const isDrawingTool = computed(() =>
  ['freehand', 'rectangle', 'ellipse', 'arrow'].includes(props.toolState.activeTool)
);

function generateId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function handleStageMouseDown(e: {
  evt: MouseEvent;
  target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } };
}) {
  if (
    !isDrawingTool.value &&
    props.toolState.activeTool !== 'text' &&
    props.toolState.activeTool !== 'pin'
  )
    return;

  const stage = e.target.getStage();
  const pos = stage.getPointerPosition();
  if (!pos) return;

  if (props.toolState.activeTool === 'text') {
    const annotation: Annotation = {
      id: generateId(),
      type: 'text',
      x: pos.x,
      y: pos.y,
      text: 'Text',
      fontSize: props.toolState.fontSize,
      fill: props.toolState.strokeColour,
      stroke: props.toolState.strokeColour,
      strokeWidth: 0,
      opacity: 1,
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    emit('annotation:create', annotation);
    return;
  }

  if (props.toolState.activeTool === 'pin') {
    const existingPins = props.annotations.filter((a) => a.type === 'pin');
    const annotation: Annotation = {
      id: generateId(),
      type: 'pin',
      x: pos.x,
      y: pos.y,
      comment: '',
      pinNumber: existingPins.length + 1,
      stroke: props.toolState.strokeColour,
      strokeWidth: props.toolState.strokeWidth,
      opacity: 1,
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    emit('annotation:create', annotation);
    return;
  }

  isDrawing.value = true;
  drawStart.value = pos;

  if (props.toolState.activeTool === 'freehand') {
    currentPoints.value = [pos.x, pos.y];
  }
}

function handleStageMouseMove(e: {
  evt: MouseEvent;
  target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } };
}) {
  if (!isDrawing.value) return;

  const stage = e.target.getStage();
  const pos = stage.getPointerPosition();
  if (!pos) return;

  if (props.toolState.activeTool === 'freehand') {
    currentPoints.value = [...currentPoints.value, pos.x, pos.y];
  }
}

function handleStageMouseUp() {
  if (!isDrawing.value || !drawStart.value) return;

  isDrawing.value = false;

  if (props.toolState.activeTool === 'freehand' && currentPoints.value.length > 2) {
    const annotation: Annotation = {
      id: generateId(),
      type: 'freehand',
      x: 0,
      y: 0,
      points: [...currentPoints.value],
      stroke: props.toolState.strokeColour,
      strokeWidth: props.toolState.strokeWidth,
      opacity: 1,
      createdBy: '',
      createdAt: new Date().toISOString(),
    };
    emit('annotation:create', annotation);
  }

  currentPoints.value = [];
  drawStart.value = null;
}

// Konva configs for each annotation type
function freehandConfig(ann: FreehandAnnotation) {
  return {
    points: ann.points,
    stroke: ann.stroke,
    strokeWidth: ann.strokeWidth,
    opacity: ann.opacity,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    tension: 0.5,
    globalCompositeOperation: 'source-over' as const,
  };
}

function rectConfig(ann: Annotation & { type: 'rectangle' }) {
  return {
    x: ann.x,
    y: ann.y,
    width: ann.width,
    height: ann.height,
    stroke: ann.stroke,
    strokeWidth: ann.strokeWidth,
    fill: ann.fill,
    opacity: ann.opacity,
    cornerRadius: 2,
  };
}

function ellipseConfig(ann: Annotation & { type: 'ellipse' }) {
  return {
    x: ann.x,
    y: ann.y,
    radiusX: ann.radiusX,
    radiusY: ann.radiusY,
    stroke: ann.stroke,
    strokeWidth: ann.strokeWidth,
    fill: ann.fill,
    opacity: ann.opacity,
  };
}

function arrowConfig(ann: Annotation & { type: 'arrow' }) {
  return {
    points: ann.points,
    stroke: ann.stroke,
    strokeWidth: ann.strokeWidth,
    opacity: ann.opacity,
    pointerLength: 10,
    pointerWidth: 8,
    fill: ann.stroke,
  };
}

function textConfig(ann: Annotation & { type: 'text' }) {
  return {
    x: ann.x,
    y: ann.y,
    text: ann.text,
    fontSize: ann.fontSize,
    fill: ann.fill,
    opacity: ann.opacity,
  };
}

function pinGroupConfig(ann: Annotation & { type: 'pin' }) {
  return {
    x: ann.x,
    y: ann.y,
  };
}

function pinMarkerConfig(ann: Annotation & { type: 'pin' }) {
  return {
    radius: 12,
    fill: ann.stroke,
    opacity: ann.opacity,
    stroke: '#ffffff',
    strokeWidth: 2,
  };
}

function pinNumberConfig(ann: Annotation & { type: 'pin' }) {
  return {
    text: String(ann.pinNumber),
    fontSize: 11,
    fontStyle: 'bold',
    fill: '#ffffff',
    width: 24,
    height: 24,
    align: 'center',
    verticalAlign: 'middle',
    offsetX: 12,
    offsetY: 12,
  };
}

// Current drawing preview config
const previewLineConfig = computed(() => {
  if (props.toolState.activeTool !== 'freehand' || currentPoints.value.length < 2) return null;
  return {
    points: currentPoints.value,
    stroke: props.toolState.strokeColour,
    strokeWidth: props.toolState.strokeWidth,
    opacity: 0.6,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    tension: 0.5,
    dash: [8, 4],
  };
});
</script>

<template>
  <div
    v-if="active"
    class="annotation-layer"
    :style="{ width: `${imageWidth}px`, height: `${imageHeight}px`, cursor: cursorStyle }"
  >
    <v-stage
      ref="stageRef"
      data-testid="konva-stage"
      :config="stageConfig"
      @mousedown="handleStageMouseDown"
      @mousemove="handleStageMouseMove"
      @mouseup="handleStageMouseUp"
      @touchstart="handleStageMouseDown"
      @touchmove="handleStageMouseMove"
      @touchend="handleStageMouseUp"
    >
      <v-layer>
        <!-- Existing annotations -->
        <template v-for="ann in annotations" :key="ann.id">
          <!-- Freehand -->
          <v-line v-if="ann.type === 'freehand'" :config="freehandConfig(ann)" />

          <!-- Rectangle -->
          <v-rect v-else-if="ann.type === 'rectangle'" :config="rectConfig(ann)" />

          <!-- Ellipse -->
          <v-ellipse v-else-if="ann.type === 'ellipse'" :config="ellipseConfig(ann)" />

          <!-- Arrow -->
          <v-arrow v-else-if="ann.type === 'arrow'" :config="arrowConfig(ann)" />

          <!-- Text -->
          <v-text v-else-if="ann.type === 'text'" :config="textConfig(ann)" />

          <!-- Pin comment -->
          <v-group v-else-if="ann.type === 'pin'" :config="pinGroupConfig(ann)">
            <v-circle :config="pinMarkerConfig(ann)" />
            <v-text :config="pinNumberConfig(ann)" />
          </v-group>
        </template>

        <!-- Drawing preview (current stroke in progress) -->
        <v-line v-if="previewLineConfig" :config="previewLineConfig" />
      </v-layer>
    </v-stage>
  </div>
</template>

<style scoped>
.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  pointer-events: auto;
  user-select: none;
}
</style>

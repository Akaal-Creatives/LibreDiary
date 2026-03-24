<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AnnotationLayer from './AnnotationLayer.vue';
import { DEFAULT_TOOL_STATE } from './types';
import type { Annotation, AnnotationToolState } from './types';

const props = defineProps<{
  node: { attrs: { src: string; alt?: string | null; title?: string | null } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  editor: { isEditable: boolean };
}>();

const annotating = ref(false);
const annotations = ref<Annotation[]>([]);
const toolState = ref<AnnotationToolState>({ ...DEFAULT_TOOL_STATE });
const imageRef = ref<HTMLImageElement | null>(null);
const imageWidth = ref(0);
const imageHeight = ref(0);

const imageSrc = computed(() => props.node.attrs.src);
const imageAlt = computed(() => props.node.attrs.alt ?? '');

function activateAnnotations() {
  annotating.value = true;
}

function deactivateAnnotations() {
  annotating.value = false;
  toolState.value = { ...DEFAULT_TOOL_STATE };
}

function handleAnnotationCreate(annotation: Annotation) {
  annotations.value = [...annotations.value, annotation];
}

function handleAnnotationUpdate(annotation: Annotation) {
  annotations.value = annotations.value.map((a) => (a.id === annotation.id ? annotation : a));
}

function handleAnnotationDelete(annotationId: string) {
  annotations.value = annotations.value.filter((a) => a.id !== annotationId);
}

function updateImageDimensions() {
  if (imageRef.value) {
    imageWidth.value = imageRef.value.naturalWidth || imageRef.value.clientWidth || 800;
    imageHeight.value = imageRef.value.naturalHeight || imageRef.value.clientHeight || 600;
  }
}

onMounted(() => {
  if (imageRef.value?.complete) {
    updateImageDimensions();
  }
});
</script>

<template>
  <div class="image-node-view" data-drag-handle>
    <div class="image-node-view__image-wrapper" role="img" :aria-label="imageAlt">
      <img
        ref="imageRef"
        :src="imageSrc"
        :alt="imageAlt"
        class="image-node-view__image"
        draggable="false"
        @load="updateImageDimensions"
      />

      <!-- Annotate button (visible on hover) -->
      <button
        v-if="!annotating"
        data-testid="annotate-btn"
        class="image-node-view__annotate-btn"
        aria-label="Annotate image"
        @click.stop="activateAnnotations"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- Close annotations button -->
      <button
        v-if="annotating"
        data-testid="close-annotations-btn"
        class="image-node-view__close-btn"
        aria-label="Close annotations"
        @click.stop="deactivateAnnotations"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- Annotation overlay -->
      <AnnotationLayer
        v-if="annotating"
        :image-width="imageWidth"
        :image-height="imageHeight"
        :annotations="annotations"
        :tool-state="toolState"
        :active="annotating"
        @annotation:create="handleAnnotationCreate"
        @annotation:update="handleAnnotationUpdate"
        @annotation:delete="handleAnnotationDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.image-node-view {
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: var(--space-2) 0;
  line-height: 0;
}

.image-node-view__image-wrapper {
  position: relative;
  display: inline-block;
  border-radius: var(--radius-md, 6px);
  overflow: hidden;
}

.image-node-view__image {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md, 6px);
}

/* Annotate button — positioned top-right, visible on hover */
.image-node-view__annotate-btn,
.image-node-view__close-btn {
  position: absolute;
  top: var(--space-2, 8px);
  right: var(--space-2, 8px);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-primary, #2c2f2c);
  cursor: pointer;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8e2);
  border-radius: var(--radius-sm, 4px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition:
    opacity var(--transition-fast, 150ms),
    background var(--transition-fast, 150ms);
}

.image-node-view:hover .image-node-view__annotate-btn,
.image-node-view:hover .image-node-view__close-btn,
.image-node-view__annotate-btn:focus-visible,
.image-node-view__close-btn:focus-visible {
  opacity: 1;
}

/* Always show close button when annotating */
.image-node-view__close-btn {
  opacity: 1;
  background: var(--color-error, #c45c5c);
  color: var(--color-text-inverse, #ffffff);
  border-color: var(--color-error, #c45c5c);
}

.image-node-view__annotate-btn:hover {
  background: var(--color-accent-subtle, rgba(107, 143, 113, 0.1));
  border-color: var(--color-accent, #6b8f71);
}

.image-node-view__close-btn:hover {
  background: #b04848;
}
</style>

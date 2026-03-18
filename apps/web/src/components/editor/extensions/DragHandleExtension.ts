import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

const dragHandlePluginKey = new PluginKey('dragHandle');

const HANDLE_SIZE = 24;

export const DragHandleExtension = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dragHandlePluginKey,
        state: {
          init() {
            return {
              handle: null as HTMLElement | null,
              dropIndicator: null as HTMLElement | null,
              draggedBlockPos: null as number | null,
              hoveredBlockPos: null as number | null,
            };
          },
          apply(_tr, value) {
            return value;
          },
        },
        view(editorView) {
          const state = dragHandlePluginKey.getState(editorView.state);
          if (!state) return {};

          // Create drag handle element — positioned inside the editor
          // to avoid being clipped by ancestor overflow: auto containers
          const handle = document.createElement('div');
          handle.className = 'drag-handle';
          handle.style.cssText = `
            position: absolute;
            left: 0;
            width: ${HANDLE_SIZE}px;
            height: ${HANDLE_SIZE}px;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: grab;
            color: var(--color-text-tertiary);
            border-radius: var(--radius-sm, 4px);
            transition: color var(--transition-fast), background-color var(--transition-fast);
            z-index: 50;
            user-select: none;
          `;

          // Create SVG element safely
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '16');
          svg.setAttribute('height', '16');
          svg.setAttribute('viewBox', '0 0 20 20');
          svg.setAttribute('fill', 'currentColor');

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute(
            'd',
            'M8 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6-12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z'
          );

          svg.appendChild(path);
          handle.appendChild(svg);

          // Add hover effect
          handle.addEventListener('mouseenter', () => {
            handle.style.color = 'var(--color-text-secondary)';
            handle.style.backgroundColor = 'var(--color-hover, rgba(0,0,0,0.05))';
          });
          handle.addEventListener('mouseleave', () => {
            handle.style.color = 'var(--color-text-tertiary)';
            handle.style.backgroundColor = 'transparent';
          });

          // Create drop indicator
          const dropIndicator = document.createElement('div');
          dropIndicator.className = 'drop-indicator';
          dropIndicator.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--color-accent);
            display: none;
            z-index: 50;
            pointer-events: none;
          `;

          // Add to editor container
          const editorElement = editorView.dom.parentElement;
          if (editorElement) {
            editorElement.style.position = 'relative';
            editorElement.appendChild(handle);
            editorElement.appendChild(dropIndicator);
          }

          state.handle = handle;
          state.dropIndicator = dropIndicator;

          // Helper: Get top-level blocks
          const getTopLevelBlocks = () => {
            const blocks: { node: ProseMirrorNode; pos: number; dom: HTMLElement | null }[] = [];
            const doc = editorView.state.doc;

            doc.forEach((node, offset) => {
              const dom = editorView.nodeDOM(offset) as HTMLElement | null;
              blocks.push({ node, pos: offset, dom });
            });

            return blocks;
          };

          // Helper: Find closest block to mouse Y
          const findClosestBlock = (
            mouseY: number
          ): { node: ProseMirrorNode; pos: number; dom: HTMLElement | null } | null => {
            const blocks = getTopLevelBlocks();
            if (blocks.length === 0) return null;

            let closest: (typeof blocks)[number] | null = null;
            let minDistance = Infinity;

            for (const block of blocks) {
              if (!block.dom) continue;

              const rect = block.dom.getBoundingClientRect();
              const blockCenterY = rect.top + rect.height / 2;
              const distance = Math.abs(blockCenterY - mouseY);

              if (distance < minDistance) {
                minDistance = distance;
                closest = block;
              }
            }

            return closest;
          };

          // Helper: Position handle next to block
          const positionHandle = (
            block: { node: ProseMirrorNode; pos: number; dom: HTMLElement | null } | null
          ) => {
            if (!block || !block.dom) {
              handle.style.display = 'none';
              state.hoveredBlockPos = null;
              return;
            }

            const rect = block.dom.getBoundingClientRect();
            const editorRect = editorView.dom.getBoundingClientRect();

            handle.style.display = 'flex';
            handle.style.top = `${rect.top - editorRect.top + (rect.height - HANDLE_SIZE) / 2}px`;
            state.hoveredBlockPos = block.pos;
          };

          // Mouse move handler
          const handleMouseMove = (event: MouseEvent) => {
            const editorRect = editorView.dom.getBoundingClientRect();
            const isInEditor =
              event.clientX >= editorRect.left &&
              event.clientX <= editorRect.right &&
              event.clientY >= editorRect.top &&
              event.clientY <= editorRect.bottom;

            if (!isInEditor) {
              handle.style.display = 'none';
              state.hoveredBlockPos = null;
              return;
            }

            const closestBlock = findClosestBlock(event.clientY);
            positionHandle(closestBlock);
          };

          // Mouse leave handler
          const handleMouseLeave = () => {
            handle.style.display = 'none';
            state.hoveredBlockPos = null;
          };

          // Drag start handler
          const handleDragStart = (event: DragEvent) => {
            if (state.hoveredBlockPos === null) return;

            event.dataTransfer!.effectAllowed = 'move';
            event.dataTransfer!.setData('text/plain', state.hoveredBlockPos.toString());

            state.draggedBlockPos = state.hoveredBlockPos;
            handle.style.cursor = 'grabbing';

            // Add opacity to dragged block
            const blocks = getTopLevelBlocks();
            const draggedBlock = blocks.find((b) => b.pos === state.draggedBlockPos);
            if (draggedBlock?.dom) {
              draggedBlock.dom.style.opacity = '0.5';
            }
          };

          // Drag over handler
          const handleDragOver = (event: DragEvent) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'move';

            if (state.draggedBlockPos === null) return;

            // Find insertion position
            const mouseY = event.clientY;
            const blocks = getTopLevelBlocks();

            let insertPos: number | null = null;
            let indicatorY: number | null = null;

            for (let i = 0; i < blocks.length; i++) {
              const block = blocks[i]!;
              if (!block.dom) continue;

              const rect = block.dom.getBoundingClientRect();
              const blockMiddle = rect.top + rect.height / 2;

              if (mouseY < blockMiddle) {
                // Insert before this block
                insertPos = block.pos;
                indicatorY = rect.top;
                break;
              }
            }

            // If no position found, insert at end
            if (insertPos === null && blocks.length > 0) {
              const lastBlock = blocks[blocks.length - 1]!;
              if (lastBlock.dom) {
                const rect = lastBlock.dom.getBoundingClientRect();
                insertPos = lastBlock.pos + lastBlock.node.nodeSize;
                indicatorY = rect.bottom;
              }
            }

            // Show drop indicator
            if (indicatorY !== null) {
              const editorRect = editorView.dom.getBoundingClientRect();
              dropIndicator.style.display = 'block';
              dropIndicator.style.top = `${indicatorY - editorRect.top}px`;
            }
          };

          // Drag leave handler
          const handleDragLeave = (event: DragEvent) => {
            // Only hide if leaving the editor entirely
            const editorRect = editorView.dom.getBoundingClientRect();
            if (
              event.clientX < editorRect.left ||
              event.clientX > editorRect.right ||
              event.clientY < editorRect.top ||
              event.clientY > editorRect.bottom
            ) {
              dropIndicator.style.display = 'none';
            }
          };

          // Drop handler
          const handleDrop = (event: DragEvent) => {
            event.preventDefault();
            dropIndicator.style.display = 'none';

            if (state.draggedBlockPos === null) return;

            const mouseY = event.clientY;
            const blocks = getTopLevelBlocks();

            // Find source block
            const sourceIndex = blocks.findIndex((b) => b.pos === state.draggedBlockPos);
            if (sourceIndex === -1) return;

            const sourceBlock = blocks[sourceIndex]!;

            // Find target position
            let targetIndex = blocks.length;
            for (let i = 0; i < blocks.length; i++) {
              const block = blocks[i]!;
              if (!block.dom) continue;

              const rect = block.dom.getBoundingClientRect();
              const blockMiddle = rect.top + rect.height / 2;

              if (mouseY < blockMiddle) {
                targetIndex = i;
                break;
              }
            }

            // Don't move if dropped in same position
            if (targetIndex === sourceIndex || targetIndex === sourceIndex + 1) {
              return;
            }

            // Calculate positions
            const sourcePos = sourceBlock.pos;
            const sourceNode = sourceBlock.node;
            const sourceSize = sourceNode.nodeSize;

            // Adjust target position based on whether we're moving forward or backward
            let targetPos: number;
            if (targetIndex > sourceIndex) {
              // Moving forward: target is after removal
              const prevBlock = blocks[targetIndex - 1]!;
              targetPos = prevBlock.pos + prevBlock.node.nodeSize;
            } else {
              // Moving backward
              targetPos = blocks[targetIndex]!.pos;
            }

            // Perform the move
            const { tr } = editorView.state;

            // First, delete from source
            tr.delete(sourcePos, sourcePos + sourceSize);

            // Adjust target position if we deleted before it
            if (sourcePos < targetPos) {
              targetPos -= sourceSize;
            }

            // Insert at target
            tr.insert(targetPos, sourceNode);

            editorView.dispatch(tr);
          };

          // Drag end handler
          const handleDragEnd = () => {
            dropIndicator.style.display = 'none';
            handle.style.cursor = 'grab';

            // Restore opacity
            if (state.draggedBlockPos !== null) {
              const blocks = getTopLevelBlocks();
              const draggedBlock = blocks.find((b) => b.pos === state.draggedBlockPos);
              if (draggedBlock?.dom) {
                draggedBlock.dom.style.opacity = '1';
              }
            }

            state.draggedBlockPos = null;
          };

          // Attach event listeners
          handle.draggable = true;
          handle.addEventListener('dragstart', handleDragStart);
          handle.addEventListener('dragend', handleDragEnd);

          editorView.dom.addEventListener('mousemove', handleMouseMove);
          editorView.dom.addEventListener('mouseleave', handleMouseLeave);
          editorView.dom.addEventListener('dragover', handleDragOver);
          editorView.dom.addEventListener('dragleave', handleDragLeave);
          editorView.dom.addEventListener('drop', handleDrop);

          return {
            destroy() {
              handle.removeEventListener('dragstart', handleDragStart);
              handle.removeEventListener('dragend', handleDragEnd);
              editorView.dom.removeEventListener('mousemove', handleMouseMove);
              editorView.dom.removeEventListener('mouseleave', handleMouseLeave);
              editorView.dom.removeEventListener('dragover', handleDragOver);
              editorView.dom.removeEventListener('dragleave', handleDragLeave);
              editorView.dom.removeEventListener('drop', handleDrop);

              handle.remove();
              dropIndicator.remove();
            },
          };
        },
      }),
    ];
  },
});

export type ElementType = 'sticky' | 'rectangle' | 'circle' | 'arrow' | 'text';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  // Arrow-specific: end point relative to stage
  x2?: number;
  y2?: number;
  rotation?: number;
}

export type CanvasElementMap = Record<string, CanvasElement>;

export const ELEMENT_DEFAULTS: Record<ElementType, Partial<CanvasElement>> = {
  sticky: { width: 180, height: 140, fill: '#fef08a', stroke: '#ca8a04', strokeWidth: 1, text: '' },
  rectangle: { width: 160, height: 100, fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 2 },
  circle: { width: 120, height: 120, fill: '#fce7f3', stroke: '#db2777', strokeWidth: 2 },
  arrow: { width: 150, height: 0, fill: 'transparent', stroke: '#374151', strokeWidth: 2 },
  text: { width: 200, height: 40, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, text: 'Text' },
};

/**
 * Annotation data model for image annotations.
 * Each annotation is stored as a Y.Map entry keyed by its ID.
 */

export type AnnotationTool =
  | 'select'
  | 'freehand'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'pin';

export interface BaseAnnotation {
  id: string;
  type: AnnotationTool;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  createdBy: string;
  createdAt: string;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: number[];
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  width: number;
  height: number;
  fill: string;
}

export interface EllipseAnnotation extends BaseAnnotation {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
  fill: string;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  points: number[]; // [x1, y1, x2, y2]
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
  fill: string;
}

export interface PinAnnotation extends BaseAnnotation {
  type: 'pin';
  comment: string;
  pinNumber: number;
}

export type Annotation =
  | FreehandAnnotation
  | RectangleAnnotation
  | EllipseAnnotation
  | ArrowAnnotation
  | TextAnnotation
  | PinAnnotation;

export interface AnnotationToolState {
  activeTool: AnnotationTool;
  strokeColour: string;
  strokeWidth: number;
  fontSize: number;
  fillColour: string;
  fillOpacity: number;
}

export const DEFAULT_TOOL_STATE: AnnotationToolState = {
  activeTool: 'select',
  strokeColour: '#ef4444',
  strokeWidth: 2,
  fontSize: 16,
  fillColour: '#ef4444',
  fillOpacity: 0.1,
};

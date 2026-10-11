import { Quaternion, Vector3 } from 'three';
import { modelInfo, models, supportsAutoHeading, type ModelId } from './models';

export type Axis = 'x' | 'y' | 'z';
export type DrawingMode = 'surface' | 'space';
export type DrawingDocument = { actions: Action[]; mode: DrawingMode };
export type Action = { id: string; kind: 'extend' | 'move' | 'turn' | 'spin' | 'color' | 'draw' | 'object'; value: number; axis: Axis; color: string; model?: ModelId; angle?: number; autoHeading?: boolean; continuous?: boolean; speed?: number; width?: number };
export type Point = [number, number, number];
export type Segment = { id: string; start: Point; end: Point; color: string };
export type Pen = { id: string; position: Point; color: string };
export type ObjectInstance = { id: string; model: ModelId; position: Point; rotation: [number, number, number, number]; size: number; color?: string; autoHeading: boolean };
export const colors = ['#bdcf51', '#70b9a4', '#f1b46c', '#ad9cda', '#ee8b8b'];
export const MAX_ACTIONS = 80;
export function isExtension(kind: Action['kind']) { return kind === 'extend' || kind === 'move'; }
export function isContinuous(item: Action) { return item.continuous ?? item.kind === 'spin'; }
// Original F/M motion: start at zero heading backward, reflect at +/- reach.
export function bounceDistance(reach: number, time: number, speed = reach * 2.5) {
  const phase = ((time * speed / reach + 1) % 4 + 4) % 4;
  return reach * (Math.abs(phase - 2) - 1);
}
export function action(kind: Action['kind'], options: Partial<Omit<Action, 'id' | 'kind'>> = {}): Action {
  return { id: crypto.randomUUID(), kind, value: kind === 'object' ? 1 : isExtension(kind) ? 1.4 : kind === 'spin' ? 30 : 45, axis: 'z', color: colors[0], ...(kind === 'object' ? { model: 'rocket' as const, angle: 0, ...(supportsAutoHeading(options.model) ? { autoHeading: true } : {}) } : {}), ...options };
}
const axes = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };
export function evaluate(actions: Action[], time: number, mode: DrawingMode = 'space') {
  const position = new Vector3();
  const rotation = mode === 'surface' ? new Quaternion().setFromAxisAngle(axes.x, -Math.PI / 2) : new Quaternion();
  let color = colors[0];
  const segments: Segment[] = [];
  const pens: Pen[] = [];
  const objects: ObjectInstance[] = [];
  const frames: { position: Point; direction: Point }[] = [];
  const frame = () => ({ position: position.toArray() as Point, direction: new Vector3(0, 1, 0).applyQuaternion(rotation).toArray() as Point });
  frames.push(frame());
  for (const item of actions) {
    if (item.kind === 'color') color = item.color;
    else if (item.kind === 'draw') pens.push({ id: item.id, position: position.toArray() as Point, color });
    else if (item.kind === 'object') {
      const model = item.model || 'rocket';
      const orientation = rotation.clone().multiply(new Quaternion().setFromAxisAngle(axes[item.axis], (item.angle || 0) * Math.PI / 180));
      objects.push({ id: item.id, model, position: position.toArray() as Point, rotation: orientation.toArray(), size: item.value, autoHeading: supportsAutoHeading(model) && item.autoHeading !== false, ...(modelInfo(model).inheritsColor ? { color } : {}) });
    }
    else if (isExtension(item.kind)) {
      const start = position.toArray() as Point;
      position.add(new Vector3(0, isContinuous(item) ? bounceDistance(item.value, time, item.speed) : item.value, 0).applyQuaternion(rotation));
      if (item.kind === 'extend') segments.push({ id: item.id, start, end: position.toArray() as Point, color });
    } else {
      const degrees = isContinuous(item) ? item.value * time : item.value;
      rotation.multiply(new Quaternion().setFromAxisAngle(axes[item.axis], degrees * Math.PI / 180));
    }
    frames.push(frame());
  }
  return { segments, frames, pens, objects };
}
export function makeExample(name: string): Action[] {
  if (name === 'Dragon flight') return [action('move', { value: 2 }), action('spin', { axis: 'z', value: 18 }), action('turn', { axis: 'z', value: -70 }), action('move', { value: 1.1 }), action('object', { model: 'dragon', value: 1.2 })];
  if (name === 'Rocket ride') return [...makeExample('Orbit').map(item => item.kind === 'extend' ? { ...item, kind: 'move' as const } : item), action('object', { model: 'rocket', value: 0.7 }), action('draw')];
  if (name === 'Ink orbit') return [...makeExample('Orbit'), action('draw')];
  if (name === 'First steps') return [action('extend'), action('turn'), action('extend'), action('turn', { value: -90, axis: 'x' }), action('color', { color: colors[1] }), action('extend')];
  if (name === 'Orbit') return [action('extend', { value: 1 }), action('spin', { axis: 'y', value: 40 }), action('turn', { axis: 'z', value: 70 }), action('extend', { value: 2 }), action('spin', { axis: 'x', value: -55 }), action('color', { color: colors[3] }), action('extend', { value: 1.5 }), action('turn', { value: 65 }), action('extend', { value: 1 })];
  const result = [action('spin', { axis: 'y', value: 22 }), action('turn', { axis: 'z', value: -25 })];
  for (let i = 0; i < 9; i++) {
    if (i % 3 === 0) result.push(action('color', { color: colors[i / 3] }));
    result.push(action('extend', { value: 1.1 }), action('turn', { value: 48 }), action('turn', { axis: 'x', value: 24 }));
  }
  return result;
}
export function label(item: Action) {
  if (item.kind === 'extend') return 'Extend draw';
  if (item.kind === 'move') return 'Extend move';
  if (item.kind === 'color') return 'Color';
  if (item.kind === 'draw') return 'Draw';
  if (item.kind === 'object') return modelInfo(item.model).name;
  return item.axis === 'z' ? (item.value < 0 ? 'Turn right' : 'Turn left') : item.axis === 'x' ? (item.value < 0 ? 'Tilt down' : 'Tilt up') : (item.value < 0 ? 'Twist right' : 'Twist left');
}
export function detail(item: Action) {
  if (item.kind === 'object') return `${item.value}× · ${modelInfo(item.model).inheritsColor ? 'drawing color' : 'built-in colors'}`;
  if (item.kind === 'draw') return `${item.width ?? 0.02} units · ink`;
  if (item.kind === 'color') return item.color;
  if (isExtension(item.kind)) return isContinuous(item) ? `±${item.value} units · bounce` : `${item.value} units`;
  return `${item.value}°${isContinuous(item) ? '/s' : ''} · ${item.axis.toUpperCase()}`;
}
export function validDocument(value: unknown): value is Action[] {
  return Array.isArray(value) && value.length <= MAX_ACTIONS && new Set(value.map(a => a?.id)).size === value.length && value.every(a => a && typeof a.id === 'string' && ['extend', 'move', 'turn', 'spin', 'color', 'draw', 'object'].includes(a.kind) && ['x', 'y', 'z'].includes(a.axis) && typeof a.value === 'number' && Number.isFinite(a.value) && Math.abs(a.value) <= 360 && (!isExtension(a.kind) || (a.value >= 0.2 && a.value <= 4)) && (a.kind !== 'object' || (models.some(m => m.id === a.model) && a.value >= 0.2 && a.value <= 3 && typeof a.angle === 'number' && Number.isFinite(a.angle) && Math.abs(a.angle) <= 180)) && (a.continuous === undefined || typeof a.continuous === 'boolean') && (a.speed === undefined || (typeof a.speed === 'number' && Number.isFinite(a.speed) && a.speed > 0 && a.speed <= 20)) && (a.width === undefined || (typeof a.width === 'number' && Number.isFinite(a.width) && a.width >= 0.02 && a.width <= 0.18)) && (a.autoHeading === undefined || typeof a.autoHeading === 'boolean') && /^#[0-9a-f]{6}$/i.test(a.color));
}

// Older saves were action arrays authored in space; preserve their orientation.
export function parseDrawingDocument(value: unknown): DrawingDocument | null {
  if (validDocument(value)) return { actions: value, mode: 'space' };
  if (value && typeof value === 'object' && 'actions' in value && 'mode' in value && validDocument(value.actions) && (value.mode === 'surface' || value.mode === 'space')) return { actions: value.actions, mode: value.mode };
  return null;
}

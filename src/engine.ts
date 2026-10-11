import { Quaternion, Vector3 } from 'three';
import { modelInfo, models, type ModelId } from './models';

export type Axis = 'x' | 'y' | 'z';
export type Action = { id: string; kind: 'extend' | 'turn' | 'spin' | 'color' | 'draw' | 'object'; value: number; axis: Axis; color: string; model?: ModelId; angle?: number };
export type Point = [number, number, number];
export type Segment = { id: string; start: Point; end: Point; color: string };
export type Pen = { id: string; position: Point; color: string };
export type ObjectInstance = { id: string; model: ModelId; position: Point; rotation: [number, number, number, number]; size: number; color?: string };
export const colors = ['#bdcf51', '#70b9a4', '#f1b46c', '#ad9cda', '#ee8b8b'];
export const MAX_ACTIONS = 80;
export function action(kind: Action['kind'], options: Partial<Omit<Action, 'id' | 'kind'>> = {}): Action {
  return { id: crypto.randomUUID(), kind, value: kind === 'object' ? 1 : kind === 'extend' ? 1.4 : kind === 'spin' ? 30 : 45, axis: 'z', color: colors[0], ...(kind === 'object' ? { model: 'rocket' as const, angle: 0 } : {}), ...options };
}
const axes = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };
export function evaluate(actions: Action[], time: number) {
  const position = new Vector3();
  const rotation = new Quaternion();
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
      objects.push({ id: item.id, model, position: position.toArray() as Point, rotation: orientation.toArray(), size: item.value, ...(modelInfo(model).inheritsColor ? { color } : {}) });
    }
    else if (item.kind === 'extend') {
      const start = position.toArray() as Point;
      position.add(new Vector3(0, item.value, 0).applyQuaternion(rotation));
      segments.push({ id: item.id, start, end: position.toArray() as Point, color });
    } else {
      const degrees = item.kind === 'spin' ? item.value * time : item.value;
      rotation.multiply(new Quaternion().setFromAxisAngle(axes[item.axis], degrees * Math.PI / 180));
    }
    frames.push(frame());
  }
  return { segments, frames, pens, objects };
}
export function makeExample(name: string): Action[] {
  if (name === 'Rocket ride') return [...makeExample('Orbit'), action('object', { model: 'rocket', value: 0.7 }), action('draw')];
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
  if (item.kind === 'extend') return 'Extend';
  if (item.kind === 'color') return 'Color';
  if (item.kind === 'spin') return 'Rotate';
  if (item.kind === 'draw') return 'Draw';
  if (item.kind === 'object') return modelInfo(item.model).name;
  return item.axis === 'z' ? (item.value < 0 ? 'Turn right' : 'Turn left') : item.axis === 'x' ? 'Tilt' : 'Twist';
}
export function detail(item: Action) { return item.kind === 'object' ? `${item.value}× · ${modelInfo(item.model).inheritsColor ? 'drawing color' : 'built-in colors'}` : item.kind === 'draw' ? 'Continuous ink' : item.kind === 'color' ? item.color : item.kind === 'extend' ? `${item.value} units` : `${item.value}°${item.kind === 'spin' ? '/s' : ''} · ${item.axis.toUpperCase()}`; }
export function validDocument(value: unknown): value is Action[] {
  return Array.isArray(value) && value.length <= MAX_ACTIONS && new Set(value.map(a => a?.id)).size === value.length && value.every(a => a && typeof a.id === 'string' && ['extend', 'turn', 'spin', 'color', 'draw', 'object'].includes(a.kind) && ['x', 'y', 'z'].includes(a.axis) && typeof a.value === 'number' && Number.isFinite(a.value) && Math.abs(a.value) <= 360 && (a.kind !== 'extend' || (a.value >= 0.2 && a.value <= 4)) && (a.kind !== 'object' || (models.some(m => m.id === a.model) && a.value >= 0.2 && a.value <= 3 && typeof a.angle === 'number' && Number.isFinite(a.angle) && Math.abs(a.angle) <= 180)) && /^#[0-9a-f]{6}$/i.test(a.color));
}

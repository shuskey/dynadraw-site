import type { Action, Axis } from './engine';

export const motionOptions: { name: string; note: string; kind: Action['kind']; axis: Axis; value: number; motion?: string }[] = [
  { name: 'Extend draw', note: 'Move forward and draw a column', kind: 'extend', axis: 'z', value: 1.4, motion: 'extend' },
  { name: 'Extend move', note: 'Move forward without drawing a column', kind: 'move', axis: 'z', value: 1.4, motion: 'extend' },
  { name: 'Turn left', note: '45° to the left', kind: 'turn', axis: 'z', value: 45, motion: 'left' },
  { name: 'Turn right', note: '45° to the right', kind: 'turn', axis: 'z', value: -45, motion: 'right' },
  { name: 'Tilt up', note: 'Tilt upward by 45°', kind: 'turn', axis: 'x', value: 45, motion: 'left' },
  { name: 'Tilt down', note: 'Tilt downward by 45°', kind: 'turn', axis: 'x', value: -45, motion: 'right' },
  { name: 'Twist left', note: 'Twist to the left by 45°', kind: 'turn', axis: 'y', value: 45, motion: 'left' },
  { name: 'Twist right', note: 'Twist to the right by 45°', kind: 'turn', axis: 'y', value: -45, motion: 'right' },
];

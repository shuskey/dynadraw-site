import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, evaluate, validDocument } from './engine';
import { INK_CHUNK_SIZE, InkTrail } from './inkTrail';

test('a local turn changes the direction of subsequent segments', () => {
  const a = [action('extend', { value: 2 }), action('turn', { value: 90 }), action('extend', { value: 3 })];
  const { segments, frames } = evaluate(a, 0);
  assert.deepEqual(segments[0].end, [0, 2, 0]);
  assert.ok(Math.abs(segments[1].end[0] + 3) < 1e-8);
  assert.ok(Math.abs(segments[1].end[1] - 2) < 1e-8);
  assert.equal(frames.length, a.length + 1);
});
test('continuous rotation depends on time and retains segment length', () => {
  const a = [action('spin', { value: 90 }), action('extend', { value: 2 })];
  const initial = evaluate(a, 0).segments[0];
  const later = evaluate(a, 1).segments[0];
  assert.deepEqual(initial.end, [0, 2, 0]);
  assert.ok(Math.abs(later.end[0] + 2) < 1e-8);
  assert.ok(Math.abs(Math.hypot(...later.end) - 2) < 1e-8);
});
test('color changes apply only to subsequent extensions', () => {
  const a = [action('extend'), action('color', { color: '#123456' }), action('extend')];
  const { segments } = evaluate(a, 0);
  assert.notEqual(segments[0].color, '#123456');
  assert.equal(segments[1].color, '#123456');
});
test('saved document validation rejects malformed actions and duplicate identities', () => {
  const a = action('extend');
  assert.ok(validDocument([a]));
  assert.ok(!validDocument([a, a]));
  assert.ok(!validDocument([{ ...a, value: NaN }]));
  assert.ok(!validDocument([{ ...a, kind: 'execute' }]));
});

test('Draw is attached at its insertion point and captures the color active there', () => {
  const a = [action('spin', { value: 90 }), action('extend', { value: 2 }), action('color', { color: '#123456' }), action('draw'), action('color', { color: '#abcdef' }), action('extend', { value: 3 }), action('draw')];
  const start = evaluate(a, 0), later = evaluate(a, 1);
  assert.deepEqual(start.pens[0].position, [0, 2, 0]);
  assert.deepEqual(start.pens[1].position, [0, 5, 0]);
  assert.equal(start.pens[0].color, '#123456');
  assert.equal(start.pens[1].color, '#abcdef');
  assert.ok(Math.abs(later.pens[0].position[0] + 2) < 1e-8);
  assert.equal(start.segments.length, 2, 'Draw adds no movement or arm');
  assert.ok(validDocument(a));
});

test('ink retains its beginning across chunk boundaries and joins chunks continuously', () => {
  const trail = new InkTrail();
  for (let i = 0; i < INK_CHUNK_SIZE * 3; i++) trail.append([i, 0, 0]);
  assert.deepEqual(trail.chunks[0][0], [0, 0, 0]);
  assert.ok(trail.chunks.length > 3);
  for (let i = 1; i < trail.chunks.length; i++) assert.deepEqual(trail.chunks[i][0], trail.chunks[i - 1].at(-1));
  assert.deepEqual(trail.chunks.at(-1)?.at(-1), [INK_CHUNK_SIZE * 3 - 1, 0, 0]);
});

test('a stationary pen does not accumulate duplicate ink', () => {
  const trail = new InkTrail();
  trail.append([1, 2, 3]);
  for (let i = 0; i < 10000; i++) assert.equal(trail.append([1, 2, 3]), null);
  assert.equal(trail.chunks[0].length, 1);
});

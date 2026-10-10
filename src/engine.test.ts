import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, evaluate, validDocument } from './engine';

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

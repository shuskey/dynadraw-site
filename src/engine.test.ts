import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, evaluate, makeExample, validDocument } from './engine';
import { INK_CHUNK_SIZE, InkTrail } from './inkTrail';
import { models } from './models';
import { Quaternion, Vector3 } from 'three';
import { RocketHeading } from './rocketHeading';

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


test('only geometric objects inherit the active drawing color', () => {
  for (const model of models) {
    const a = [action('color', { color: '#123456' }), action('object', { model: model.id }), action('color', { color: '#abcdef' })];
    assert.equal(evaluate(a, 0).objects[0].color, model.inheritsColor ? '#123456' : undefined, model.name);
    assert.ok(validDocument(a));
  }
});

test('objects follow motion without moving the drawing head', () => {
  const a = [action('spin', { value: 90 }), action('extend', { value: 2 }), action('object', { model: 'rocket', value: 0.7, angle: 30, axis: 'x' }), action('draw')];
  const result = evaluate(a, 1);
  assert.ok(Math.abs(result.objects[0].position[0] + 2) < 1e-8);
  assert.equal(result.objects[0].size, 0.7);
  assert.equal(result.objects[0].color, undefined);
  assert.deepEqual(result.pens[0].position, result.objects[0].position);
  assert.ok(Math.abs(Math.hypot(...result.objects[0].rotation) - 1) < 1e-8);
  assert.ok(!validDocument([{ ...a[2], model: 'unknown' }]));
  assert.ok(!validDocument([{ ...a[2], value: 100 }]));
});

test('rocket nose follows actual displacement, including poles and motion through the origin', () => {
  for (const direction of [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1], [1,2,3]] as const) {
    const heading = new RocketHeading();
    heading.update([0,0,0], [0,0,0,1]);
    const rotation = heading.update([...direction], [0,0,0,1]);
    const nose = new Vector3(0,1,0).applyQuaternion(rotation);
    assert.ok(nose.dot(new Vector3(...direction).normalize()) > 0.999999);
    assert.ok(rotation.toArray().every(Number.isFinite));
  }
});

test('rocket holds its last heading while stationary or paused', () => {
  const heading = new RocketHeading();
  heading.update([0,0,0], [0,0,0,1]);
  const moving = heading.update([1,0,0], [0,0,0,1]).clone();
  const authored = new Quaternion().setFromAxisAngle(new Vector3(1,0,0), 1).toArray();
  assert.ok(heading.update([1,0,0], authored).angleTo(moving) < 1e-8);
  assert.ok(new RocketHeading().update([1,0,0], authored).angleTo(new Quaternion(...authored)) < 1e-8);
});

test('rocket points along a compound animated orbit rather than the drawing arm', () => {
  const actions = makeExample('Rocket ride');
  const heading = new RocketHeading();
  let previous = evaluate(actions, 0).objects[0];
  heading.update(previous.position, previous.rotation);
  for (let frame = 1; frame <= 240; frame++) {
    const current = evaluate(actions, frame / 60).objects[0];
    const velocity = new Vector3(...current.position).sub(new Vector3(...previous.position)).normalize();
    const nose = new Vector3(0,1,0).applyQuaternion(heading.update(current.position, current.rotation));
    assert.ok(nose.dot(velocity) > 0.999999);
    previous = current;
  }
});


test('rocket preserves roll through repeated circular flights across the old up-axis poles', () => {
  const actions = [action('spin', { axis: 'y', value: 30 }), action('turn', { value: 45 }), action('turn', { value: 45 }), action('extend'), action('object', { model: 'rocket' })];
  for (const fps of [30, 60, 120]) {
    const heading = new RocketHeading();
    let previous = evaluate(actions, 0).objects[0];
    heading.update(previous.position, previous.rotation);
    let last: Quaternion | undefined;
    let initialDorsal: Vector3 | undefined;
    for (let frame = 1; frame <= fps * 24; frame++) {
      const current = evaluate(actions, frame / fps).objects[0];
      const velocity = new Vector3(...current.position).sub(new Vector3(...previous.position)).normalize();
      const rotation = heading.update(current.position, current.rotation).clone();
      const dorsal = new Vector3(0, 0, 1).applyQuaternion(rotation);
      if (!initialDorsal) initialDorsal = dorsal.clone();
      assert.ok(new Vector3(0, 1, 0).applyQuaternion(rotation).dot(velocity) > 0.999999);
      // This planar circle needs only the same small turn as its velocity, with
      // no added axial roll. The old implementation jumped 180 degrees here.
      if (last) assert.ok(last.angleTo(rotation) <= (30 / fps) * Math.PI / 180 + 1e-8);
      if (frame > 1) {
        const minimalTurn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0).applyQuaternion(last!), velocity);
        assert.ok(dorsal.dot(new Vector3(0, 0, 1).applyQuaternion(last!).applyQuaternion(minimalTurn)) > 0.999999);
      }
      last = rotation;
      previous = current;
    }
    // Two full orbits return to the same roll, without a half-orbit flip.
    assert.ok(new Vector3(0, 0, 1).applyQuaternion(last!).dot(initialDorsal!) > 0.999);
  }
});

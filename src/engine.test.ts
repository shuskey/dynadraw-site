import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, bounceDistance, evaluate, isContinuous, makeExample, parseDrawingDocument, validDocument } from './engine';
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

test('Dragon flight can be saved and keeps the pearl-chasing model on its animated path', () => {
  const actions = makeExample('Dragon flight');
  assert.ok(validDocument(JSON.parse(JSON.stringify(actions))));
  const start = evaluate(actions, 0).objects[0];
  const later = evaluate(actions, 2).objects[0];
  assert.equal(start.model, 'dragon');
  assert.equal(start.color, undefined);
  assert.notDeepEqual(start.position, later.position);
  assert.equal(start.size, later.size);
});

test('auto heading defaults on for directional models and preserves explicit choices when saved', () => {
  for (const model of ['dragon', 'rocket', 'sword'] as const) {
    const object = action('object', { model });
    assert.equal(object.autoHeading, true);
    assert.equal(evaluate([object], 0).objects[0].autoHeading, true);
    const legacy = { ...object }; delete legacy.autoHeading;
    assert.ok(validDocument([legacy]));
    assert.equal(evaluate([legacy], 0).objects[0].autoHeading, true);
    const manual = { ...object, autoHeading: false, angle: 60, axis: 'x' as const };
    const restored = JSON.parse(JSON.stringify([manual]));
    assert.ok(validDocument(restored));
    const result = evaluate(restored, 0).objects[0];
    assert.equal(result.autoHeading, false);
    const expected = new Quaternion().setFromAxisAngle(new Vector3(1,0,0), Math.PI / 3);
    assert.ok(new Quaternion(...result.rotation).angleTo(expected) < 1e-8);
    assert.ok(!validDocument([{ ...object, autoHeading: 'false' }]));
  }
  for (const model of ['world', 'asteroid', 'disk', 'torus', 'ring'] as const) {
    assert.equal(evaluate([action('object', { model, autoHeading: true })], 0).objects[0].autoHeading, false);
  }
});

test('extend move follows local turns and animation exactly like extend draw without columns', () => {
  const drawn = [action('spin', { axis: 'y', value: 30 }), action('turn', { axis: 'z', value: -60 }), action('extend', { value: 2 }), action('turn', { axis: 'x', value: 40 }), action('extend', { value: 1.3 }), action('object', { model: 'dragon' }), action('draw')];
  const moved = drawn.map(item => item.kind === 'extend' ? { ...item, kind: 'move' as const } : item);
  for (const time of [0, 1, 6]) {
    const a = evaluate(drawn, time), b = evaluate(moved, time);
    assert.equal(a.segments.length, 2);
    assert.equal(b.segments.length, 0);
    assert.deepEqual(b.frames, a.frames);
    assert.deepEqual(b.objects, a.objects);
    assert.deepEqual(b.pens, a.pens);
  }
  assert.ok(validDocument(JSON.parse(JSON.stringify(moved))));
});

test('move steps leave gaps between columns and preserve the color and insertion position', () => {
  const actions = [action('extend', { value: 1 }), action('color', { color: '#123456' }), action('move', { value: 2 }), action('extend', { value: 1 })];
  const result = evaluate(actions, 0);
  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments[0].end, [0,1,0]);
  assert.deepEqual(result.segments[1].start, [0,3,0]);
  assert.deepEqual(result.frames[3].position, [0,3,0]);
  assert.deepEqual(result.segments[1].end, [0,4,0]);
  assert.equal(result.segments[1].color, '#123456');
  assert.equal(action('move').value, action('extend').value);
  for (const value of [-1, 0, .19, 4.01, NaN]) assert.ok(!validDocument([action('move', { value })]));
  for (const value of [.2, 4]) assert.ok(validDocument([action('move', { value })]));
  for (const name of ['Dragon flight', 'Rocket ride']) assert.equal(evaluate(makeExample(name), 1).segments.length, 0);
});


test('surface mode matches an initial -90 degree tilt for geometry, objects, pens, and marker direction', () => {
  const actions = [action('move', { value: 2 }), action('turn', { value: 90 }), action('extend', { value: 3 }), action('spin', { axis: 'x', value: 20 }), action('object', { model: 'dragon' }), action('draw')];
  for (const time of [0, 1, 5]) {
    const surface = evaluate(actions, time, 'surface');
    const manual = evaluate([action('turn', { axis: 'x', value: -90 }), ...actions], time, 'space');
    assert.deepEqual(surface.segments, manual.segments);
    assert.deepEqual(surface.objects, manual.objects);
    assert.deepEqual(surface.pens, manual.pens);
    assert.deepEqual(surface.frames, manual.frames.slice(1));
  }
  const surface = evaluate(actions, 0, 'surface');
  assert.ok(new Vector3(...surface.frames[0].direction).distanceTo(new Vector3(0,0,-1)) < 1e-8);
  assert.ok(new Vector3(...surface.segments[0].end).distanceTo(new Vector3(-3,0,-2)) < 1e-8);
  assert.deepEqual(evaluate(actions, 1, 'space'), evaluate(actions, 1));
});

test('saved drawings preserve their mode and legacy action arrays retain the space orientation', () => {
  const actions = [action('extend'), action('turn'), action('object', { model: 'sword', autoHeading: false })];
  for (const mode of ['surface', 'space'] as const) {
    const restored = parseDrawingDocument(JSON.parse(JSON.stringify({ actions, mode })));
    assert.deepEqual(restored, { actions, mode });
  }
  assert.deepEqual(parseDrawingDocument(actions), { actions, mode: 'space' });
  assert.equal(parseDrawingDocument({ actions, mode: 'invalid' }), null);
  assert.equal(parseDrawingDocument({ actions: [{ ...actions[0], kind: 'invalid' }], mode: 'surface' }), null);
  assert.equal(parseDrawingDocument(null), null);
});


test('continuous extensions reproduce the original signed constant-speed bounce and move followers', () => {
  const times = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const lengths = [0, -1, -2, -1, 0, 1, 2, 1, 0];
  for (const kind of ['extend', 'move'] as const) {
    const items = [action(kind, { value: 2, continuous: true, speed: 2 }), action('object', { model: 'rocket' }), action('draw')];
    for (const [i, time] of times.entries()) {
      const result = evaluate(items, time, 'surface');
      assert.ok(new Vector3(...result.objects[0].position).distanceTo(new Vector3(0, 0, -lengths[i])) < 1e-8);
      assert.deepEqual(result.pens[0].position, result.objects[0].position);
      assert.equal(result.segments.length, kind === 'extend' ? 1 : 0);
      assert.ok(result.frames.flatMap(f => [...f.position, ...f.direction]).every(Number.isFinite));
      if (kind === 'extend') assert.ok(Math.abs(new Vector3(...result.segments[0].end).length() - Math.abs(lengths[i])) < 1e-8);
    }
    const stopped = evaluate([{ ...items[0], continuous: false }], 1, 'space');
    assert.deepEqual(stopped.frames[1].position, [0,2,0]);
  }
  assert.equal(bounceDistance(2, .4), -2);
  assert.equal(bounceDistance(2, 1.2), 2);
  assert.equal(bounceDistance(2, 2, 1), -2);
  assert.equal(bounceDistance(2, 6, 1), 2);
  assert.equal(bounceDistance(2, 8, 1), 0);
  assert.ok(Math.abs(bounceDistance(2, 1001.5, 2) + 1) < 1e-8);
});

test('continuous turns rotate in both directions on every axis and can be made static', () => {
  for (const axis of ['x', 'y', 'z'] as const) for (const value of [-30,30]) {
    const turn = action('turn', { axis, value, continuous: true });
    const object = action('object', { model: 'sword', autoHeading: false });
    for (const time of [0, 1, 3, 12]) {
      const actual = evaluate([turn, object], time).objects[0].rotation;
      const expected = evaluate([{ ...turn, value: value * time, continuous: false }, object], 0).objects[0].rotation;
      assert.deepEqual(actual, expected);
    }
    assert.deepEqual(evaluate([{ ...turn, continuous: false }, object], 0), evaluate([{ ...turn, continuous: false }, object], 5));
  }
  assert.equal(isContinuous(action('spin')), true);
  assert.equal(isContinuous(action('turn')), false);
  assert.deepEqual(evaluate([action('spin', { axis: 'x', value: 30 })], 2).frames[1].direction, evaluate([action('turn', { axis: 'x', value: 30, continuous: true })], 2).frames[1].direction);
});

test('continuous motion settings survive save and validation rejects invalid flags and speeds', () => {
  const actions = [action('extend', { continuous: true, speed: .5 }), action('move', { continuous: true }), action('turn', { continuous: true, axis: 'x', value: -30 })];
  assert.deepEqual(parseDrawingDocument(JSON.parse(JSON.stringify({ actions, mode: 'surface' }))), { actions, mode: 'surface' });
  for (const speed of [0, -1, Infinity, NaN, 21, 'fast']) assert.ok(!validDocument([{ ...actions[0], speed }]));
  assert.ok(!validDocument([{ ...actions[0], continuous: 'yes' }]));
});


test('ink thickness survives saves while older Draw actions keep the thin default', () => {
  const legacy = action('draw');
  assert.ok(parseDrawingDocument([legacy]));
  const thick = action('draw', { width: 0.18 });
  const restored = parseDrawingDocument(JSON.parse(JSON.stringify({ actions: [thick], mode: 'surface' })));
  assert.equal(restored?.actions[0].width, 0.18);
  for (const width of [0, 0.19, NaN, Infinity, 'wide']) {
    assert.equal(validDocument([{ ...thick, width }]), false);
  }
});

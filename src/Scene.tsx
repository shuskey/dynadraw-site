import { Component, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Color, Group, Mesh, Quaternion, Vector3 } from 'three';
import { evaluate, type Action } from './engine';
import Ink from './Ink';

const up = new Vector3(0, 1, 0);
function Rod({ index, actions, time, selected, drawing }: { index: number; actions: Action[]; time: { current: number }; selected: string | null; drawing: { current: ReturnType<typeof evaluate> } }) {
  const ref = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    // Shared evaluation is updated once by Drawing before its children render.
    const segment = drawing.current.segments[index];
    if (!segment || !ref.current || !mesh.current) return;
    const start = new Vector3(...segment.start), end = new Vector3(...segment.end);
    const direction = end.clone().sub(start);
    ref.current.position.copy(start.clone().add(end).multiplyScalar(0.5));
    ref.current.quaternion.copy(new Quaternion().setFromUnitVectors(up, direction.clone().normalize()));
    mesh.current.scale.setScalar(1);
    mesh.current.scale.y = direction.length();
  });
  const staticSegment = evaluate(actions, time.current).segments[index];
  const color = selected === staticSegment?.id ? '#ffffff' : staticSegment?.color;
  return <group ref={ref}><mesh ref={mesh} castShadow><cylinderGeometry args={[0.075, 0.075, 1, 12]}/><meshStandardMaterial color={color} roughness={0.32} metalness={0.12} emissive={new Color(color)} emissiveIntensity={selected === staticSegment?.id ? 0.15 : 0}/></mesh><mesh position={[0, 0, 0]}><sphereGeometry args={[0.095, 12, 12]}/><meshStandardMaterial color={color}/></mesh></group>;
}
function Drawing({ actions, playing, speed, cursor, selected, reset, inkReset }: { actions: Action[]; playing: boolean; speed: number; cursor: number; selected: string | null; reset: number; inkReset: number }) {
  const drawing = useRef(evaluate(actions, 0));
  const time = useRef(0);
  const previousReset = useRef(reset);
  const cursorMesh = useRef<Group>(null);
  const segmentCount = useMemo(() => actions.filter(a => a.kind === 'extend').length, [actions]);
  // Ink lives in world space. Editing the structure starts a fresh trace;
  // moving the marker, selecting a tile, or pausing preserves existing ink.
  const inkRevision = useMemo(() => crypto.randomUUID(), [actions, reset, inkReset]);
  useFrame((_, dt) => {
    if (previousReset.current !== reset) { time.current = 0; previousReset.current = reset; }
    if (playing) time.current += Math.min(dt, 0.05) * speed;
    drawing.current = evaluate(actions, time.current);
    const frame = drawing.current.frames[cursor];
    if (frame && cursorMesh.current) {
      cursorMesh.current.position.set(...frame.position);
      cursorMesh.current.quaternion.setFromUnitVectors(up, new Vector3(...frame.direction));
    }
  }, -1);
  return <group position={[0, 0.15, 0]}>
    {Array.from({ length: segmentCount }, (_, index) => <Rod key={index} {...{ index, actions, time, selected, drawing }}/>) }
    {evaluate(actions, time.current).pens.map(pen => <Ink key={`${inkRevision}-${pen.id}`} id={pen.id} color={pen.color} drawing={drawing} playing={playing}/>)}
    <group ref={cursorMesh}><mesh><sphereGeometry args={[0.14, 16, 16]}/><meshStandardMaterial color="#35483e" emissive="#dbef66" emissiveIntensity={0.7}/></mesh><mesh position={[0, 0.35, 0]}><coneGeometry args={[0.13, 0.25, 12]}/><meshStandardMaterial color="#35483e"/></mesh></group>
    <mesh><sphereGeometry args={[0.11, 16, 16]}/><meshStandardMaterial color="#3c5148"/></mesh>
  </group>;
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="canvas-error">The 3D canvas couldn’t start. Try a browser with WebGL enabled. Your drawing sequence is still editable.</div> : this.props.children; }
}
export default function Scene(props: Parameters<typeof Drawing>[0] & { cameraReset: number }) {
  const [ready, setReady] = useState(false);
  return <SceneBoundary><Canvas shadows dpr={[1, 1.75]} onCreated={() => setReady(true)} gl={{ antialias: true }} fallback={<div className="canvas-error">This browser needs WebGL to show your drawing.</div>}>
    <color attach="background" args={['#f0f2e9']}/><fog attach="fog" args={['#f0f2e9', 25, 65]}/>
    <PerspectiveCamera key={`camera-${props.cameraReset}`} makeDefault position={[8, 6, 10]} fov={40}/>
    <OrbitControls key={`controls-${props.cameraReset}`} makeDefault target={[0, 2, 0]} minDistance={3} maxDistance={50} enableDamping/>
    <ambientLight intensity={1.4}/><directionalLight castShadow position={[6, 12, 8]} intensity={2.3} shadow-mapSize={[1024, 1024]}/>
    <Grid position={[0, -0.03, 0]} args={[60, 60]} cellSize={1} cellThickness={0.5} cellColor="#d2d8c9" sectionSize={5} sectionThickness={0.8} sectionColor="#b9c4af" fadeDistance={35} infiniteGrid/>
    <Drawing {...props}/>
  </Canvas>{!ready && <div className="canvas-loading">Setting the stage…</div>}</SceneBoundary>;
}

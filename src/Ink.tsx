import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';
import { INK_CHUNK_SIZE, InkTrail } from './inkTrail';
import type { evaluate, Point } from './engine';

type Drawing = { current: ReturnType<typeof evaluate> };
type Chunk = { balls: InstancedMesh; links: InstancedMesh };
const up = new Vector3(0, 1, 0);
export default function Ink({ id, color, width, drawing, playing }: { id: string; color: string; width: number; drawing: Drawing; playing: boolean }) {
  const group = useRef<Group>(null);
  const trail = useRef(new InkTrail());
  const chunks = useRef<Chunk[]>([]);
  const last = useRef<Point | undefined>(undefined);
  const stamp = useRef(new Object3D());
  useEffect(() => () => {
    for (const chunk of chunks.current) for (const mesh of [chunk.balls, chunk.links]) {
      mesh.dispose(); mesh.geometry.dispose(); (mesh.material as MeshStandardMaterial).dispose();
    }
    chunks.current = [];
  }, []);
  useFrame(() => {
    const pen = drawing.current.pens.find(p => p.id === id);
    if (!pen || !group.current || !playing) return;
    const sample = trail.current.append(pen.position);
    if (!sample) return;
    let chunk = chunks.current[sample.chunkIndex];
    const radius = width / 2;
    const transform = stamp.current;
    if (!chunk) {
      const material = () => new MeshStandardMaterial({ color, roughness: 0.45 });
      chunk = {
        balls: new InstancedMesh(new SphereGeometry(1, 10, 8), material(), INK_CHUNK_SIZE),
        links: new InstancedMesh(new CylinderGeometry(1, 1, 1, 10), material(), INK_CHUNK_SIZE),
      };
      for (const mesh of [chunk.balls, chunk.links]) {
        mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        group.current.add(mesh);
      }
      // Later chunks repeat the previous endpoint to keep the trail connected.
      transform.scale.setScalar(0); transform.updateMatrix();
      chunk.links.setMatrixAt(0, transform.matrix);
      if (sample.previous) {
        transform.position.set(...sample.previous); transform.scale.setScalar(radius); transform.updateMatrix();
        chunk.balls.setMatrixAt(0, transform.matrix);
      }
      chunks.current.push(chunk);
    }
    transform.position.set(...sample.point); transform.quaternion.identity(); transform.scale.setScalar(radius); transform.updateMatrix();
    chunk.balls.setMatrixAt(sample.pointIndex, transform.matrix);
    if (last.current) {
      const start = new Vector3(...last.current), end = new Vector3(...sample.point);
      const direction = end.clone().sub(start);
      transform.position.copy(start.add(end).multiplyScalar(0.5));
      transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      transform.scale.set(radius, direction.length(), radius); transform.updateMatrix();
      chunk.links.setMatrixAt(sample.pointIndex, transform.matrix);
    }
    for (const mesh of [chunk.balls, chunk.links]) {
      mesh.count = sample.pointIndex + 1; mesh.instanceMatrix.needsUpdate = true;
    }
    last.current = sample.point;
  });
  return <group ref={group}/>;
}

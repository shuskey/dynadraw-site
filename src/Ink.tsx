import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, Line, LineBasicMaterial, Mesh } from 'three';
import { INK_CHUNK_SIZE, InkTrail } from './inkTrail';
import type { evaluate } from './engine';

type Drawing = { current: ReturnType<typeof evaluate> };
export default function Ink({ id, color, drawing, playing }: { id: string; color: string; drawing: Drawing; playing: boolean }) {
  const group = useRef<Group>(null);
  const nib = useRef<Mesh>(null);
  const trail = useRef(new InkTrail());
  const lines = useRef<Line<BufferGeometry, LineBasicMaterial>[]>([]);
  useEffect(() => () => {
    for (const line of lines.current) { line.geometry.dispose(); line.material.dispose(); }
    lines.current = [];
  }, []);
  useFrame(() => {
    const pen = drawing.current.pens.find(p => p.id === id);
    if (!pen || !group.current) return;
    nib.current?.position.set(...pen.position);
    if (!playing) return;
    const sample = trail.current.append(pen.position);
    if (!sample) return;
    let line = lines.current[sample.chunkIndex];
    if (!line) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(INK_CHUNK_SIZE * 3), 3).setUsage(DynamicDrawUsage));
      line = new Line(geometry, new LineBasicMaterial({ color: pen.color, toneMapped: false }));
      line.frustumCulled = false;
      lines.current.push(line);
      group.current.add(line);
      if (sample.previous) (geometry.getAttribute('position') as BufferAttribute).setXYZ(0, ...sample.previous);
    }
    const positions = line.geometry.getAttribute('position') as BufferAttribute;
    positions.setXYZ(sample.pointIndex, ...sample.point);
    positions.needsUpdate = true;
    line.geometry.setDrawRange(0, sample.pointIndex + 1);
  });
  return <group ref={group}><mesh ref={nib}><sphereGeometry args={[0.09, 12, 12]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh></group>;
}

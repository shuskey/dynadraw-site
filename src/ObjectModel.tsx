import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, IcosahedronGeometry, SRGBColorSpace, Shape } from 'three';
import type { evaluate, ObjectInstance } from './engine';
import type { ModelId } from './models';
import Dragon from './Dragon';
import { RocketHeading } from './rocketHeading';

function World() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4785ac'; ctx.fillRect(0, 0, 512, 256);
    // Original stylized continent artwork, bundled at runtime with the model.
    const land = [[35,55,65,35,105,38,139,61,125,79,100,80,85,103,61,90],[107,112,137,125,144,150,125,191,113,205,99,167,96,137],[238,66,267,53,288,67,306,63,327,42,383,45,422,65,465,82,440,99,401,90,385,114,354,109,335,131,312,102,285,94,266,89],[261,99,292,101,310,123,295,162,275,177,255,154,248,125],[418,171,446,165,464,178,451,194,421,190],[192,26,214,21,221,44,202,53]];
    ctx.fillStyle = '#83a76c';
    for (const polygon of land) { ctx.beginPath(); for (let i = 0; i < polygon.length; i += 2) i ? ctx.lineTo(polygon[i], polygon[i + 1]) : ctx.moveTo(polygon[i], polygon[i + 1]); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#dce8df'; ctx.fillRect(0, 0, 512, 13); ctx.fillRect(0, 239, 512, 17);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh castShadow><sphereGeometry args={[0.65, 32, 24]}/><meshStandardMaterial map={texture} roughness={0.8}/></mesh>;
}
function Asteroid() {
  const geometry = useMemo(() => {
    const geo = new IcosahedronGeometry(0.65, 1); const points = geo.getAttribute('position');
    for (let i = 0; i < points.count; i++) { const x = points.getX(i), y = points.getY(i), z = points.getZ(i); const r = 0.87 + 0.18 * Math.sin(x * 12 + y * 7 + z * 16); points.setXYZ(i, x * r, y * r * 0.85, z * r); }
    geo.computeVertexNormals(); return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color="#88796b" roughness={1} flatShading/></mesh>;
}
function Sword() {
  const blade = useMemo(() => { const shape = new Shape(); shape.moveTo(-0.12, -0.25); shape.lineTo(-0.14, 0.7); shape.lineTo(0, 1.05); shape.lineTo(0.14, 0.7); shape.lineTo(0.12, -0.25); shape.closePath(); return shape; }, []);
  return <group><mesh position={[0,0,-0.045]} castShadow><extrudeGeometry args={[blade,{depth:0.09,bevelEnabled:true,bevelThickness:0.015,bevelSize:0.02,bevelSegments:1,steps:1}]}/><meshStandardMaterial color="#cedbe4" metalness={0.65} roughness={0.25}/></mesh><mesh position={[0,-0.3,0]} castShadow><boxGeometry args={[0.7,0.12,0.18]}/><meshStandardMaterial color="#c4a05b" metalness={0.55} roughness={0.35}/></mesh><mesh position={[0,-0.57,0]}><cylinderGeometry args={[0.085,0.085,0.44,12]}/><meshStandardMaterial color="#584539" roughness={0.9}/></mesh><mesh position={[0,-0.82,0]}><sphereGeometry args={[0.12,12,8]}/><meshStandardMaterial color="#c4a05b" metalness={0.5}/></mesh></group>;
}
function Rocket() {
  return <group><mesh castShadow><cylinderGeometry args={[0.27,0.32,1.05,20]}/><meshStandardMaterial color="#f2eee2" roughness={0.45}/></mesh><mesh position={[0,0.79,0]} castShadow><coneGeometry args={[0.27,0.55,20]}/><meshStandardMaterial color="#ca6557" roughness={0.4}/></mesh><mesh position={[0,0.16,0.273]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.12,0.12,0.055,20]}/><meshStandardMaterial color="#5d9db6" metalness={0.3} roughness={0.2}/></mesh>{[0,Math.PI*2/3,Math.PI*4/3].map(angle => <group key={angle} rotation={[0,angle,0]}><mesh position={[0,-0.4,0.32]} rotation={[0.25,0,0]} castShadow><boxGeometry args={[0.075,0.5,0.43]}/><meshStandardMaterial color="#ca6557"/></mesh></group>)}<mesh position={[0,-0.62,0]}><coneGeometry args={[0.2,0.3,12]}/><meshStandardMaterial color="#d6ab5d"/></mesh></group>;
}
export function ModelGeometry({ model, color }: { model: ModelId; color?: string }) {
  if (model === 'dragon') return <Dragon/>;
  if (model === 'rocket') return <Rocket/>;
  if (model === 'world') return <World/>;
  if (model === 'asteroid') return <Asteroid/>;
  if (model === 'sword') return <Sword/>;
  if (model === 'disk') return <mesh castShadow><cylinderGeometry args={[0.65,0.65,0.1,48]}/><meshStandardMaterial color={color} roughness={0.4} metalness={0.2}/></mesh>;
  if (model === 'ring') return <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.45,0.67,48]}/><meshStandardMaterial color={color} side={DoubleSide} roughness={0.4} metalness={0.2}/></mesh>;
  return <mesh castShadow><torusGeometry args={[0.48,0.18,16,48]}/><meshStandardMaterial color={color} roughness={0.35} metalness={0.2}/></mesh>;
}
export default function ObjectModel({ item, drawing, selected }: { item: ObjectInstance; drawing: { current: ReturnType<typeof evaluate> }; selected: boolean }) {
  const group = useRef<Group>(null);
  const rocketHeading = useRef(new RocketHeading());
  useFrame(() => {
    const current = drawing.current.objects.find(o => o.id === item.id);
    if (current && group.current) {
      group.current.position.set(...current.position);
      if (current.autoHeading) group.current.quaternion.copy(rocketHeading.current.update(current.position, current.rotation));
      else group.current.quaternion.set(...current.rotation);
      group.current.scale.setScalar(current.size);
    }
  });
  return <group ref={group}><ModelGeometry model={item.model} color={item.color}/>{selected && <mesh><sphereGeometry args={[item.model === 'dragon' ? 1.7 : 1.15,12,8]}/><meshBasicMaterial color="#9aac6b" wireframe transparent opacity={0.25}/></mesh>}</group>;
}

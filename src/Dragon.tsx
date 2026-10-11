import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';

type Point = [number, number, number];
const blue = '#087fc2', gold = '#e8ae46', red = '#c9383f', ivory = '#fff2d3';
const up = new Vector3(0, 1, 0);
const bodyPoints: Point[] = [[-2.65,.18,.18],[-2.25,-.25,.2],[-1.65,-.38,0],[-1.1,.05,-.12],[-.72,.48,0],[-.25,.4,.12],[.15,.08,0],[.48,.15,0],[.78,.57,0],[1.05,.7,0]];
export const dragonSpine = new CatmullRomCurve3(bodyPoints.map(p => new Vector3(...p)));
export function dragonRadius(t: number) { return .025 + .225 * Math.pow(Math.sin(t * Math.PI / 2), .8); }
// Parallel cross sections along an S-curve give the body and tail a single smooth skin.
export function makeDragonBody() {
  const positions: number[] = [], indices: number[] = [], segments = 100, sides = 16;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, p = dragonSpine.getPointAt(t), tangent = dragonSpine.getTangentAt(t);
    const side = new Vector3().crossVectors(tangent, new Vector3(0,0,1)).normalize();
    const r = dragonRadius(t);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      const v = p.clone().addScaledVector(side, Math.cos(a)*r).add(new Vector3(0,0,Math.sin(a)*r));
      positions.push(v.x,v.y,v.z);
      if (i < segments && j < sides) { const k = i*(sides+1)+j; indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2); }
    }
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(positions,3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
function Tube({ points, radius, color }: { points: Point[]; radius: number; color: string }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map(p => new Vector3(...p))), [points]);
  return <mesh castShadow><tubeGeometry args={[curve,24,radius,8,false]}/><meshStandardMaterial color={color} roughness={.32} metalness={.22}/></mesh>;
}
function Orb({ position, scale, color, glow = false }: { position: Point; scale: Point; color: string; glow?: boolean }) {
  return <mesh position={position} scale={scale} castShadow><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={color} metalness={glow ? .15 : .25} roughness={glow ? .18 : .3} emissive={glow ? '#9bcbda' : '#000000'} emissiveIntensity={glow ? .3 : 0}/></mesh>;
}
function Spike({ from, to, radius, color = gold }: { from: Point; to: Point; radius: number; color?: string }) {
  const a = new Vector3(...from), b = new Vector3(...to), d = b.clone().sub(a);
  return <mesh position={a.add(b).multiplyScalar(.5)} quaternion={new Quaternion().setFromUnitVectors(up,d.clone().normalize())} castShadow><coneGeometry args={[radius,d.length(),8]}/><meshStandardMaterial color={color} roughness={.3} metalness={.3}/></mesh>;
}
function Scales() {
  const ref = useRef<InstancedMesh>(null);
  const matrices = useMemo(() => {
    const result: Matrix4[] = [];
    for (let row = 0; row < 55; row++) {
      const t = .08 + row/55*.89, r = dragonRadius(t), p = dragonSpine.getPointAt(t), tangent = dragonSpine.getTangentAt(t);
      const top = new Vector3().crossVectors(new Vector3(0,0,1),tangent).normalize();
      // Gold ventral plates occupy the underside; blue scales wrap the other three quarters.
      for (let j = 0; j < 9; j++) {
        const angle = -.25*Math.PI + j/8*1.5*Math.PI + (row%2)*.065;
        const normal = top.clone().multiplyScalar(Math.sin(angle)).add(new Vector3(0,0,Math.cos(angle)));
        const position = p.clone().addScaledVector(normal,r*.99);
        const z = normal.clone(), x = tangent.clone(), y = new Vector3().crossVectors(z,x).normalize();
        const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
        result.push(new Matrix4().compose(position,rotation,new Vector3(.042+r*.14,r*.24,.012)));
      }
    }
    return result;
  }, []);
  useLayoutEffect(() => { matrices.forEach((matrix,i) => ref.current!.setMatrixAt(i,matrix)); ref.current!.instanceMatrix.needsUpdate = true; ref.current!.computeBoundingSphere(); },[matrices]);
  return <instancedMesh ref={ref} args={[undefined,undefined,matrices.length]} castShadow><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#269bd4" metalness={.32} roughness={.28}/></instancedMesh>;
}
function Limb({ side, rear = false }: { side: number; rear?: boolean }) {
  const x = rear ? -.95 : .35, y = rear ? .2 : .2;
  const end: Point = [x+(rear ? -.05 : .62), y-.22, side*.51];
  return <group>
    <Tube points={[[x,y,side*.14],[x-.12,y-.22,side*.38],end]} radius={rear ? .085 : .065} color={blue}/>
    <Orb position={end} scale={[.15,.07,.11]} color={blue}/>
    {[-1,0,1].map(i => <group key={i}><Tube points={[end,[end[0]+.16,end[1]+.015,end[2]+i*.08],[end[0]+.23,end[1]+.08,end[2]+i*.1]]} radius={.025} color={blue}/><Spike from={[end[0]+.22,end[1]+.07,end[2]+i*.1]} to={[end[0]+.29,end[1]+.13,end[2]+i*.1]} radius={.026} color={ivory}/></group>)}
  </group>;
}
export default function Dragon() {
  const body = useMemo(makeDragonBody, []);
  useEffect(() => () => body.dispose(),[body]);
  // Align the authored +X nose to +Y, then roll 180° about that flight axis
  // so the dragon's back stays on the intended side of the heading frame.
  return <group rotation={[0,Math.PI,Math.PI/2]} scale={.58}>
    <mesh geometry={body} castShadow><meshStandardMaterial color={blue} roughness={.28} metalness={.28}/></mesh>
    <Scales/>
    {Array.from({length:34},(_,i) => {
      const t = .14+i/34*.83, p = dragonSpine.getPointAt(t), tangent = dragonSpine.getTangentAt(t);
      const normal = new Vector3().crossVectors(new Vector3(0,0,1),tangent).normalize(), r = dragonRadius(t);
      const belly = p.clone().addScaledVector(normal,-r*.88);
      return <group key={i}>
        <mesh position={belly} quaternion={new Quaternion().setFromUnitVectors(new Vector3(1,0,0),tangent)} scale={[.055,r*.25,r*.83]} castShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={i%2 ? '#f0bd57' : gold} roughness={.32} metalness={.3}/></mesh>
        {i%2 === 0 && <><Spike from={p.clone().addScaledVector(normal,r*.8).toArray() as Point} to={p.clone().addScaledVector(normal,r+.18+t*.12).addScaledVector(tangent,-.15).toArray() as Point} radius={.08+t*.035} color={red}/><Spike from={p.clone().addScaledVector(normal,r+.12+t*.1).addScaledVector(tangent,-.11).toArray() as Point} to={p.clone().addScaledVector(normal,r+.19+t*.12).addScaledVector(tangent,-.15).toArray() as Point} radius={.033}/></>}
      </group>;
    })}
    {[-1,1].map(side => <group key={side}><Limb side={side}/><Limb side={side} rear/>
      {/* Swept antlers, cheek flames and long curling whiskers. */}
      <Tube points={[[.93,.86,side*.18],[.77,1.1,side*.26],[.55,1.32,side*.32],[.32,1.4,side*.38]]} radius={.048} color={gold}/>
      <Spike from={[.59,1.27,side*.31]} to={[.66,1.5,side*.37]} radius={.045}/>
      <Spike from={[.78,1.08,side*.26]} to={[.91,1.3,side*.29]} radius={.04}/>
      {[0,1,2].map(i => <Spike key={i} from={[.86-i*.09,.64+i*.11,side*.23]} to={[.47-i*.09,.63+i*.23,side*.34]} radius={.115} color={red}/>)}
      <Tube points={[[1.45,.59,side*.16],[1.27,.44,side*.39],[.96,.43,side*.5],[.81,.63,side*.52]]} radius={.018} color={gold}/>
    </group>)}
    {/* Open smiling jaws and a long, angular muzzle. */}
    <Orb position={[1.04,.73,0]} scale={[.31,.25,.25]} color={blue}/>
    <Orb position={[1.34,.64,0]} scale={[.32,.115,.175]} color={blue}/>
    <Orb position={[1.27,.48,0]} scale={[.3,.055,.15]} color={red}/>
    <Orb position={[1.3,.445,0]} scale={[.3,.045,.145]} color={gold}/>
    <Orb position={[1.23,.52,0]} scale={[.22,.025,.095]} color={red}/>
    {[-1,1].map(side => <group key={side}>
      <Orb position={[1.13,.805,side*.219]} scale={[.102,.105,.033]} color={gold}/>
      <Orb position={[1.15,.81,side*.247]} scale={[.059,.065,.016]} color={ivory}/>
      <Orb position={[1.175,.815,side*.261]} scale={[.025,.045,.009]} color="#172934"/>
      <Orb position={[1.183,.835,side*.268]} scale={[.012,.013,.006]} color="#ffffff"/>
      <Tube points={[[1.02,.89,side*.22],[1.13,.92,side*.23],[1.23,.86,side*.19]]} radius={.033} color={gold}/>
      <Orb position={[1.54,.705,side*.09]} scale={[.035,.018,.025]} color="#174762"/>
      {[0,1,2].map(i => <Spike key={i} from={[1.17+i*.14,.6,side*.12]} to={[1.2+i*.14,.49,side*.12]} radius={.035} color={ivory}/>)}
      <Spike from={[1.1,.47,side*.1]} to={[1.16,.55,side*.1]} radius={.026} color={ivory}/>
      <Tube points={[[1.12,.45,side*.09],[.93,.26,side*.13],[.71,.25,side*.16]]} radius={.045} color={gold}/>
    </group>)}
    <Spike from={[1.04,.93,0]} to={[.83,1.2,0]} radius={.13} color={red}/>
    <Spike from={[1.32,.73,0]} to={[1.3,.84,0]} radius={.085}/>
    {/* The unmarked pearl floats ahead of the snout and reaching foreclaws. */}
    <Orb position={[2.06,.61,0]} scale={[.245,.245,.245]} color="#eff9fa" glow/>
    <mesh position={[2.06,.61,0]} rotation={[Math.PI/2,.35,0]}><torusGeometry args={[.29,.012,8,48]}/><meshStandardMaterial color={gold} metalness={.55} roughness={.24}/></mesh>
  </group>;
}

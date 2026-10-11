import { isContinuous, isExtension, type Action, type Axis } from './engine';

export default function MotionSettings({ selected, update }: { selected: Action; update: (patch: Partial<Action>) => void }) {
  const extension = isExtension(selected.kind), continuous = isContinuous(selected);
  return <>
    {extension && <label>Operation<select aria-label="Extension type" value={selected.kind} onChange={e => update({ kind: e.target.value as 'extend' | 'move' })}><option value="extend">Extend draw</option><option value="move">Extend move</option></select></label>}
    <label className="continuous-toggle"><input type="checkbox" checked={continuous} onChange={e => update({ continuous: e.target.checked, ...(selected.kind === 'spin' ? { kind: 'turn' as const } : {}) })}/>Continuous motion</label>
    <label>{extension ? (continuous ? 'Reach' : 'Length') : continuous ? 'Degrees / sec' : 'Degrees'}<input aria-label="Action value" type="number" min={extension ? 0.2 : -180} max={extension ? 4 : 180} step={extension ? 0.2 : 5} value={selected.value} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) update({ value: Math.max(extension ? 0.2 : -180, Math.min(extension ? 4 : 180, n)) }); }}/></label>
    {extension && continuous && <label>Speed<input aria-label="Bounce speed" type="number" min={0.1} max={20} step={0.1} value={selected.speed ?? selected.value * 2.5} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) update({ speed: Math.max(0.1, Math.min(20,n)) }); }}/><span>units / sec</span></label>}
    {!extension && <label>Axis<select aria-label="Action axis" value={selected.axis} onChange={e => update({ axis: e.target.value as Axis })}><option value="x">X · tilt</option><option value="y">Y · twist</option><option value="z">Z · turn</option></select></label>}
    {extension && continuous && <span className="motion-explanation">Bounces backward and forward from this point.</span>}
  </>;
}

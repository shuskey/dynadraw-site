import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Delete, ArrowUpRight, RotateCw, RotateCcw, Play, Pause, Undo2, Redo2, Trash2, Plus, ChevronDown, Check, Save, Expand, X, HelpCircle, Sparkles, Box, MousePointer2, Crosshair, PencilLine, Eraser } from 'lucide-react';
import Scene from './Scene';
import { ObjectChooser, ObjectSettings } from './ObjectChooser';
import { action, colors, detail, evaluate, isContinuous, label, makeExample, MAX_ACTIONS, parseDrawingDocument, type Action, type DrawingDocument, type DrawingMode } from './engine';

import Glyph from './ActionGlyph';
import { motionOptions } from './motionOptions';
import MotionChooser from './MotionChooser';
import MotionSettings from './MotionSettings';

const STORAGE_KEY = 'dynadraw-studio-v1';
type Editor = DrawingDocument & { cursor: number; selected: string | null };
function initialEditor(): Editor {
  try { const saved = parseDrawingDocument(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); if (saved) return { ...saved, cursor: saved.actions.length, selected: null }; } catch { /* Storage may be unavailable. */ }
  const actions = makeExample('Orbit');
  return { actions, cursor: actions.length, selected: null, mode: 'surface' };
}
export default function App() {
  const [editor, setEditor] = useState<Editor>(initialEditor);
  const [past, setPast] = useState<Editor[]>([]), [future, setFuture] = useState<Editor[]>([]);
  const [playing, setPlaying] = useState(true), [speed, setSpeed] = useState(1);
  const [inkReset, setInkReset] = useState(0);
  const [reset, setReset] = useState(0), [cameraReset, setCameraReset] = useState(0);
  const [objectsOpen, setObjectsOpen] = useState(false);
  const [motionOpen, setMotionOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false), [help, setHelp] = useState(false);
  const [toast, setToast] = useState(''), [title, setTitle] = useState('Your drawing');
  const sequence = useRef<HTMLDivElement>(null);
  const objectColors = new Map(evaluate(editor.actions, 0, editor.mode).objects.map(o => [o.id, o.color]));
  const insertionColor = editor.actions.slice(0, editor.cursor).filter(a => a.kind === 'color').at(-1)?.color || colors[0];
  const selected = editor.actions.find(a => a.id === editor.selected);
  function notify(message: string) { setToast(message); }
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); } }, [toast]);
  function commit(next: Editor) { setPast(p => [...p.slice(-49), editor]); setFuture([]); setEditor(next); }
  function insert(item: Action) {
    if (editor.actions.length >= MAX_ACTIONS) return notify('This prototype supports up to 80 actions.');
    const actions = [...editor.actions]; actions.splice(editor.cursor, 0, item);
    commit({ ...editor, actions, cursor: editor.cursor + 1, selected: item.id });
  }
  function update(patch: Partial<Action>) { if (selected) commit({ ...editor, actions: editor.actions.map(a => a.id === selected.id ? { ...a, ...patch } : a) }); }
  function moveCursor(direction: -1 | 1) {
    setEditor(e => ({ ...e, selected: null, cursor: Math.max(0, Math.min(e.actions.length, e.cursor + direction)) }));
  }
  function remove(backwards = false) {
    const index = editor.selected ? editor.actions.findIndex(a => a.id === editor.selected) : editor.cursor - (backwards ? 1 : 0);
    if (index < 0 || index >= editor.actions.length) return;
    commit({ ...editor, actions: editor.actions.filter((_, i) => i !== index), cursor: editor.cursor > index ? editor.cursor - 1 : editor.cursor, selected: null });
  }
  function undo() { if (!past.length) return; const prev = past[past.length - 1]; setFuture(f => [editor, ...f]); setPast(p => p.slice(0, -1)); setEditor(prev); }
  function redo() { if (!future.length) return; const next = future[0]; setPast(p => [...p, editor]); setFuture(f => f.slice(1)); setEditor(next); }
  function chooseExample(name: string) {
    const actions = makeExample(name); commit({ ...editor, actions, cursor: actions.length, selected: null }); setTitle(name); setReset(v => v + 1); setCameraReset(v => v + 1); setExamplesOpen(false);
  }
  function changeMode(mode: DrawingMode) { if (mode !== editor.mode) commit({ ...editor, mode }); }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ actions: editor.actions, mode: editor.mode })); notify('Drawing saved in this browser'); } catch { notify('Browser storage is unavailable. Please enable it to save.'); } }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.target as HTMLElement)?.closest('input, select, textarea, [contenteditable="true"]') || help || objectsOpen || motionOpen) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      else if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); moveCursor(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); remove(event.key === 'Backspace'); }
      else if (event.code === 'Space' && !((event.target as HTMLElement)?.closest('button'))) { event.preventDefault(); setPlaying(v => !v); }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  useEffect(() => {
    const container = sequence.current;
    const marker = container?.querySelector<HTMLElement>('[data-cursor="true"]');
    if (container && marker) {
      const offset = marker.getBoundingClientRect().left - container.getBoundingClientRect().left;
      if (offset < 10 || offset > container.clientWidth - 30) container.scrollBy({ left: offset - container.clientWidth / 2, behavior: 'smooth' });
    }
  }, [editor.cursor]);
  return <div className="app">
    <header className="topbar">
      <a className="brand" href="/" aria-label="DynaDraw Studio home"><span className="brand-mark"><Box size={23}/></span><span>DynaDraw<span className="brand-studio"> / studio</span></span></a>
      <span className="prototype-badge"><span/> EARLY PLAYGROUND</span>
      <div className="header-actions"><button className="quiet help-button" onClick={() => setHelp(true)}><HelpCircle size={17}/> How it works</button><button className="save-button" onClick={save}><Save size={16}/> Save drawing</button></div>
    </header>
    <main>
      <div className="intro"><div><div className="eyebrow">A LITTLE STRUCTURE. A LOT OF POSSIBILITY.</div><h1>Build a little motion<span>.</span></h1><p>Piece together simple actions. Watch something wonderful take shape.</p></div><div className="example-picker"><button className="example-button" aria-label="Try an example" aria-expanded={examplesOpen} onClick={() => setExamplesOpen(v => !v)}><Sparkles size={17}/><span>Try an example</span><ChevronDown size={16}/></button>{examplesOpen && <div className="example-menu">{['Dragon flight', 'Rocket ride', 'Ink orbit', 'Little helix', 'Orbit', 'First steps'].map(name => <button key={name} onClick={() => chooseExample(name)}>{name}<ArrowUpRight size={15}/></button>)}<small>Replaces the sequence. Undo brings it back.</small></div>}</div></div>
      <div className="workspace">
        <aside className="toolbox"><div className="panel-heading"><span className="step">01</span><h2>Your building blocks</h2></div><p className="panel-subtitle">Choose an action to add to your sequence.</p>
          <div className="tool-group-label">SHAPE & DIRECTION</div>
          <div className="tool-grid">{motionOptions.map(tool => <button key={tool.name} className={`tool ${tool.kind === 'extend' ? 'primary-tool' : tool.kind === 'move' ? 'move-tool' : ''}`} onClick={() => insert(action(tool.kind, tool))} title={`${tool.note}. Inserts at the marker.`}><span className={`tool-icon motion-${tool.motion}`}><Glyph item={{ ...tool, color: colors[0] }} size={24}/></span><strong>{tool.name}</strong><small>{tool.note}</small><Plus className="tool-plus" size={13}/></button>)}</div>
          <div className="tool-group-label">MAKE IT DYNAMIC</div><button className="dynamic-tool" onClick={() => setMotionOpen(true)} aria-haspopup="dialog"><span className="tool-icon motion-spin"><RotateCw size={24}/></span><span><strong>Continuous motion</strong><small>Bounce, turn, tilt or twist</small></span><Plus size={16}/></button>
          <div className="tool-group-label">GIVE IT CHARACTER</div><button className="dynamic-tool object-tool" onClick={() => setObjectsOpen(true)}><span className="tool-icon"><Box size={24}/></span><span><strong>Add object</strong><small>Rockets, worlds, rings & more</small></span><Plus size={16}/></button>
          <div className="tool-group-label">LEAVE A LINE</div><button className="dynamic-tool draw-tool" onClick={() => insert(action('draw'))} title="Attach a pen here. Its motion leaves a lasting line in the current color."><span className="tool-icon motion-draw"><PencilLine size={24}/></span><span><strong>Draw</strong><small>Trace motion with continuous ink</small></span><Plus size={16}/></button>
          <div className="tool-group-label">ADD SOME COLOR</div><div className="swatches">{colors.map((color, i) => <button key={color} style={{ background: color }} aria-label={`Insert ${['lime', 'mint', 'apricot', 'lavender', 'coral'][i]} color`} title={`Add ${['lime', 'mint', 'apricot', 'lavender', 'coral'][i]} color`} onClick={() => insert(action('color', { color }))}><Plus size={16}/></button>)}</div>
          <div className="toolbox-tip"><MousePointer2 size={16}/><p>Every action goes where the <strong>insertion marker</strong> is. Move it to change what comes next.</p></div>
        </aside>
        <section className="stage" aria-label="Interactive 3D drawing"><div className="stage-top"><span className="stage-label"><span className={playing ? 'live-dot' : 'paused-dot'}/>{playing ? 'LIVE CANVAS' : 'PAUSED'}</span><div className="drawing-mode" role="group" aria-label="Drawing mode"><button aria-pressed={editor.mode === 'surface'} title="Start drawing along the grid surface" onClick={() => changeMode('surface')}>Surface</button><button aria-pressed={editor.mode === 'space'} title="Start drawing upward into space" onClick={() => changeMode('space')}>Space</button></div><button className="icon-button" aria-label="Reset camera" title="Reset camera" onClick={() => setCameraReset(v => v + 1)}><Expand size={18}/></button></div>
          <Scene mode={editor.mode} actions={editor.actions} playing={playing} speed={speed} cursor={editor.cursor} selected={editor.selected} reset={reset} inkReset={inkReset} cameraReset={cameraReset}/>
          <div className="stage-caption"><span>{title}</span><small>{editor.actions.filter(a => a.kind === 'extend').length} segments · made by you</small></div>
          <div className="stage-bottom"><span className="orbit-hint"><MousePointer2 size={14}/> Drag to orbit · Scroll to zoom</span><div className="playback"><button className="clear-ink" aria-label="Clear ink" title="Erase the ink without restarting motion" disabled={!editor.actions.some(a => a.kind === 'draw')} onClick={() => setInkReset(v => v + 1)}><Eraser size={15}/></button><span className="playback-divider"/><button aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}</button><span className="playback-divider"/><label><span className="sr-only">Animation speed</span><select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={0.5}>0.5× speed</option><option value={1}>1× speed</option><option value={2}>2× speed</option></select></label><button aria-label="Restart animation" title="Restart animation" onClick={() => setReset(v => v + 1)}><RotateCcw size={15}/></button></div></div>
        </section>
      </div>
      <section className="sequence-panel" aria-label="Drawing sequence"><div className="sequence-heading"><div className="panel-heading"><span className="step">02</span><h2>Your sequence</h2><span className="action-count">{editor.actions.length} actions</span></div><div className="sequence-controls"><span>Small steps. Moving ideas.</span><button className="icon-button" aria-label="Undo" disabled={!past.length} onClick={undo}><Undo2 size={17}/></button><button className="icon-button" aria-label="Redo" disabled={!future.length} onClick={redo}><Redo2 size={17}/></button><span className="vertical-divider"/>
          <button className="icon-button" aria-label="Move insertion marker left" title="Move insertion marker left" disabled={editor.cursor === 0} onClick={() => moveCursor(-1)}><ArrowLeft size={18}/></button>
          <button className="icon-button" aria-label="Move insertion marker right" title="Move insertion marker right" disabled={editor.cursor === editor.actions.length} onClick={() => moveCursor(1)}><ArrowRight size={18}/></button>
          <button className="icon-button" aria-label="Delete action" title={selected ? 'Delete selected action' : 'Delete action before the insertion marker'} disabled={!selected && editor.cursor === 0} onClick={() => remove(true)}><Delete size={18}/></button>
          <span className="vertical-divider"/><button aria-label="Clear sequence" title="Clear sequence" className="quiet clear-button" disabled={!editor.actions.length} onClick={() => { commit({ ...editor, actions: [], cursor: 0, selected: null }); setTitle('Untitled drawing'); }}><Trash2 size={15}/> Clear</button></div></div>
        <div className="sequence-scroll" ref={sequence}><div className="sequence-track">{Array.from({ length: editor.actions.length + 1 }, (_, i) => <React.Fragment key={i}><button data-cursor={editor.cursor === i} className={`insertion ${editor.cursor === i ? 'active' : ''}`} aria-label={`Insert at position ${i + 1}`} aria-pressed={editor.cursor === i} onClick={() => setEditor(e => ({ ...e, cursor: i, selected: null }))}><span/><Plus size={12}/></button>{editor.actions[i] && <button className={`action-tile kind-${editor.actions[i].kind} ${isContinuous(editor.actions[i]) ? 'continuous-action' : ''} ${editor.selected === editor.actions[i].id ? 'selected' : ''}`} aria-pressed={editor.selected === editor.actions[i].id} onClick={() => setEditor(e => ({ ...e, selected: e.actions[i].id, cursor: i + 1 }))}><span className="tile-number">{String(i + 1).padStart(2, '0')}</span><Glyph item={{...editor.actions[i], color: objectColors.get(editor.actions[i].id) || editor.actions[i].color}} size={20}/><strong>{label(editor.actions[i])}</strong><small>{detail(editor.actions[i])}</small>{isContinuous(editor.actions[i]) && <span className="motion-badge" aria-label="Continuous motion"><RotateCw size={10}/></span>}</button>}</React.Fragment>)}{editor.actions.length === 0 && <div className="empty-sequence">Start with Extend draw or Extend move. Your next idea goes here.</div>}</div></div>
        <div className="sequence-footer">{selected ? <div className="inspector"><span className="inspector-title"><Glyph item={{...selected, color: objectColors.get(selected.id) || selected.color}} size={15}/> {label(selected)}</span>{selected.kind === 'object' ? <ObjectSettings selected={selected} update={update}/> : selected.kind === 'draw' ? <><label>Thickness <input aria-label="Ink thickness" type="number" min="0.02" max="0.18" step="0.01" value={selected.width ?? 0.02} onChange={e => { const width = Number(e.target.value); if (Number.isFinite(width) && width >= 0.02 && width <= 0.18) update({ width }); }}/></label><span className="draw-explanation">Round 3D ink in the current color. Ink stays until cleared.</span></> : selected.kind === 'color' ? <label>Color <input aria-label="Action color" type="color" value={selected.color} onChange={e => update({ color: e.target.value })}/></label> : <MotionSettings selected={selected} update={update}/>}<button className="quiet delete-action" onClick={() => remove()}><Trash2 size={14}/> Delete action</button><button className="icon-button" aria-label="Close action settings" onClick={() => setEditor(e => ({ ...e, selected: null }))}><X size={15}/></button></div> : <><span><Crosshair size={14}/> Marker at step {editor.cursor + 1} <span className="footer-muted">· Click a tile to edit its settings</span></span><span className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> move marker <kbd>⌫</kbd> delete</span></>}</div>
      </section>
      <footer className="page-footer"><span><span className="tiny-mark">✳</span> A playground for curious minds.</span><span>DynaDraw, reimagined <span className="footer-dot">·</span> Prototype 01</span></footer>
    </main>
    {objectsOpen && <ObjectChooser color={insertionColor} close={() => setObjectsOpen(false)} choose={model => { insert(action('object', {model})); setObjectsOpen(false); }}/>}
    {motionOpen && <MotionChooser close={() => setMotionOpen(false)} choose={item => { insert(item); setMotionOpen(false); }}/>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setHelp(false); }}><button autoFocus className="icon-button modal-close" aria-label="Close help" onClick={() => setHelp(false)}><X size={20}/></button><div className="eyebrow">YOUR FIRST MOVING IDEA</div><h2 id="help-title">A few actions.<br/>Endless possibilities.</h2><p><strong>Choose a starting mode.</strong> Surface starts forward along the grid; Space starts upward. Switch modes above the canvas. Tilts and twists can still take you into 3D in either mode.</p><p><strong>1. Build a sequence.</strong> Click an action to insert it at the marker. Extend draw moves forward and draws a column. Extend move advances the same distance without a column, so objects can fly freely. Turn left or right, tilt up or down, and twist left or right to change what follows.</p><p><strong>2. Give it motion.</strong> Choose Continuous motion for bouncing extensions or ongoing turns, tilts, and twists. You can also select a regular extension or turn and check Continuous motion. Adjust its reach or speed in the settings.</p><p><strong>3. Make it yours.</strong> Use the left and right arrows above the sequence, or tap between tiles, to move the insertion marker. The delete button removes the selected action, or the action just before the marker. Select a tile to adjust or delete it. Undo brings back earlier edits.</p><p><strong>Add an object.</strong> Choose a model, then select its tile to change size and orientation. Disks, toruses and rings use the active drawing color. Dragons, rockets, worlds, swords and asteroids keep their own colors.</p><p><strong>Draw with motion.</strong> Add Draw after moving segments to leave a continuous line in the color active at that point. Pause keeps the ink; Clear ink erases it. Editing the sequence or restarting begins a fresh trace.</p><p><strong>Keep your drawing.</strong> Save stores the action sequence in this browser. Ink is drawn live and is not saved. Examples replace the current sequence; you can undo that too.</p><button className="save-button" onClick={() => setHelp(false)}>Let’s make something <ArrowUpRight size={17}/></button></section></div>}
  </div>;
}

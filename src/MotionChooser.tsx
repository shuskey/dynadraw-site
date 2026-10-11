import { Repeat2, X } from 'lucide-react';
import Glyph from './ActionGlyph';
import { action, colors, isExtension, type Action } from './engine';
import { motionOptions } from './motionOptions';

export default function MotionChooser({ choose, close }: { choose: (item: Action) => void; close: () => void }) {
  return <div className="modal-backdrop" onClick={close}><section className="object-modal motion-modal" role="dialog" aria-modal="true" aria-labelledby="motion-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') close(); }}>
    <button autoFocus className="icon-button modal-close" aria-label="Close motion chooser" onClick={close}><X size={20}/></button>
    <div className="eyebrow">A LITTLE MOTION THAT KEEPS GOING</div><h2 id="motion-title">Choose continuous motion</h2><p>Extensions bounce backward and forward. Turns, tilts and twists keep rotating.</p>
    <div className="motion-library">{motionOptions.map(option => {
      const extension = isExtension(option.kind);
      return <button key={option.name} aria-label={`Add continuous ${option.name.toLowerCase()}`} onClick={() => choose(action(option.kind, { axis: option.axis, value: extension ? option.value : Math.sign(option.value) * 30, continuous: true }))}>
        <span className={`tool-icon continuous-preview ${extension ? 'preview-bounce' : option.value < 0 ? 'preview-clockwise' : 'preview-counterclockwise'}`}><Glyph item={{ ...option, color: colors[0] }} size={28}/></span>
        <strong>{option.name}</strong><span className="motion-type"><Repeat2 size={12}/>{extension ? 'Bounce' : 'Rotate'}</span>
      </button>;
    })}</div><small>Inserted at the marker. Select its tile to adjust the motion or turn Continuous motion off.</small>
  </section></div>;
}

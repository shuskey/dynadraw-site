import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

const tabs = ['How it works', 'Backstory', 'Credits'] as const;
export default function About({ close }: { close: () => void }) {
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { dialog.current?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="help-modal about-modal" aria-labelledby="about-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => {
    if (e.target === e.currentTarget) {
      const bounds = e.currentTarget.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close();
    }
  }}>
    <button autoFocus className="icon-button modal-close" aria-label="Close About DynaDraw" onClick={close}><X size={20}/></button>
    <div className="eyebrow">A FEW SIMPLE ACTIONS. ENDLESS MOVING POSSIBILITIES.</div>
    <h2 id="about-title">About DynaDraw</h2>
    <p className="about-intro">DynaDraw is a playground for building moving 3D drawings. Combine movement, turns, color, and objects, then add a pen and let motion leave its mark.</p>
    <div className="about-tabs" role="tablist" aria-label="Explore DynaDraw" onKeyDown={e => {
      let next = active;
      if (e.key === 'ArrowRight') next = (active + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (active + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault(); setActive(next); tabButtons.current[next]?.focus();
    }}>
      {tabs.map((tab, i) => <button key={tab} ref={button => { tabButtons.current[i] = button; }} id={`about-tab-${i}`} role="tab" aria-selected={active === i} aria-controls={`about-panel-${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)}>{tab}</button>)}
    </div>
    <section id="about-panel-0" role="tabpanel" aria-labelledby="about-tab-0" hidden={active !== 0} tabIndex={0}>
      <h3>How it works</h3>
      <p>Build a sequence of actions, give it motion, and watch your drawing take shape. Select any step to adjust it, or try an example and make it your own.</p>
      <p><strong>Choose a starting mode.</strong> Surface starts forward along the grid; Space starts upward. Switch modes above the canvas. Tilts and twists can still take you into 3D in either mode.</p><p><strong>1. Build a sequence.</strong> Click an action to insert it at the marker. Extend draw moves forward and draws a column. Extend move advances the same distance without a column, so objects can fly freely. Turn left or right, tilt up or down, and twist left or right to change what follows.</p><p><strong>2. Give it motion.</strong> Choose Continuous motion for bouncing extensions or ongoing turns, tilts, and twists. You can also select a regular extension or turn and check Continuous motion. Adjust its reach or speed in the settings.</p><p><strong>3. Make it yours.</strong> Use the left and right arrows above the sequence, or tap between tiles, to move the insertion marker. The delete button removes the selected action, or the action just before the marker. Select a tile to adjust or delete it. Undo brings back earlier edits.</p><p><strong>Add an object.</strong> Choose a model, then select its tile to change size and orientation. Disks, toruses and rings use the active drawing color. Dragons, rockets, worlds, swords and asteroids keep their own colors.</p><p><strong>Draw with motion.</strong> Add Draw after moving segments to leave a continuous line in the color active at that point. Pause keeps the ink; Clear ink erases it. Editing the sequence or restarting begins a fresh trace.</p><p><strong>Keep your drawing.</strong> Save stores the action sequence in this browser. Ink is drawn live and is not saved. Examples replace the current sequence; you can undo that too.</p>
    </section>
    <section id="about-panel-1" role="tabpanel" aria-labelledby="about-tab-1" hidden={active !== 1} tabIndex={0}>
      <h3>Backstory</h3>
      <p>DynaDraw Studio traces its roots to <strong>Michael R. Dunlavey’s Dyna-Draw, created in 1989</strong>.</p>
      <p><strong>Scott Huskey</strong> adapted that idea into <strong>3D Dyna-Draw</strong>, originally built with the Unity game engine. This browser version carries that exploration forward with visual actions and a live 3D canvas.</p>
      <p className="about-callout">Originally created in Unity, now rebuilt for the web with <strong>TypeScript, React, and Three.js</strong>.</p>
    </section>
    <section id="about-panel-2" role="tabpanel" aria-labelledby="about-tab-2" hidden={active !== 2} tabIndex={0}>
      <h3>Credits &amp; thanks</h3>
      <dl className="about-credits"><div><dt>Original Dyna-Draw</dt><dd>Michael R. Dunlavey</dd></div><div><dt>3D Dyna-Draw</dt><dd>Scott Huskey</dd></div></dl>
      <p>With thanks to the original beta testers:<br/><strong>Jason Nazar · Laura Huskey · Arie Babayan</strong></p>
      <p>And to all the inspiring people who helped bring DynaDraw to life—you know who you are.</p>
      <p>The browser edition uses original models built in code and a generated globe texture. Its interface and 3D graphics are powered by React, Three.js, React Three Fiber, Drei, and Lucide icons.</p>
    </section>
    <button className="save-button" onClick={close}>Let’s make something <ArrowUpRight size={17}/></button>
  </dialog>;
}

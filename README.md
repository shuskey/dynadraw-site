# DynaDraw Studio

A browser-native prototype of DynaDraw: compose a moving 3D drawing using visual actions instead of single-letter commands.

## Run locally

```sh
npm ci
npm run dev
```

`npm test` checks the drawing engine. `npm run build` type-checks and produces a static site in `dist/`. `npm run preview` serves that production build locally.

## Prototype 01

- Insert extensions, turns on three axes, continuous rotation, and colors.
- Add objects from a thumbnail chooser: Dragon, Rocket, World, Asteroid, Sword, Disk, Torus, and Ring. Select a tile to change its model, size, or orientation. Try Dragon flight or Rocket ride.
- Disks, toruses, and rings inherit the color active at their place in the sequence. Dragons, rockets, worlds, asteroids, and swords keep their built-in materials.
- Add Draw to attach a pen at that point in the sequence. Its motion leaves a continuous line in the color active there; earlier ink never fades or expires. Try the Ink orbit example.
- Pause preserves ink. Clear ink erases only the trace; Restart resets motion and ink. Editing the sequence starts a fresh trace.
- Click between tiles to move the insertion marker; select a tile to edit its settings.
- Delete selected actions, undo/redo edits, and try the built-in examples.
- Orbit and zoom the camera; pause, restart, and change animation speed.
- Save one drawing in this browser and restore it on the next visit.
- Arrow keys move the marker; Backspace/Delete remove actions; Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z redoes; Cmd/Ctrl+S saves.

## Architecture

React + TypeScript provide the editor. `src/engine.ts` defines the structured action document and evaluates its geometry at a given animation time. `src/Scene.tsx` renders that output with Three.js and React Three Fiber. `src/App.tsx` owns editing, history, and browser persistence. Vite builds the static assets; `.openai/hosting.json` identifies the ChatGPT Site and its `dist/` output.

Turns use local axes. A rotation affects all following segments, so multiple rotations can create articulated motion. A marker in the canvas shows the position and direction of the insertion point; selecting an extension highlights its segment.

Ink grows in connected buffer chunks without discarding older points. Long sessions use memory in proportion to the amount drawn; stationary pens do not accumulate duplicate points. Save restores the action sequence, and ink is generated anew when the page opens.

This first prototype supports up to 80 actions. It does not yet import the Unity command language or include branches, repeat groups, fading smoke, cloud saving, or shared galleries. Saving is browser-local and is separate for the local preview and the published Site.

The first object collection uses original procedural models and a generated globe texture, with no external asset downloads. Models attach at the current drawing position without advancing it. Selecting an object shows an outline without tinting its materials. GLB importing is not yet implemented.

Rockets and dragons face their direction of motion using successive positions, following the original Unity `RotateRocketScript`. Each model's +Y nose follows velocity while its previous orientation is carried forward with the smallest required rotation. This avoids the original fixed-up reference's 180-degree roll flips at the poles; complex paths can gradually accumulate bank. Paused or stationary rockets and dragons keep their last heading. Sequence edits and animation restart reset the position history so jumps are not interpreted as flight. Other objects retain their authored orientation.

The Dragon is an original procedural, wingless model inspired by a blue carousel dragon: a continuous serpentine body and tapered tail, raised cobalt scales, segmented gold belly, red dorsal crest, gold antlers and whiskers, four clawed legs, and an ivory pearl floating ahead. Like the rocket, its +Y flight direction follows displacement. The authored dragon is rolled 180° around its flight axis to keep the intended upright pose. Its body pose is static; body undulation can be added later. Dragon flight demonstrates movement with the existing sequence controls.

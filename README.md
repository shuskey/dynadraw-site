# DynaDraw Studio

A browser-native prototype of DynaDraw: compose a moving 3D drawing using visual actions instead of single-letter commands.

## Run locally

```sh
npm ci
npm run dev
```

`npm test` checks the drawing engine. `npm run build` type-checks and produces a static site in `dist/`. `npm run preview` serves that production build locally.

## Prototype 01

Surface mode is the default for new drawings: the starting direction lies along the grid, equivalent to an initial -90° X tilt. Switch to Space above the canvas for the original upward starting direction. The mode sets the starting frame; tilts and animated rotations still work in full 3D. Mode changes support undo/redo and restart motion and ink. Save stores the mode with the sequence; older action-array saves reopen in Space to preserve their original layout.

- Insert Extend draw (move forward with a visible column) or Extend move (move forward without a column), Turn left/right, Tilt up/down, Twist left/right, continuous rotation, and colors.
- Add objects from a thumbnail chooser: Dragon, Rocket, World, Asteroid, Sword, Disk, Torus, and Ring. Select a tile to change its model, size, or orientation. Try Dragon flight or Rocket ride.
- Disks, toruses, and rings inherit the color active at their place in the sequence. Dragons, rockets, worlds, asteroids, and swords keep their built-in materials.
- Add Draw to attach a pen at that point in the sequence. Its motion leaves a continuous line in the color active there; earlier ink never fades or expires. Try the Ink orbit example.
- Pause preserves ink. Clear ink erases only the trace; Restart resets motion and ink. Editing the sequence starts a fresh trace.
- Click between tiles to move the insertion marker; select a tile to edit its settings.
- Delete selected actions, undo/redo edits, and try the built-in examples.
- Orbit and zoom the camera; pause, restart, and change animation speed.
- Save one drawing in this browser and restore it on the next visit.
- On-screen left/right buttons move the insertion marker. Delete removes the selected action, or the action before the marker; Undo restores it. These controls have phone-sized touch targets.
- Arrow keys move the marker; Backspace/Delete remove actions; Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z redoes; Cmd/Ctrl+S saves.

## Architecture

React + TypeScript provide the editor. `src/engine.ts` defines the structured action document and evaluates its geometry at a given animation time. `src/Scene.tsx` renders that output with Three.js and React Three Fiber. `src/App.tsx` owns editing, history, and browser persistence. Vite builds the static assets; `.openai/hosting.json` identifies the ChatGPT Site and its `dist/` output.

Turns use local axes. A rotation affects all following segments, so multiple rotations can create articulated motion. A marker in the canvas shows the position and direction of the insertion point; selecting an extension highlights its segment.

Ink grows in connected buffer chunks without discarding older points. Long sessions use memory in proportion to the amount drawn; stationary pens do not accumulate duplicate points. Save restores the action sequence, and ink is generated anew when the page opens.

This first prototype supports up to 80 actions. It does not yet import the Unity command language or include branches, repeat groups, fading smoke, cloud saving, or shared galleries. Saving is browser-local and is separate for the local preview and the published Site.

The first object collection uses original procedural models and a generated globe texture, with no external asset downloads. Models attach at the current drawing position without advancing it. Selecting an object shows an outline without tinting its materials. GLB importing is not yet implemented.

Rockets, dragons, and swords default to facing their direction of motion using successive positions, following the original Unity `RotateRocketScript`. Each model's +Y nose follows velocity while its previous orientation is carried forward with the smallest required rotation. This avoids the original fixed-up reference's 180-degree roll flips at the poles; complex paths can gradually accumulate bank. Paused or stationary objects with auto heading keep their last heading. Select one of these objects and uncheck “Auto heading · faces motion” to use its manual Orientation and Axis settings instead. The checkbox is saved with the drawing and supports undo/redo. Sequence edits and animation restart reset the position history so jumps are not interpreted as flight. Other objects retain their authored orientation.

The Dragon is an original procedural, wingless model inspired by a blue carousel dragon: a continuous serpentine body and tapered tail, raised cobalt scales, segmented gold belly, red dorsal crest, gold antlers and whiskers, four clawed legs, and an ivory pearl floating ahead. Like the rocket, its +Y flight direction follows displacement. The authored dragon is rolled 180° around its flight axis to keep the intended upright pose. Its body pose is static; body undulation can be added later. Dragon flight demonstrates movement with the existing sequence controls.

Extend draw and Extend move share the same distance controls and local direction. Select either tile to switch its Operation without changing its distance. Existing saved extensions remain Extend draw. Move steps position later objects, pens, and columns without creating connecting geometry; an attached Draw pen still leaves its animated trail. Dragon flight and Rocket ride use invisible move steps.

Continuous motion opens an eight-choice menu matching the direction controls. Choose bouncing Extend draw/move or continuous Turn left/right, Tilt up/down, and Twist left/right. Cards animate and display Bounce/Rotate labels; reduced-motion preferences disable their animations. The same Continuous motion checkbox appears when editing any extension or turn. Static steps default to unchecked; older spin actions remain continuous and can be switched off.

Bounce matches the original Unity `ColorAndLengthScript` F/M behavior: start at zero moving backward, reflect at negative and positive reach, and repeat at constant speed. Reach is the maximum distance on either side of the insertion point; Speed is units per second (defaulting to 2.5 times reach, matching the original Arm prefab's speed 5 / reach 2 ratio and 1.6-second cycle). Extend draw stretches/retracts a column through the start; Extend move creates no column. Turns use signed degrees per second while continuous and signed degrees while static. Global pause, restart, and playback speed apply to all motions. Settings persist with the drawing and support undo/redo.

Draw settings include a Thickness spinner (0.02–0.18 world units). Ink is a round 3D trail with spherical joins and ends; columns are 0.15 units wide. Older saved Draw actions retain the 0.02 default. Thickness is saved with the action and supports Undo/Redo.

## Analytics

Plausible runs only on the published production hostname; localhost and previews do not send analytics. The private Plausible dashboard receives standard traffic metrics plus fixed custom event names: Started creating, Saved drawing, Used example, Added object, Used continuous motion, Used Draw, and 3D canvas failed. Each custom event is sent at most once per page load to measure feature adoption without counting every edit. Started creating means a sequence or mode edit, including loading an example. Save is recorded only after browser storage succeeds. No drawing contents or contact details are attached. Matching Custom event goals must be configured in Plausible to display conversions. Active interaction time is not implemented; standard visit duration is supplied by Plausible.

## Feedback

Share feedback in the header opens a panel with an optional rating, a required comment, and an optional reply address. Open email draft prepares a message to scott+sites@photoloom.com; visitors must send it from their email app. No submission is stored on the site, and no comments or reply addresses are sent to analytics. This version requires a configured email app; direct in-site delivery can be connected later.

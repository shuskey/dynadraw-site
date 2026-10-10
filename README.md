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
- Add Draw to attach a pen at that point in the sequence. Its motion leaves a continuous line in the color active there; earlier ink never fades or expires. Try the Ink orbit example.
- Pause preserves ink. Clear ink erases only the trace; Restart resets motion and ink. Editing the sequence starts a fresh trace.
- Click between tiles to move the insertion marker; select a tile to edit its settings.
- Delete selected actions, undo/redo edits, and try three examples.
- Orbit and zoom the camera; pause, restart, and change animation speed.
- Save one drawing in this browser and restore it on the next visit.
- Arrow keys move the marker; Backspace/Delete remove actions; Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z redoes; Cmd/Ctrl+S saves.

## Architecture

React + TypeScript provide the editor. `src/engine.ts` defines the structured action document and evaluates its geometry at a given animation time. `src/Scene.tsx` renders that output with Three.js and React Three Fiber. `src/App.tsx` owns editing, history, and browser persistence. Vite builds the static assets; `.openai/hosting.json` identifies the ChatGPT Site and its `dist/` output.

Turns use local axes. A rotation affects all following segments, so multiple rotations can create articulated motion. A marker in the canvas shows the position and direction of the insertion point; selecting an extension highlights its segment.

Ink grows in connected buffer chunks without discarding older points. Long sessions use memory in proportion to the amount drawn; stationary pens do not accumulate duplicate points. Save restores the action sequence, and ink is generated anew when the page opens.

This first prototype supports up to 80 actions. It does not yet import the Unity command language or include branches, repeat groups, fading smoke, cloud saving, or shared galleries. Saving is browser-local and is separate for the local preview and the published Site.

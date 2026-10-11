export const models = [
  { id: 'dragon', name: 'Dragon', inheritsColor: false, description: 'Cobalt, crimson & gold · chasing a pearl' },
  { id: 'rocket', name: 'Rocket', inheritsColor: false, description: 'Built-in red, ivory & blue' },
  { id: 'world', name: 'World', inheritsColor: false, description: 'Built-in ocean & land texture' },
  { id: 'asteroid', name: 'Asteroid', inheritsColor: false, description: 'Built-in rocky material' },
  { id: 'sword', name: 'Sword', inheritsColor: false, description: 'Built-in steel & gold' },
  { id: 'disk', name: 'Disk', inheritsColor: true, description: 'Uses the current drawing color' },
  { id: 'torus', name: 'Torus', inheritsColor: true, description: 'Uses the current drawing color' },
  { id: 'ring', name: 'Ring', inheritsColor: true, description: 'Uses the current drawing color' },
] as const;
export type ModelId = typeof models[number]['id'];
export function modelInfo(id: ModelId = 'rocket') { return models.find(model => model.id === id)!; }

export function supportsAutoHeading(id: ModelId = 'rocket') { return id === 'dragon' || id === 'rocket' || id === 'sword'; }

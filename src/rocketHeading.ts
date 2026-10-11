import { Quaternion, Vector3 } from 'three';
import type { Point } from './engine';

// Carry the rocket's orientation forward with the smallest rotation that aligns
// its local +Y nose to the new velocity. Unlike a fixed world-up look rotation,
// this preserves roll continuously when the flight path crosses an up-axis pole.
export class RocketHeading {
  private previous: Vector3 | undefined;
  private heading: Quaternion | undefined;

  update(position: Point, initialRotation: [number, number, number, number]): Quaternion {
    const current = new Vector3(...position);
    if (!this.heading) this.heading = new Quaternion(...initialRotation);
    if (this.previous) {
      const forward = current.clone().sub(this.previous);
      if (forward.lengthSq() > 1e-12) {
        forward.normalize();
        const priorForward = new Vector3(0, 1, 0).applyQuaternion(this.heading);
        const change = new Quaternion().setFromUnitVectors(priorForward, forward);
        this.heading.premultiply(change).normalize();
      }
    }
    this.previous = current;
    return this.heading;
  }
}

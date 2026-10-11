import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Point } from './engine';

const worldUp = new Vector3(0, 0, 1);

// Unity's RotateRocketScript uses the displacement between successive world
// positions and Vector3.forward as its up reference. Our rocket's nose points
// along local +Y (the Unity model used +Z), so construct that basis explicitly.
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
        let up = worldUp.clone();
        // At the pole, world Z cannot define roll. Keep the prior dorsal
        // direction when possible, or choose a perpendicular reference.
        if (Math.abs(forward.dot(up)) > 0.9999) {
          up.applyQuaternion(this.heading);
          if (Math.abs(forward.dot(up)) > 0.9999) up.set(0, 1, 0);
        }
        const right = forward.clone().cross(up).normalize();
        const dorsal = right.clone().cross(forward).normalize();
        this.heading.setFromRotationMatrix(new Matrix4().makeBasis(right, forward, dorsal));
      }
    }
    this.previous = current;
    return this.heading;
  }
}

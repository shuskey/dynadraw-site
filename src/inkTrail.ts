import type { Point } from './engine';

// Grow in connected chunks, retaining all previous ink instead of a fading or
// fixed-length trail. A stationary pen does not continually allocate points.
export const INK_CHUNK_SIZE = 4096;
export class InkTrail {
  readonly chunks: Point[][] = [[]];
  private last: Point | undefined;

  append(position: Point) {
    if (this.last && Math.hypot(...position.map((v, i) => v - this.last![i])) < 0.012) return null;
    let chunk = this.chunks[this.chunks.length - 1];
    if (chunk.length === INK_CHUNK_SIZE) {
      chunk = [this.last!];
      this.chunks.push(chunk);
    }
    const point: Point = [...position];
    chunk.push(point);
    this.last = point;
    return { chunkIndex: this.chunks.length - 1, pointIndex: chunk.length - 1, point, previous: chunk.length === 2 ? chunk[0] : undefined };
  }
}

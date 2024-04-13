// Internally, we define Vec2 as a namespace within Vec3 --
// this allows referencing Vec2s from Vec3 constructors without
// cyclic references.
import { Vec3, Vec2 } from './Vec3';

export type Point2 = Vec3;
export type Vec2 = Vec3;
export { Vec3, Vec2 };
export default Vec2;

import Mat33 from './Mat33';
import Vec3 from './Vec3';

export default class Triangle {
	public constructor(
        public readonly vertex1: Vec3,
        public readonly vertex2: Vec3,
        public readonly vertex3: Vec3,
	) {}

	public map(mapping: (vertex: Vec3)=>Vec3): Triangle {
		return new Triangle(
			mapping(this.vertex1),
			mapping(this.vertex2),
			mapping(this.vertex3),
		);
	}

	// Transform, treating this as composed of 2D points.
	public transformed2DBy(affineTransform: Mat33) {
		return this.map(affineTransform.transformVec2);
	}

	// Transforms this by a linear transform --- verticies are treated as
	// 3D points.
	public transformedBy(linearTransform: Mat33) {
		return this.map(linearTransform.transformVec3);
	}
}
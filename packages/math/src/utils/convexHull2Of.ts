import { Point2, Vec2 } from '../Vec2';

/**
 * Implements Gift Wrapping, in $O(nh)$. This algorithm is not the most efficient in the worst case.
 *
 * See https://en.wikipedia.org/wiki/Gift_wrapping_algorithm
 * and https://www.cs.jhu.edu/~misha/Spring16/06.pdf
 */
const convexHull2Of = (points: Point2[]) => {
	if (points.length === 0) {
		return [];
	}

	// 1. Start with a vertex on the hull
	const lowestPoint = points.reduce(
		(lowest, current) => (current.y < lowest.y ? current : lowest),
		points[0],
	);
	const vertices = [lowestPoint];
	let toProcess = [...points.filter((p) => !p.eq(lowestPoint))];
	let lastBaseDirection = Vec2.of(-1, 0);

	// 2. Find the point with greatest angle from the vertex:
	//
	//  . .     .
	//   . .   /  <- Notice that **all** other points are to the
	//       /       **left** of the vector from the current
	//    ./         vertex to the new point.
	while (toProcess.length > 0) {
		const lastVertex = vertices[vertices.length - 1];

		let smallestDotProductSoFar: number = lastBaseDirection.dot(
			lowestPoint.minus(lastVertex).normalizedOrZero(),
		);
		let furthestPointSoFar = lowestPoint;
		for (const point of toProcess) {
			// Maximizing the angle is the same as minimizing the dot product:
			//              point.minus(lastVertex)
			//             ^
			//            /
			//           /
			//        ϑ /
			//   <-----. lastBaseDirection
			const currentDotProduct = lastBaseDirection.dot(point.minus(lastVertex).normalizedOrZero());

			if (currentDotProduct <= smallestDotProductSoFar) {
				furthestPointSoFar = point;
				smallestDotProductSoFar = currentDotProduct;
			}
		}
		toProcess = toProcess.filter((p) => !p.eq(furthestPointSoFar));

		const newBaseDirection = furthestPointSoFar.minus(lastVertex).normalized();

		// If the last vertex is on the same edge as the current, there's no need to include
		// the previous one.
		if (Math.abs(newBaseDirection.dot(lastBaseDirection)) === 1 && vertices.length > 1) {
			vertices.pop();
		}

		// Stoping condition: We've gone in a full circle.
		if (furthestPointSoFar.eq(lowestPoint)) {
			break;
		} else {
			vertices.push(furthestPointSoFar);
			lastBaseDirection = lastVertex.minus(furthestPointSoFar).normalized();
		}
	}

	return vertices;
};

export default convexHull2Of;

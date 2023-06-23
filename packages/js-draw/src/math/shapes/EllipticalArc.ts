import Mat33 from '../Mat33';
import { Point2, Vec2 } from '../Vec2';
import Vec3 from '../Vec3';
import Abstract2DShape from './Abstract2DShape';
import Ellipse from './Ellipse';
import LineSegment2 from './LineSegment2';
import Rect2 from './Rect2';

class EllipticalArc extends Abstract2DShape {
	public readonly fullEllipse: Ellipse;
	public readonly minParam: number;
	public readonly maxParam: number;

	public constructor(
		// first focus
		f1: Point2,

		// second focus
		f2: Point2,

		// length of the semimajor axis
		rx: number,

		// The minimum value of the parameter used by `this.fullEllipse`.
		minParam: number,

		// The maximum value of `this.fullEllipse`'s parameter.
		maxParam: number,
	) {
		super();
		this.fullEllipse = new Ellipse(f1, f2, rx);
		console.log('  new Ellipse(' + f1 + ', ' + f2 + ', ' + rx + ', ' + this.fullEllipse.ry + ')');

		if (maxParam < minParam) {
			const tmp = maxParam;
			maxParam = minParam;
			minParam = tmp;
		}

		if (maxParam > Math.PI * 2) {
			maxParam -= 2 * Math.PI;
			minParam -= 2 * Math.PI;
		}

		if (minParam < -Math.PI) {
			maxParam += 2 * Math.PI;
			minParam += 2 * Math.PI;
		}

		this.minParam = minParam;
		this.maxParam = maxParam;
	}

	/** @see https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#arcs */
	public static fromStartEnd(
		startPoint: Point2,
		endPoint: Point2,
		rx: number,
		ry: number,
		majAxisRotation: number,
		largeArcFlag: boolean,
		sweepFlag: boolean
	): EllipticalArc|LineSegment2 {
		// Reference(1): https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
		if (rx === 0 || ry === 0) {
			return new LineSegment2(startPoint, endPoint);
		}

		rx = Math.abs(rx);
		ry = Math.abs(ry);


		// Swap axes if necessary
		if (ry > rx) {
			majAxisRotation -= Math.PI / 2;

			const tmp = rx;
			rx = ry;
			ry = tmp;
		}


		// Half of the vector from startPoint to endPoint
		const halfEndToStart = startPoint.minus(endPoint).times(0.5);
		const startPrime = Mat33.zRotation(-majAxisRotation).transformVec3(halfEndToStart);

		const lambda = (startPrime.x ** 2) / (rx ** 2) + (startPrime.y ** 2) / (ry ** 2);
		if (lambda >= 1) {
			rx *= Math.sqrt(lambda);
			ry *= Math.sqrt(lambda);
		}


		const rx2 = rx * rx;
		const ry2 = ry * ry;
		let scaleNumerator = rx2 * ry2 - rx2 * (startPrime.y ** 2) - ry2 * (startPrime.x ** 2);
		if (scaleNumerator < 0) {
			console.warn('Less than zero square root prevented: ', scaleNumerator);
			scaleNumerator = 0;
		}

		let centerPrimeScale = Math.sqrt(
			(scaleNumerator)
				/ (rx2 * (startPrime.y ** 2) + ry2 * (startPrime.x ** 2))
		);
		if (largeArcFlag === sweepFlag) {
			centerPrimeScale = -centerPrimeScale;
		}

		const centerPrime = Vec2.of(
			centerPrimeScale * rx * startPrime.y / ry,
			centerPrimeScale * -ry * startPrime.x / rx
		);

		const startEndMidpoint = startPoint.plus(endPoint).times(0.5);
		const center =
			Mat33.zRotation(majAxisRotation).transformVec3(centerPrime)
				.plus(startEndMidpoint);

		const angleBetween = (v1: Vec2, v2: Vec2) => {
			return v2.angle() - v1.angle();
		};

		const v1 = Vec2.of(
			(startPrime.x - centerPrime.x) / rx,
			(startPrime.y - centerPrime.y) / ry,
		);
		const v2 = Vec2.of(
			(-startPrime.x - centerPrime.x) / rx,
			(-startPrime.y - centerPrime.y) / ry,
		);

		const theta1 = angleBetween(Vec2.unitX, v1);
		let sweepAngle = angleBetween(v1, v2) % (Math.PI * 2);
		if (sweepFlag) {
			if (sweepAngle < 0) {
				sweepAngle += Math.PI * 2;
			}
		} else {
			if (sweepAngle > 0) {
				sweepAngle -= Math.PI * 2;
			}
		}
		const theta2 = theta1 - sweepAngle;

		// A vector pointing in the direction of the ellipse's major axis.
		const horizontalAxis =
			Vec2.of(Math.cos(majAxisRotation), Math.sin(majAxisRotation));

		// We now must find the foci. For a point on the ellipse's vertical axis,
		//      point
		//       /|\
		//      / | \
		//   α /  |ry\ α
		//    /   |   \
		//  f1▔▔▔▔▔▔▔▔▔f2
		//     ℓ    ℓ
		//
		// Thus, because α + α = 2rx and ℓ² + ry² = α²,
		const l = Math.sqrt(rx2 - ry2);
		const f1 = center.minus(horizontalAxis.times(-l));
		const f2 = center.minus(horizontalAxis.times(l));

		return new EllipticalArc(f1, f2, rx, theta1, theta2);
	}

	public override signedDistance(point: Vec3): number {
		const ellipseClosestPoint = this.fullEllipse.closestPointTo(point);

		// Is the closest point on the full ellipse the same as the closest point on this arc?
		if (this.containsPoint(ellipseClosestPoint)) {
			return ellipseClosestPoint.minus(point).length();
		}

		// Otherwise, consider the endpoints and the point on the opposite side of the ellipse
		const closestPointParam = this.fullEllipse.parameterForPoint(ellipseClosestPoint)!;
		const oppositeSidePoint = this.fullEllipse.at(closestPointParam + Math.PI);
		const endpoint1 = this.fullEllipse.at(this.minParam);
		const endpoint2 = this.fullEllipse.at(this.maxParam);

		// TODO: Are these distances exhaustive?
		const oppositeSidePointDist = oppositeSidePoint.minus(point).length();
		const endpoint1Dist = endpoint1.minus(point).length();
		const endpoint2Dist = endpoint2.minus(point).length();

		if (endpoint1Dist <= endpoint2Dist && endpoint1Dist <= oppositeSidePointDist) {
			return endpoint1Dist;
		} else if (endpoint2Dist <= oppositeSidePointDist) {
			return endpoint2Dist;
		} else {
			return oppositeSidePointDist;
		}
	}

	public override containsPoint(point: Vec3): boolean {
		const t = this.fullEllipse.parameterForPoint(point);
		if (t === null) {
			return false;
		}

		const otherT = t + Math.PI * 2;

		const min = this.minParam - Abstract2DShape.smallValue;
		const max = this.maxParam + Abstract2DShape.smallValue;
		return (t >= min && t <= max) || (otherT >= min && otherT <= max);
	}

	public override intersectsLineSegment(lineSegment: LineSegment2): Point2[] {
		const fullEllipseIntersection = this.fullEllipse.intersectsLineSegment(lineSegment);
		return fullEllipseIntersection.filter(point => {
			return this.containsPoint(point);
		});
	}

	public override getTightBoundingBox(): Rect2 {
		const extrema = this.fullEllipse.getXYExtrema().filter(point => this.containsPoint(point));
		const minPoint = this.fullEllipse.at(this.minParam);
		const maxPoint = this.fullEllipse.at(this.maxParam);
		return Rect2.bboxOf([ ...extrema, minPoint, maxPoint ]);
	}

	/** Alias for `.fullEllipse.at`. */
	public at(t: number) {
		return this.fullEllipse.at(t);
	}
}

export default EllipticalArc;

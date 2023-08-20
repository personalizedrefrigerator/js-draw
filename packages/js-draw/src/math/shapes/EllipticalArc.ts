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

	/** True iff this arc goes from maxParam to minParam */
	public readonly reverseSweep: boolean;

	/** True iff this arc has an angle of more than π. */
	public readonly largeArc: boolean;

	public constructor(
		// first focus
		f1: Point2,

		// second focus
		f2: Point2,

		// length of the semimajor axis
		rx: number,

		// The minimum value of the parameter used by `this.fullEllipse`.
		minParam: number|Point2,

		// The maximum value of `this.fullEllipse`'s parameter.
		maxParam: number|Point2,
	) {
		super();
		this.fullEllipse = new Ellipse(f1, f2, rx);
		console.log('  new Ellipse(' + f1 + ', ' + f2 + ', ' + rx + ', ' + this.fullEllipse.ry + ')');

		// Convert point arguments.
		if (typeof minParam !== 'number') {
			minParam = this.fullEllipse.parameterForPointUnchecked(minParam);
		}

		if (typeof maxParam !== 'number') {
			maxParam = this.fullEllipse.parameterForPointUnchecked(maxParam);
		}

		if (maxParam < minParam) {
			const tmp = maxParam;
			maxParam = minParam;
			minParam = tmp;
			this.reverseSweep = true;
		} else {
			this.reverseSweep = false;
		}

		this.largeArc = maxParam - minParam >= Math.PI;

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

		console.log(`    with min ${this.getStartPoint()} -> ${this.getEndPoint()}`);
		console.log(`         ϑmin(${this.minParam}) ϑmax(${this.maxParam})`);
	}

	public static fromFociAndStartEnd(
		// first focus
		f1: Point2,

		// second focus
		f2: Point2,

		startPoint: Point2,
		endPoint: Point2,
	) {
		// ‖ f1 - p ‖ + ‖ f2 - p ‖ = 2rx
		const rx1 = (f1.minus(startPoint).length() + f2.minus(startPoint).length()) / 2;
		const rx2 = (f1.minus(endPoint).length() + f2.minus(endPoint).length()) / 2;

		// Assert rx1 is close to rx2
		console.assert(Math.abs(rx1 - rx2) < 0.01, `${rx1} ?= ${rx2}`);

		return new EllipticalArc(f1, f2, rx1, startPoint, endPoint);
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
		// Reference(1): https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter\
		// Reference(2): https://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
		if (rx === 0 || ry === 0) {
			return new LineSegment2(startPoint, endPoint);
		}

		rx = Math.abs(rx);
		ry = Math.abs(ry);


		// Swap axes if necessary
		if (ry > rx) {
			console.log('axswp');
			majAxisRotation += Math.PI / 2;

			const tmp = rx;
			rx = ry;
			ry = tmp;
		}


		// Half of the vector from startPoint to endPoint
		const halfEndToStart = startPoint.minus(endPoint).times(0.5);
		const phi = majAxisRotation;
		const cosPhi = Math.cos(phi);
		const sinPhi = Math.sin(phi);
		const startPrime = Vec2.of(
			cosPhi * halfEndToStart.x + sinPhi * halfEndToStart.y,
			-sinPhi * halfEndToStart.x + cosPhi * halfEndToStart.y,
		);
		// TODO:
		//Mat33.zRotation(majAxisRotation).transformVec3(halfEndToStart);

		const lambda = (startPrime.x ** 2) / (rx ** 2) + (startPrime.y ** 2) / (ry ** 2);
		if (lambda >= 1) {
			console.log('too small, growing');
			rx *= Math.sqrt(lambda);
			ry *= Math.sqrt(lambda);
		}

		console.log(`El(${startPoint}, ${endPoint}, ${rx}, ${ry}, ${majAxisRotation} )`);
		console.log(`    mp ${halfEndToStart}`);
		console.log(`    s' ${startPrime}`);


		const rx2 = rx * rx;
		const ry2 = ry * ry;
		const startPrime2 = Vec2.of(startPrime.x ** 2, startPrime.y ** 2);
		let scaleNumerator = rx2 * ry2 - rx2 * startPrime2.y - ry2 * startPrime2.x;
		if (scaleNumerator < 0) {
			console.warn('    Below-zero numerator. Zeroing... Numerator was', scaleNumerator);
			scaleNumerator = 0;
		}

		let centerPrimeScale = Math.sqrt(
			scaleNumerator
				/ (rx2 * startPrime2.y + ry2 * startPrime2.y)
		);
		console.log(`   scale: √(${scaleNumerator})/${rx2 * (startPrime.y ** 2) + ry2 * (startPrime.x ** 2)}`);
		if (largeArcFlag === sweepFlag) {
			centerPrimeScale = -centerPrimeScale;
		}

		const centerPrime = Vec2.of(
			rx * startPrime.y / ry,
			-ry * startPrime.x / rx
		).times(centerPrimeScale);
		console.log(`    c' ${centerPrime}`);

		const startEndMidpoint = startPoint.plus(endPoint).times(0.5);
		const center = Vec2.of(
			cosPhi * centerPrime.x - sinPhi * centerPrime.y,
			sinPhi * centerPrime.x + cosPhi * centerPrime.y,
		).plus(startEndMidpoint);
		//	Mat33.zRotation(-majAxisRotation).transformVec3(centerPrime)
		//	.plus(startEndMidpoint);
		console.log(`    c: ${center}`);

		const angleBetween = (v1: Vec2, v2: Vec2) => {
			if (v1.eq(Vec2.zero) || v2.eq(Vec2.zero)) {
				return 0;
			}

			let result = v2.angle() - v1.angle();
			if (result < 0) {
				result += 2 * Math.PI;
			}

			return result;
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
		let sweepAngle = angleBetween(v1, v2);
		if (sweepFlag) {
			if (sweepAngle < 0) {
				sweepAngle += Math.PI * 2;
			}
		} else {
			if (sweepAngle > 0) {
				sweepAngle -= Math.PI * 2;
			}
		}
		const theta2 = theta1 + sweepAngle;
		console.log('    dtheta', theta1, theta2);

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
		console.log(`    l: ${l}, f1: ${f1}, f2: ${f2}`);

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

	/**
	 * Returns the starting point for this arc. Note that this may be different
	 * from `this.at(this.minParam)` if `this.reverseSweep` is true.
	 */
	public getStartPoint() {
		return this.at(this.reverseSweep ? this.maxParam : this.minParam);
	}

	public getEndPoint() {
		return this.at(this.reverseSweep ? this.minParam : this.maxParam);
	}

	/** Alias for `.fullEllipse.at`. */
	public at(t: number) {
		return this.fullEllipse.at(t);
	}
}

export default EllipticalArc;

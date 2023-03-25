import { Bezier } from 'bezier-js';
import LineSegment2 from './LineSegment2';
import Path, { PathCommandType } from './Path';
import Rect2 from './Rect2';
import { Vec2 } from './Vec2';

describe('Path', () => {
	it('should instantiate Beziers from cubic and quatratic commands', () => {
		const path = new Path(Vec2.zero, [
			{
				kind: PathCommandType.CubicBezierTo,
				controlPoint1: Vec2.of(1, 1),
				controlPoint2: Vec2.of(-1, -1),
				endPoint: Vec2.of(3, 3),
			},
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(1, 1),
				endPoint: Vec2.of(0, 0),
			},
		]);

		expect(path.geometry.length).toBe(2);

		const firstItem = path.geometry[0];
		const secondItem = path.geometry[1];
		expect(firstItem).toBeInstanceOf(Bezier);
		expect(secondItem).toBeInstanceOf(Bezier);

		// Force TypeScript to do type narrowing.
		if (!(firstItem instanceof Bezier) || !(secondItem instanceof Bezier)) {
			throw new Error('Invalid state! .toBeInstanceOf should have caused test to fail!');
		}

		// Make sure the control points (and start/end points) match what was set
		expect(firstItem.points).toMatchObject([
			{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 3, y: 3 }
		]);
		expect(secondItem.points).toMatchObject([
			{ x: 3, y: 3 }, { x: 1, y: 1 }, { x: 0, y: 0 },
		]);
	});

	it('should create LineSegments from line commands', () => {
		const lineStart = Vec2.zero;
		const lineEnd = Vec2.of(100, 100);

		const path = new Path(lineStart, [
			{
				kind: PathCommandType.LineTo,
				point: lineEnd,
			},
		]);

		expect(path.geometry.length).toBe(1);
		expect(path.geometry[0]).toBeInstanceOf(LineSegment2);
		expect(path.geometry[0]).toMatchObject(
			new LineSegment2(lineStart, lineEnd)
		);
	});

	it('should give all intersections for a path made up of lines', () => {
		const lineStart = Vec2.of(100, 100);
		const path = new Path(lineStart, [
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(-100, 100),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(0, 0),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(100, -100),
			},
		]);

		const intersections = path.intersection(
			new LineSegment2(Vec2.of(-50, 200), Vec2.of(-50, -200))
		);

		// Should only have intersections in quadrants II and III.
		expect(intersections.length).toBe(2);

		// First intersection should be with the first curve
		const firstIntersection = intersections[0];
		expect(firstIntersection.point.xy).toMatchObject({
			x: -50,
			y: 100,
		});
		expect(firstIntersection.curve.get(firstIntersection.parameterValue)).toMatchObject({
			x: -50,
			y: 100,
		});
	});

	describe('polylineApproximation', () => {
		it('should approximate Bézier curves with polylines', () => {
			const path = Path.fromString('m0,0 l4,4 Q 1,4 4,1z');

			expect(path.polylineApproximation()).toMatchObject([
				new LineSegment2(Vec2.of(0, 0), Vec2.of(4, 4)),
				new LineSegment2(Vec2.of(4, 4), Vec2.of(1, 4)),
				new LineSegment2(Vec2.of(1, 4), Vec2.of(4, 1)),
				new LineSegment2(Vec2.of(4, 1), Vec2.of(0, 0)),
			]);
		});
	});

	describe('roughlyIntersectsClosed', () => {
		it('small, line-only path', () => {
			const path = Path.fromString('m0,0 l10,10 L0,10 z');
			expect(
				path.closedRoughlyIntersects(Rect2.fromCorners(Vec2.zero, Vec2.of(20, 20)))
			).toBe(true);
			expect(
				path.closedRoughlyIntersects(Rect2.fromCorners(Vec2.zero, Vec2.of(2, 2)))
			).toBe(true);
			expect(
				path.closedRoughlyIntersects(new Rect2(10, 1, 1, 1))
			).toBe(false);
			expect(
				path.closedRoughlyIntersects(new Rect2(1, 5, 1, 1))
			).toBe(true);
		});

		it('path with Bézier curves', () => {
			const path = Path.fromString(`
				M1090,2560
				L1570,2620
				Q1710,1300 1380,720
				Q980,100 -460,-640
				L-680,-200
				Q670,470 960,980
				Q1230,1370 1090,2560
			`);
			expect(
				path.closedRoughlyIntersects(new Rect2(0, 0, 500, 500))
			).toBe(true);
			expect(
				path.closedRoughlyIntersects(new Rect2(0, 0, 5, 5))
			).toBe(true);
			expect(
				path.closedRoughlyIntersects(new Rect2(-10000, 0, 500, 500))
			).toBe(false);
		});
	});

	describe('roughlyIntersects', () => {
		it('should consider parts outside bbox of individual parts of a line as not intersecting', () => {
			const path = Path.fromString(`
				M10,10
				L20,20
				L100,21
			`);
			expect(
				path.roughlyIntersects(new Rect2(0, 0, 50, 50))
			).toBe(true);
			expect(
				path.roughlyIntersects(new Rect2(0, 0, 5, 5))
			).toBe(false);
			expect(
				path.roughlyIntersects(new Rect2(8, 22, 1, 1))
			).toBe(false);
			expect(
				path.roughlyIntersects(new Rect2(21, 11, 1, 1))
			).toBe(false);
			expect(
				path.roughlyIntersects(new Rect2(50, 19, 1, 2))
			).toBe(true);
		});
	});

	describe('fromRect', () => {
		const filledRect = Path.fromRect(Rect2.unitSquare);
		const strokedRect = Path.fromRect(Rect2.unitSquare, 0.1);

		it('filled should be closed shape', () => {
			const lastSegment = filledRect.parts[filledRect.parts.length - 1];

			if (lastSegment.kind !== PathCommandType.LineTo) {
				throw new Error('Rectangles should only be made up of lines');
			}

			expect(filledRect.startPoint).objEq(lastSegment.point);
		});

		it('stroked should be closed shape', () => {
			const lastSegment = strokedRect.parts[strokedRect.parts.length - 1];
			if (lastSegment.kind !== PathCommandType.LineTo) {
				throw new Error('Rectangles should only be made up of lines');
			}

			expect(strokedRect.startPoint).objEq(lastSegment.point);
		});
	});
});

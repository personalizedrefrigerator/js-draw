import LineSegment2 from './LineSegment2';
import Path, { CurveIndexRecord, PathCommandType } from './Path';
import Rect2 from './Rect2';
import { Point2, Vec2 } from '../Vec2';
import CubicBezier from './CubicBezier';
import QuadraticBezier from './QuadraticBezier';

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
		expect(firstItem).toBeInstanceOf(CubicBezier);
		expect(secondItem).toBeInstanceOf(QuadraticBezier);

		// Force TypeScript to do type narrowing.
		if (!(firstItem instanceof CubicBezier) || !(secondItem instanceof QuadraticBezier)) {
			throw new Error('Invalid state! .toBeInstanceOf should have caused test to fail!');
		}

		// Make sure the control points (and start/end points) match what was set
		expect(firstItem.getPoints()).toMatchObject([
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: -1, y: -1 },
			{ x: 3, y: 3 },
		]);
		expect(secondItem.getPoints()).toMatchObject([
			{ x: 3, y: 3 },
			{ x: 1, y: 1 },
			{ x: 0, y: 0 },
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
		expect(path.geometry[0]).toMatchObject(new LineSegment2(lineStart, lineEnd));
	});

	it.each([
		['m0,0 L1,1', 'M0,0 L1,1', true],
		['m0,0 L1,1', 'M1,1 L0,0', false],
		['m0,0 L1,1 Q2,3 4,5', 'M1,1 L0,0', false],
		['m0,0 L1,1 Q2,3 4,5', 'M1,1 L0,0 Q2,3 4,5', false],
		['m0,0 L1,1 Q2,3 4,5', 'M0,0 L1,1 Q2,3 4,5', true],
		['m0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', 'M0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', true],
		['m0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9Z', 'M0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', false],
		['m0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', 'M0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9Z', false],
		['m0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', 'M0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9.01', false],
		['m0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', 'M0,0 L1,1 Q2,3 4,5 C4,5 6,7.01 8,9', false],
		['m0,0 L1,1 Q2,3 4,5 C4,5 6,7 8,9', 'M0,0 L1,1 Q2,3 4,5 C4,5.01 6,7 8,9', false],
	])('.eq should check equality', (path1Str, path2Str, shouldEqual) => {
		expect(Path.fromString(path1Str)).objEq(Path.fromString(path1Str));
		expect(Path.fromString(path2Str)).objEq(Path.fromString(path2Str));
		expect(Path.fromString(path1Str).eq(Path.fromString(path2Str))).toBe(shouldEqual);
	});

	describe('intersection', () => {
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
				new LineSegment2(Vec2.of(-50, 200), Vec2.of(-50, -200)),
			);

			// Should only have intersections in quadrants II and III.
			expect(intersections.length).toBe(2);

			// First intersection should be with the first curve
			const firstIntersection = intersections[0];
			expect(firstIntersection.point.xy).toMatchObject({
				x: -50,
				y: 100,
			});
		});

		it('should give all intersections for a stroked path', () => {
			const lineStart = Vec2.of(100, 100);

			// Create a path in this shape:
			// + - - - -|- - - - +
			//  \       |
			//    \     |
			//      \   |
			//        \ |
			// ---------------------
			//          | \
			//          |   \
			//          |     \
			//          |       \
			//          |         +
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

			const strokeWidth = 5;
			let intersections = path.intersection(
				new LineSegment2(Vec2.of(2000, 200), Vec2.of(2000, 400)),
				strokeWidth,
			);
			expect(intersections.length).toBe(0);

			// Test a line that only enters, but does not exit one of the strokes:
			//
			//        * <- Line to test
			//        |
			//   _____|_____________
			//        |
			//        *       Stroke
			//
			//   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾

			intersections = path.intersection(
				new LineSegment2(Vec2.of(-50, 200), Vec2.of(-50, 100)),
				strokeWidth,
			);
			expect(intersections.length).toBe(1);
			expect(intersections[0].point.xy).toMatchObject({
				x: -50,
				y: 105,
			});

			// Changing the order of the end points on the line should not change the result
			intersections = path.intersection(
				new LineSegment2(Vec2.of(-50, 100), Vec2.of(-50, 200)),
				strokeWidth,
			);
			expect(intersections.length).toBe(1);
			expect(intersections[0].point.xy).toMatchObject({
				x: -50,
				y: 105,
			});

			// This line should intersect two of the strokes. Thus, there should be four
			// intersections — one entering and one leaving for each intersection with the
			// centers.
			intersections = path.intersection(
				new LineSegment2(Vec2.of(-50, 200), Vec2.of(-50, -200)),
				strokeWidth,
			);
			expect(intersections.length).toBe(4);

			// Intersections should be in increasing order away from the
			// first point on the line.
			expect(intersections[0].point.xy).toMatchObject({
				x: -50,
				y: 105,
			});
			expect(intersections[1].point.xy).toMatchObject({
				x: -50,
				y: 95,
			});
		});

		it('should correctly report intersections for a simple Bézier curve path', () => {
			const lineStart = Vec2.zero;
			const path = new Path(lineStart, [
				{
					kind: PathCommandType.QuadraticBezierTo,
					controlPoint: Vec2.unitX,
					endPoint: Vec2.unitY,
				},
			]);

			const strokeWidth = 5;

			// Should be no intersections for a line contained entirely within the stroke
			// (including stroke width).
			let intersections = path.intersection(
				new LineSegment2(Vec2.of(-1, 0.5), Vec2.of(2, 0.5)),
				strokeWidth,
			);
			expect(intersections).toHaveLength(0);

			// Should be an intersection when exiting/entering the edge of the stroke
			intersections = path.intersection(
				new LineSegment2(Vec2.of(0, 0.5), Vec2.of(8, 0.5)),
				strokeWidth,
			);
			expect(intersections).toHaveLength(1);
		});

		it('should correctly report intersections near the cap of a line-like Bézier', () => {
			const path = Path.fromString('M0,0Q14,0 27,0');
			expect(
				path.intersection(new LineSegment2(Vec2.of(0, -100), Vec2.of(0, 100)), 10),

				// Should have intersections, despite being at the cap of the Bézier
				// curve.
			).toHaveLength(2);
		});

		it.each([
			[new LineSegment2(Vec2.of(43.5, -12.5), Vec2.of(40.5, 24.5)), 0],
			[new LineSegment2(Vec2.of(35.5, 19.5), Vec2.of(38.5, -17.5)), 0],
		])(
			'should correctly report positive intersections with a line-like Bézier',
			(line, strokeRadius) => {
				const bezier = Path.fromString('M0,0 Q50,0 100,0');
				expect(bezier.intersection(line, strokeRadius).length).toBeGreaterThan(0);
			},
		);

		it('should handle near-vertical lines', () => {
			const intersections = Path.fromString('M0,0 Q50,0 100,0').intersection(
				new LineSegment2(Vec2.of(44, -12), Vec2.of(39, 25)),
			);
			expect(intersections).toHaveLength(1);
		});

		it('should handle single-point strokes', () => {
			const stroke = new Path(Vec2.zero, []);
			expect(
				stroke.intersection(new LineSegment2(Vec2.of(-2, -20), Vec2.of(-2, -1)), 1),
			).toHaveLength(0);
			expect(stroke.intersection(new LineSegment2(Vec2.of(-2, -2), Vec2.of(2, 2)), 1)).toHaveLength(
				2,
			);
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
			expect(path.closedRoughlyIntersects(Rect2.fromCorners(Vec2.zero, Vec2.of(20, 20)))).toBe(
				true,
			);
			expect(path.closedRoughlyIntersects(Rect2.fromCorners(Vec2.zero, Vec2.of(2, 2)))).toBe(true);
			expect(path.closedRoughlyIntersects(new Rect2(10, 1, 1, 1))).toBe(false);
			expect(path.closedRoughlyIntersects(new Rect2(1, 5, 1, 1))).toBe(true);
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
			expect(path.closedRoughlyIntersects(new Rect2(0, 0, 500, 500))).toBe(true);
			expect(path.closedRoughlyIntersects(new Rect2(0, 0, 5, 5))).toBe(true);
			expect(path.closedRoughlyIntersects(new Rect2(-10000, 0, 500, 500))).toBe(false);
		});
	});

	describe('roughlyIntersects', () => {
		it('should consider parts outside bbox of individual parts of a line as not intersecting', () => {
			const path = Path.fromString(`
				M10,10
				L20,20
				L100,21
			`);
			expect(path.roughlyIntersects(new Rect2(0, 0, 50, 50))).toBe(true);
			expect(path.roughlyIntersects(new Rect2(0, 0, 5, 5))).toBe(false);
			expect(path.roughlyIntersects(new Rect2(8, 22, 1, 1))).toBe(false);
			expect(path.roughlyIntersects(new Rect2(21, 11, 1, 1))).toBe(false);
			expect(path.roughlyIntersects(new Rect2(50, 19, 1, 2))).toBe(true);
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

	describe('splitAt', () => {
		it.each([2, 3, 4, 5])('should split a line into %d sections', (numSections) => {
			const path = Path.fromString('m0,0 l1,0');

			const splitIndices: CurveIndexRecord[] = [];
			for (let i = 0; i < numSections; i++) {
				splitIndices.push({ curveIndex: 0, parameterValue: (i + 1) / (numSections + 1) });
			}
			const split = path.splitAt(splitIndices);

			expect(split).toHaveLength(numSections + 1);
			expect(split[numSections].getEndPoint()).objEq(Vec2.unitX);
			for (let i = 0; i < numSections; i++) {
				expect(split[i].geometry).toHaveLength(1);
				const geom = split[i].geometry[0] as LineSegment2;
				expect(geom.p1.y).toBeCloseTo(0);
				expect(geom.p1.x).toBeCloseTo(i / (numSections + 1));
				expect(geom.p2.y).toBeCloseTo(0);
				expect(geom.p2.x).toBeCloseTo((i + 1) / (numSections + 1));
			}
		});

		it('should handle the case where the first division is at the beginning of the path', () => {
			const path = Path.fromString('m0,0 l1,0');
			const beginningSplit = path.splitAt({ curveIndex: 0, parameterValue: 0 });
			expect(beginningSplit).toHaveLength(1);

			const endSplit = path.splitAt({ curveIndex: 0, parameterValue: 1 });
			expect(endSplit).toHaveLength(1);

			expect(beginningSplit[0]).objEq(path);
			expect(beginningSplit[0]).objEq(endSplit[0]);
		});
	});

	describe('splitNear', () => {
		it('should divide a line in half', () => {
			const path = Path.fromString('m0,0l8,0');
			const split = path.splitNear(Vec2.of(4, 0));
			expect(split).toHaveLength(2);
			expect(split[0].toString()).toBe('M0,0L4,0');
			expect(split[1]!.toString()).toBe('M4,0L8,0');
		});

		it('should divide a polyline into parts', () => {
			const path = Path.fromString('m0,0L8,0L8,8');
			const split = path.splitNear(Vec2.of(8, 4));
			expect(split).toHaveLength(2);
			expect(split[0].toString()).toBe('M0,0L8,0L8,4');
			expect(split[1]!.toString()).toBe('M8,4L8,8');
		});

		it('should divide a quadratic Bézier in half', () => {
			const path = Path.fromString('m0,0 Q4,0 8,0');
			const split = path.splitNear(Vec2.of(4, 0));
			expect(split).toHaveLength(2);
			expect(split[0].toString()).toBe('M0,0Q2,0 4,0');
			expect(split[1]!.toString()).toBe('M4,0Q6,0 8,0');
		});

		it('should divide two quadratic Béziers half', () => {
			const path = Path.fromString('m0,0 Q4,0 8,0 Q8,4 8,8');
			const split = path.splitNear(Vec2.of(8, 4));
			expect(split).toHaveLength(2);
			expect(split[0].toString()).toBe('M0,0Q4,0 8,0Q8,2 8,4');
			expect(split[1]!.toString()).toBe('M8,4Q8,6 8,8');
		});

		it.each([
			{
				original: 'm0,0 Q4,0 8,0 Q8,4 8,8',
				near: Vec2.of(8, 4),
				map: (p: Point2) => p.plus(Vec2.of(1, 1)),
				expected: ['M0,0Q4,0 8,0Q9,3 9,5', 'M9,5Q9,7 9,9'],
			},
			{
				original: 'm0,0 L0,10',
				near: Vec2.of(0, 5),
				map: (p: Point2) => p.plus(Vec2.of(100, 0)),
				expected: ['M0,0L100,5', 'M100,5L0,10'],
			},
			{
				// Tested using SVG data similar to:
				//   <path d="m1,1 C1,2 2,10 4,4 C5,0 9,3 7,7" fill="none" stroke="#ff0000"/>
				//   <path d="M2,6C3,6 3,6 4,4C5,0 9,3 7,7" fill="none" stroke="#00ff0080"/>
				// Because of the rounding, the fit path should be slightly off.
				original: 'm1,1 C1,2 2,10 4,4 C5,0 9,3 7,7',
				near: Vec2.of(3, 5),
				map: (p: Point2) => Vec2.of(Math.round(p.x), Math.round(p.y)),
				expected: ['M1,1C1,2 1,6 2,6', 'M2,6C3,6 3,6 4,4C5,0 9,3 7,7'],
			},
		])(
			'should support mapping newly-added points while splitting (case %j)',
			({ original, near, map, expected }) => {
				const path = Path.fromString(original);
				const split = path.splitNear(near, { mapNewPoint: map });
				expect(split.map((p) => p.toString(false))).toMatchObject(expected);
			},
		);
	});

	describe('spliced', () => {
		it.each([
			// should support insertion splicing
			{
				curve: 'm0,0 l2,0',
				from: { i: 0, t: 0.5 },
				to: { i: 0, t: 0.5 },
				insert: 'm1,0 l0,10 z',
				expected: 'M0,0 L1,0 L1,10 L1,0 L2,0',
			},

			// should support removing a segment when splicing
			{
				curve: 'm0,0 l4,0',
				from: { i: 0, t: 0.25 },
				to: { i: 0, t: 0.75 },
				insert: 'M1,0 L1,1 L3,1 L3,0',
				expected: 'M0,0 L1,0 L1,1 L3,1 L3,0 L4,0',
			},

			// should support reverse splicing and reverse `insert` as necessary
			{
				curve: 'M0,0 l4,0',
				from: { i: 0, t: 0.75 },
				to: { i: 0, t: 0.25 },
				insert: 'M1,0 L1,1 L3,1 L3,0',
				expected: 'M1,0 L3,0 L3,1 L1,1 L1,0',
			},
		])(
			'.spliced should support inserting paths inbetween other paths (case %#)',
			({ curve, from, to, insert, expected }) => {
				const originalCurve = Path.fromString(curve);
				expect(
					originalCurve.spliced(
						{ curveIndex: from.i, parameterValue: from.t },
						{ curveIndex: to.i, parameterValue: to.t },
						Path.fromString(insert),
					),
				).objEq(Path.fromString(expected));
			},
		);
	});

	it.each([
		['m0,0 L1,1', 'M1,1 L0,0'],
		['m0,0 L1,1', 'M1,1 L0,0'],
		['M0,0 L1,1 Q2,2 3,3', 'M3,3 Q2,2 1,1 L0,0'],
		['M0,0 L1,1 Q4,2 5,3 C12,13 10,9 8,7', 'M8,7 C 10,9 12,13 5,3 Q 4,2 1,1 L 0,0'],
	])('.reversed should reverse paths', (original, expected) => {
		expect(Path.fromString(original).reversed()).objEq(Path.fromString(expected));
		expect(Path.fromString(expected).reversed()).objEq(Path.fromString(original));
		expect(Path.fromString(original).reversed().reversed()).objEq(Path.fromString(original));
	});

	it.each([
		['m0,0 l1,0', Vec2.of(0, 0), Vec2.of(0, 0)],
		['m0,0 l1,0', Vec2.of(0.5, 0), Vec2.of(0.5, 0)],
		['m0,0 Q1,0 1,2', Vec2.of(1, 0), Vec2.of(0.6236, 0.299)],
	])(
		'.nearestPointTo should return the closest point on a path to the given parameter (case %#)',
		(path, point, expectedClosest) => {
			expect(Path.fromString(path).nearestPointTo(point).point).objEq(expectedClosest, 0.002);
		},
	);

	it.each([
		// Polyline
		['m0,0 l1,0 l0,1', [0, 0.5], Vec2.of(1, 0)],
		['m0,0 l1,0 l0,1', [0, 0.99], Vec2.of(1, 0)],
		['m0,0 l1,0 l0,1', [1, 0], Vec2.of(0, 1)],
		['m0,0 l1,0 l0,1', [1, 0.5], Vec2.of(0, 1)],
		['m0,0 l1,0 l0,1', [1, 1], Vec2.of(0, 1)],

		// Shape with quadratic Bézier curves
		['M0,0 Q1,0 0,1', [0, 0], Vec2.of(1, 0)],
		['M0,0 Q1,1 0,1', [0, 1], Vec2.of(-1, 0)],
		['M0,0 Q1,0 1,1 Q0,1 0,2', [0, 1], Vec2.of(0, 1)],
		['M0,0 Q1,0 1,1 Q0,1 0,2', [1, 1], Vec2.of(0, 1)],
	])(
		'.tangentAt should point in the direction of increasing parameter values, for curve %s at %j',
		(pathString, evalAt, expected) => {
			const at: CurveIndexRecord = { curveIndex: evalAt[0], parameterValue: evalAt[1] };
			const path = Path.fromString(pathString);
			expect(path.tangentAt(at)).objEq(expected);
		},
	);

	it.each([
		// A rectangle completely contained
		['m0,0 l10,0 l0,10 l-10,0', new Rect2(3, 3, 3, 3), true],
		// A rectangle partially contained
		['m0,0 l10,0 l0,10 l-10,0', new Rect2(3, 3, 33, 3), false],
		// A rectangle not contained
		['m0,0 l10,0 l0,10 l-10,0', new Rect2(13, 3, 1, 1), false],
		// More complicated path containing a rectangle
		['M0,0 Q10,15 10,5', new Rect2(5, 5, 1, 1), true],
		['M0,0 Q10,15 10,5', new Rect2(15, 5, 1, 1), false],
	])(
		'.closedContainsRect should return whether a rectangle is contained within a path (case %#: path(%s), rect(%s))',
		(pathString, rect, expected) => {
			expect(Path.fromString(pathString).closedContainsRect(rect)).toBe(expected);
		},
	);
});

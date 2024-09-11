import LineSegment2 from './LineSegment2';
import { Vec2 } from '../Vec2';
import Mat33 from '../Mat33';

describe('Line2', () => {
	it('x and y axes should intersect at (0, 0)', () => {
		const xAxis = new LineSegment2(Vec2.of(-10, 0), Vec2.of(10, 0));
		const yAxis = new LineSegment2(Vec2.of(0, -10), Vec2.of(0, 10));
		expect(xAxis.intersection(yAxis)?.point).objEq(Vec2.zero);
		expect(yAxis.intersection(xAxis)?.point).objEq(Vec2.zero);
	});

	it('y = -2x + 2 and y = 2x - 2 should intersect at (1,0)', () => {
		// y = -4x + 2
		const line1 = new LineSegment2(Vec2.of(0, 2), Vec2.of(1, -2));
		// y = 4x - 2
		const line2 = new LineSegment2(Vec2.of(0, -2), Vec2.of(1, 2));

		expect(line1.intersection(line2)?.point).objEq(Vec2.of(0.5, 0));
		expect(line2.intersection(line1)?.point).objEq(Vec2.of(0.5, 0));
	});

	it('line from (10, 10) to (-100, 10) should intersect with the y-axis at t = 10', () => {
		const line1 = new LineSegment2(Vec2.of(10, 10), Vec2.of(-10, 10));
		// y = 2x - 2
		const line2 = new LineSegment2(Vec2.of(0, -2), Vec2.of(0, 200));

		expect(line1.intersection(line2)?.point).objEq(Vec2.of(0, 10));

		// t=10 implies 10 units along the line from (10, 10) to (-10, 10)
		expect(line1.intersection(line2)?.t).toBe(10);

		// Similarly, t = 12 implies 12 units above (0, -2) in the direction of (0, 200)
		expect(line2.intersection(line1)?.t).toBe(12);
	});

	it('y=2 and y=0 should not intersect', () => {
		const line1 = new LineSegment2(Vec2.of(-10, 2), Vec2.of(10, 2));
		const line2 = new LineSegment2(Vec2.of(-10, 0), Vec2.of(10, 0));
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('x=2 and x=-1 should not intersect', () => {
		const line1 = new LineSegment2(Vec2.of(2, -10), Vec2.of(2, 10));
		const line2 = new LineSegment2(Vec2.of(-1, 10), Vec2.of(-1, -10));
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('Line from (0, 0) to (1, 0) should not intersect line from (1.1, 0) to (2, 0)', () => {
		const line1 = new LineSegment2(Vec2.of(0, 0), Vec2.of(1, 0));
		const line2 = new LineSegment2(Vec2.of(1.1, 0), Vec2.of(2, 0));
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('Line segment from (1, 1) to (3, 1) should have length 2', () => {
		const segment = new LineSegment2(Vec2.of(1, 1), Vec2.of(3, 1));
		expect(segment.length).toBe(2);
	});

	it('(769.612,221.037)->(770.387,224.962) should not intersect (763.359,223.667)->(763.5493, 223.667)', () => {
		// Points taken from issue observed directly in editor
		const p1 = Vec2.of(769.6126045442547, 221.037877485765);
		const p2 = Vec2.of(770.3873954557453, 224.962122514235);
		const p3 = Vec2.of(763.3590010920082, 223.66723995850086);
		const p4 = Vec2.of(763.5494167642871, 223.66723995850086);

		const line1 = new LineSegment2(p1, p2);
		const line2 = new LineSegment2(p3, p4);
		expect(line1.intersection(line2)).toBeNull();
		expect(line2.intersection(line1)).toBeNull();
	});

	it('(9.559000000000001, 11.687)->(9.559, 11.67673) should intersect (9.56069, 11.68077)->(9.55719, 11.68077)', () => {
		// Points taken from an issue observed in the editor.
		const l1 = new LineSegment2(Vec2.of(9.559000000000001, 11.687), Vec2.of(9.559, 11.67673));
		const l2 = new LineSegment2(Vec2.of(9.56069, 11.68077), Vec2.of(9.55719, 11.68077));
		expect(l2.intersects(l1)).toBe(true);
		expect(l1.intersects(l2)).toBe(true);
	});

	it('Closest point to (0,0) on the line x = 1 should be (1,0)', () => {
		const line = new LineSegment2(Vec2.of(1, 100), Vec2.of(1, -100));
		expect(line.closestPointTo(Vec2.zero)).objEq(Vec2.of(1, 0));
	});

	it('Closest point from (-1,-2) to segment((1,1) -> (2,4)) should be (1,1)', () => {
		const line = new LineSegment2(Vec2.of(1, 1), Vec2.of(2, 4));
		expect(line.closestPointTo(Vec2.of(-1, -2))).objEq(Vec2.of(1, 1));
	});

	it('Closest point from (5,8) to segment((1,1) -> (2,4)) should be (2,4)', () => {
		const line = new LineSegment2(Vec2.of(1, 1), Vec2.of(2, 4));
		expect(line.closestPointTo(Vec2.of(5, 8))).objEq(Vec2.of(2, 4));
	});

	it('Should translate when translated by a translation matrix', () => {
		const line = new LineSegment2(Vec2.of(-1, 1), Vec2.of(2, 100));
		expect(line.transformedBy(Mat33.translation(Vec2.of(1, -2)))).toMatchObject({
			p1: Vec2.of(0, -1),
			p2: Vec2.of(3, 98),
		});
	});

	it.each([
		{ from: Vec2.of(0, 0), to: Vec2.of(2, 2) },
		{ from: Vec2.of(100, 0), to: Vec2.of(2, 2) },
	])('should be able to split a line segment between %j', ({ from, to }) => {
		const midpoint = from.lerp(to, 0.5);
		const lineSegment = new LineSegment2(from, to);

		// Halving
		//
		expect(lineSegment.at(0.5)).objEq(midpoint);
		const [firstHalf, secondHalf] = lineSegment.splitAt(0.5);

		if (!secondHalf) {
			throw new Error('Splitting a line segment in half should yield two line segments.');
		}

		expect(firstHalf.p2).objEq(midpoint);
		expect(firstHalf.p1).objEq(from);
		expect(secondHalf.p2).objEq(to);
		expect(secondHalf.p1).objEq(midpoint);

		// Before start/end
		expect(lineSegment.splitAt(0)[0]).objEq(lineSegment);
		expect(lineSegment.splitAt(0)).toHaveLength(1);
		expect(lineSegment.splitAt(1)).toHaveLength(1);
		expect(lineSegment.splitAt(2)).toHaveLength(1);
	});

	it('equivalence check should allow ignoring direction', () => {
		expect(new LineSegment2(Vec2.zero, Vec2.unitX)).objEq(new LineSegment2(Vec2.zero, Vec2.unitX));
		expect(new LineSegment2(Vec2.zero, Vec2.unitX)).objEq(new LineSegment2(Vec2.unitX, Vec2.zero));
		expect(new LineSegment2(Vec2.zero, Vec2.unitX)).not.objEq(
			new LineSegment2(Vec2.unitX, Vec2.zero),
			{ ignoreDirection: false },
		);
	});

	it('should support creating from a collection of points', () => {
		expect(LineSegment2.ofSmallestContainingPoints([])).toBeNull();
		expect(LineSegment2.ofSmallestContainingPoints([Vec2.of(1, 1)])).toBeNull();
		expect(
			LineSegment2.ofSmallestContainingPoints([Vec2.of(1, 1), Vec2.of(1, 2), Vec2.of(3, 3)]),
		).toBeNull();

		expect(LineSegment2.ofSmallestContainingPoints([Vec2.of(1, 1), Vec2.of(1, 2)])).objEq(
			new LineSegment2(Vec2.of(1, 1), Vec2.of(1, 2)),
		);
		expect(
			LineSegment2.ofSmallestContainingPoints([Vec2.of(1, 1), Vec2.of(2, 2), Vec2.of(3, 3)]),
		).objEq(new LineSegment2(Vec2.of(1, 1), Vec2.of(3, 3)));
		expect(
			LineSegment2.ofSmallestContainingPoints([
				Vec2.of(3, 3),
				Vec2.of(2, 2),
				Vec2.of(2.4, 2.4),
				Vec2.of(3, 3),
			]),
		).objEq(new LineSegment2(Vec2.of(2, 2), Vec2.of(3, 3)));
	});
});

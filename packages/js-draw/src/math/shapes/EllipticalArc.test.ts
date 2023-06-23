import { Vec2 } from '../Vec2';
import EllipticalArc from './EllipticalArc';
import LineSegment2 from './LineSegment2';
import Rect2 from './Rect2';

describe('EllipticalArc', () => {
	it('fromStartEnd should produce a line segment if rx = 0 or ry = 0', () => {
		const startPos = Vec2.of(0, 0);
		const endPos = Vec2.of(1, 1);
		let rx = 0;
		let ry = 1;

		const arc1 = EllipticalArc.fromStartEnd(
			startPos, endPos, rx, ry, Math.PI / 2, true, false
		);
		expect(arc1).toBeInstanceOf(LineSegment2);

		rx = 1;
		ry = 0;

		const arc2 = EllipticalArc.fromStartEnd(
			startPos, endPos, rx, ry, Math.PI / 3, true, false
		);
		expect(arc2).toBeInstanceOf(LineSegment2);
	});

	it('fromStartEnd should produce a circle if rx = ry', () => {
		const startPos = Vec2.of(0, 0);
		const endPos = Vec2.of(1, 1);
		const rx = 1;
		const ry = 1;
		const angle = Math.PI / 3;

		const arc1 = EllipticalArc.fromStartEnd(
			startPos, endPos, rx, ry, angle, false, false
		);
		if (!(arc1 instanceof EllipticalArc)) throw new Error('Not an ellipse!');
		expect(arc1.fullEllipse.rx).toBeCloseTo(rx);
		expect(arc1.fullEllipse.ry).toBeCloseTo(ry);
		expect(arc1.fullEllipse.angle).toBeCloseTo(0); // Circles have angle 0
		expect(arc1.fullEllipse.containsPoint(startPos)).toBe(true);
		expect(arc1.fullEllipse.containsPoint(endPos)).toBe(true);

		expect(arc1.getTightBoundingBox().area).toBeGreaterThan(0);

		// TODO: This part doesn't pass yet.
		//expect(arc1.at(arc1.minParam)).objEq(startPos);
		//expect(arc1.at(arc1.maxParam)).objEq(endPos);
		//expect(arc1.containsPoint(startPos)).toBe(true);
		//expect(arc1.containsPoint(endPos)).toBe(true);
	});

	describe('fromStartEnd should be able to create a half circle', () => {
		it('...of radius 1', () => {
			const startPos = Vec2.of(1, 0);
			const endPos = Vec2.of(-1, 0);
			const rx = 1;
			const ry = 1;
			const angle = 0;

			const arc = EllipticalArc.fromStartEnd(
				startPos, endPos, rx, ry, angle, false, false
			);
			if (!(arc instanceof EllipticalArc)) throw new Error('Not an arc!');
			expect(arc.minParam).toBeCloseTo(0);
			expect(arc.maxParam).toBeCloseTo(Math.PI);
			expect(arc.at(arc.minParam)).objEq(startPos);
			expect(arc.at(arc.maxParam)).objEq(endPos);
			expect(arc.at(Math.PI / 2)).objEq(Vec2.of(0, 1));
			expect(arc.containsPoint(arc.at(Math.PI / 2))).toBe(true);
			expect(arc.getTightBoundingBox()).objEq(
				new Rect2(-1, 0, 2, 1)
			);
		});

		it('...of radius 50', () => {
			const startPos = Vec2.of(10, 100);
			const endPos = Vec2.of(110, 100);
			const rx = 50;
			const ry = 50;
			const angle = 0;

			const arc = EllipticalArc.fromStartEnd(
				startPos, endPos, rx, ry, angle, false, true
			);
			if (!(arc instanceof EllipticalArc)) throw new Error('Not an arc!');
			expect(arc.minParam).toBeCloseTo(0);
			expect(arc.maxParam).toBeCloseTo(Math.PI);
			expect(arc.at(arc.minParam)).objEq(endPos); // endPos corresponds to a lesser angle
			expect(arc.at(arc.maxParam)).objEq(startPos); // startPos corresponds to a greater
			expect(arc.at(Math.PI / 2)).objEq(Vec2.of((110 + 10) / 2, 150));
			expect(arc.containsPoint(arc.at(Math.PI / 2))).toBe(true);
			expect(arc.getTightBoundingBox()).objEq(
				new Rect2(10, 100, 100, 50)
			);
		});
	});
});
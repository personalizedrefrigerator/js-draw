import Mat33 from './Mat33';
import { Point2, Vec2 } from './Vec2';
import Vec3 from './Vec3';

describe('Mat33 tests', () => {
	it('equality', () => {
		expect(Mat33.identity).objEq(Mat33.identity);
		expect(new Mat33(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, -0.9)).objEq(
			new Mat33(0.2, 0.1, 0.4, 0.5, 0.5, 0.7, 0.7, 0.8, -0.9),
			0.2,
		);
	});

	it('transposition', () => {
		expect(Mat33.identity.transposed()).objEq(Mat33.identity);
		expect(new Mat33(1, 2, 0, 0, 0, 0, 0, 1, 0).transposed()).objEq(
			new Mat33(1, 0, 0, 2, 0, 1, 0, 0, 0),
		);
	});

	it('multiplication', () => {
		const M = new Mat33(1, 2, 3, 4, 5, 6, 7, 8, 9);

		expect(Mat33.identity.rightMul(Mat33.identity)).objEq(Mat33.identity);
		expect(M.rightMul(Mat33.identity)).objEq(M);
		expect(M.rightMul(new Mat33(1, 0, 0, 0, 2, 0, 0, 0, 1))).objEq(
			new Mat33(1, 4, 3, 4, 10, 6, 7, 16, 9),
		);
		expect(M.rightMul(new Mat33(2, 0, 1, 0, 1, 0, 0, 0, 3))).objEq(
			new Mat33(2, 2, 10, 8, 5, 22, 14, 8, 34),
		);
	});

	it('the inverse of the identity matrix should be the identity matrix', () => {
		const fuzz = 0.01;
		expect(Mat33.identity.inverse()).objEq(Mat33.identity, fuzz);

		const M = new Mat33(1, 2, 3, 4, 1, 0, 2, 3, 0);
		expect(M.inverse().rightMul(M)).objEq(Mat33.identity, fuzz);
	});

	it('90 degree z-rotation matrices should rotate 90 degrees counter clockwise', () => {
		const fuzz = 0.001;

		const M = Mat33.zRotation(Math.PI / 2);
		const rotated = M.transformVec2(Vec2.unitX);
		expect(rotated).objEq(Vec2.unitY, fuzz);
		expect(M.transformVec2(rotated)).objEq(Vec2.unitX.times(-1), fuzz);
	});

	it('z-rotation matrices should preserve the given origin', () => {
		const testPairs: Array<[number, Vec2]> = [
			[Math.PI / 2, Vec2.zero],
			[-Math.PI / 2, Vec2.zero],
			[-Math.PI / 2, Vec2.of(10, 10)],
		];

		for (const [angle, center] of testPairs) {
			expect(Mat33.zRotation(angle, center).transformVec2(center)).objEq(center);
		}
	});

	it('translation matrices should translate Vec2s', () => {
		const fuzz = 0.01;

		const M = Mat33.translation(Vec2.of(1, -4));
		expect(M.transformVec2(Vec2.of(0, 0))).objEq(Vec2.of(1, -4), fuzz);
		expect(M.transformVec2(Vec2.of(-1, 3))).objEq(Vec2.of(0, -1), fuzz);
	});

	it('scaling matrices should scale about the provided center', () => {
		const fuzz = 0.01;

		const center = Vec2.of(1, -4);
		const M = Mat33.scaling2D(2, center);
		expect(M.transformVec2(center)).objEq(center, fuzz);
		expect(M.transformVec2(Vec2.of(0, 0))).objEq(Vec2.of(-1, 4), fuzz);
	});

	it('calling inverse on singular matrices should result in the identity matrix', () => {
		const fuzz = 0.001;
		const singularMat = Mat33.ofRows(Vec3.of(0, 0, 1), Vec3.of(0, 1, 0), Vec3.of(0, 1, 1));
		expect(singularMat.invertable()).toBe(false);
		expect(singularMat.inverse()).objEq(Mat33.identity, fuzz);
	});

	it('z-rotation matrices should be invertable', () => {
		const fuzz = 0.01;
		const M = Mat33.zRotation(-0.2617993877991494, Vec2.of(481, 329.5));
		expect(M.inverse().transformVec2(M.transformVec2(Vec2.unitX))).objEq(Vec2.unitX, fuzz);
		expect(M.invertable());

		const starterTransform = new Mat33(
			-0.2588190451025205,
			-0.9659258262890688,
			923.7645204565603,
			0.9659258262890688,
			-0.2588190451025205,
			-49.829447083761465,
			0,
			0,
			1,
		);
		expect(starterTransform.invertable()).toBe(true);

		const fullTransform = starterTransform.rightMul(M);
		const fullTransformInverse = fullTransform.inverse();
		expect(fullTransform.invertable()).toBe(true);

		expect(fullTransformInverse.rightMul(fullTransform)).objEq(Mat33.identity, fuzz);

		expect(fullTransform.transformVec2(fullTransformInverse.transformVec2(Vec2.unitX))).objEq(
			Vec2.unitX,
			fuzz,
		);

		expect(fullTransformInverse.transformVec2(fullTransform.transformVec2(Vec2.unitX))).objEq(
			Vec2.unitX,
			fuzz,
		);
	});

	it('z-rotation matrix inverses should undo the z-rotation', () => {
		const testCases: Array<[number, Point2]> = [
			[Math.PI / 2, Vec2.zero],
			[Math.PI, Vec2.of(1, 1)],
			[-Math.PI, Vec2.of(1, 1)],
			[-Math.PI * 2, Vec2.of(1, 1)],
			[-Math.PI * 2, Vec2.of(123, 456)],
			[-Math.PI / 4, Vec2.of(123, 456)],
			[0.1, Vec2.of(1, 2)],
		];

		const fuzz = 0.00001;
		for (const [angle, center] of testCases) {
			const mat = Mat33.zRotation(angle, center);
			expect(mat.inverse().rightMul(mat)).objEq(Mat33.identity, fuzz);
			expect(mat.rightMul(mat.inverse())).objEq(Mat33.identity, fuzz);
		}
	});

	it('z-rotation should preserve given origin', () => {
		const testCases: Array<[number, Point2]> = [
			[6.205048847547065, Vec2.of(75.16363373235318, 104.29870408043762)],
			[1.234, Vec2.of(-56, 789)],
			[-Math.PI, Vec2.of(-56, 789)],
			[-Math.PI / 2, Vec2.of(-0.001, 1.0002)],
		];

		for (const [angle, rotationOrigin] of testCases) {
			expect(Mat33.zRotation(angle, rotationOrigin).transformVec2(rotationOrigin)).objEq(
				rotationOrigin,
			);
		}
	});

	it('should correctly apply a mapping to all components', () => {
		expect(
			new Mat33(1, 2, 3, 4, 5, 6, 7, 8, 9).mapEntries((component) => component - 1),
		).toMatchObject(new Mat33(0, 1, 2, 3, 4, 5, 6, 7, 8));
	});

	it('getColumn should return the given column index', () => {
		expect(Mat33.identity.getColumn(0)).objEq(Vec3.unitX);
		expect(Mat33.identity.getColumn(1)).objEq(Vec3.of(0, 1, 0));

		// scaling2D only scales the x/y components of vectors it transforms
		expect(Mat33.scaling2D(2).getColumn(2)).objEq(Vec3.of(0, 0, 1));
	});
});

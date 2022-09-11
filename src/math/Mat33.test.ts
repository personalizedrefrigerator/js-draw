import Mat33 from './Mat33';
import { Vec2 } from './Vec2';
import { loadExpectExtensions } from '../testing/loadExpectExtensions';
import Vec3 from './Vec3';

loadExpectExtensions();

describe('Mat33 tests', () => {
	it('equality', () => {
		expect(Mat33.identity).objEq(Mat33.identity);
		expect(new Mat33(
			0.1, 0.2, 0.3,
			0.4, 0.5, 0.6,
			0.7, 0.8, -0.9
		)).objEq(new Mat33(
			0.2, 0.1, 0.4,
			0.5, 0.5, 0.7,
			0.7, 0.8, -0.9
		), 0.2);
	});

	it('transposition', () => {
		expect(Mat33.identity.transposed()).objEq(Mat33.identity);
		expect(new Mat33(
			1, 2, 0,
			0, 0, 0,
			0, 1, 0
		).transposed()).objEq(new Mat33(
			1, 0, 0,
			2, 0, 1,
			0, 0, 0
		));
	});

	it('multiplication', () => {
		const M = new Mat33(
			1, 2, 3,
			4, 5, 6,
			7, 8, 9
		);

		expect(Mat33.identity.rightMul(Mat33.identity)).objEq(Mat33.identity);
		expect(M.rightMul(Mat33.identity)).objEq(M);
		expect(M.rightMul(new Mat33(
			1, 0, 0,
			0, 2, 0,
			0, 0, 1
		))).objEq(new Mat33(
			1, 4, 3,
			4, 10, 6,
			7, 16, 9
		));
		expect(M.rightMul(new Mat33(
			2, 0, 1,
			0, 1, 0,
			0, 0, 3
		))).objEq(new Mat33(
			2, 2, 10,
			8, 5, 22,
			14, 8, 34
		));
	});

	it('the inverse of the identity matrix should be the identity matrix', () => {
		const fuzz = 0.01;
		expect(Mat33.identity.inverse()).objEq(Mat33.identity, fuzz);

		const M = new Mat33(
			1, 2, 3,
			4, 1, 0,
			2, 3, 0
		);
		expect(M.inverse().rightMul(M)).objEq(Mat33.identity, fuzz);
	});

	it('90 degree z-rotation matricies should rotate 90 degrees counter clockwise', () => {
		const fuzz = 0.01;

		const M = Mat33.zRotation(Math.PI / 2);
		const rotated = M.transformVec2(Vec2.unitX);
		expect(rotated).objEq(Vec2.unitY, fuzz);
		expect(M.transformVec2(rotated)).objEq(Vec2.unitX.times(-1), fuzz);
	});

	it('translation matricies should translate Vec2s', () => {
		const fuzz = 0.01;

		const M = Mat33.translation(Vec2.of(1, -4));
		expect(M.transformVec2(Vec2.of(0, 0))).objEq(Vec2.of(1, -4), fuzz);
		expect(M.transformVec2(Vec2.of(-1, 3))).objEq(Vec2.of(0, -1), fuzz);
	});

	it('scaling matricies should scale about the provided center', () => {
		const fuzz = 0.01;

		const center = Vec2.of(1, -4);
		const M = Mat33.scaling2D(2, center);
		expect(M.transformVec2(center)).objEq(center, fuzz);
		expect(M.transformVec2(Vec2.of(0, 0))).objEq(Vec2.of(-1, 4), fuzz);
	});

	it('calling inverse on singular matricies should result in the identity matrix', () => {
		const fuzz = 0.001;
		const singularMat = Mat33.ofRows(
			Vec3.of(0, 0, 1),
			Vec3.of(0, 1, 0),
			Vec3.of(0, 1, 1)
		);
		expect(singularMat.invertable()).toBe(false);
		expect(singularMat.inverse()).objEq(Mat33.identity, fuzz);
	});

	it('z-rotation matricies should be invertable', () => {
		const fuzz = 0.01;
		const M = Mat33.zRotation(-0.2617993877991494, Vec2.of(481, 329.5));
		expect(
			M.inverse().transformVec2(M.transformVec2(Vec2.unitX))
		).objEq(Vec2.unitX, fuzz);
		expect(M.invertable());

		const starterTransform = new Mat33(
			-0.2588190451025205, -0.9659258262890688, 923.7645204565603,
			0.9659258262890688, -0.2588190451025205, -49.829447083761465,
			0, 0, 1
		);
		expect(starterTransform.invertable()).toBe(true);

		const fullTransform = starterTransform.rightMul(M);
		const fullTransformInverse = fullTransform.inverse();
		expect(fullTransform.invertable()).toBe(true);

		expect(
			fullTransformInverse.rightMul(fullTransform)
		).objEq(Mat33.identity, fuzz);

		expect(
			fullTransform.transformVec2(fullTransformInverse.transformVec2(Vec2.unitX))
		).objEq(Vec2.unitX, fuzz);

		expect(
			fullTransformInverse.transformVec2(fullTransform.transformVec2(Vec2.unitX))
		).objEq(Vec2.unitX, fuzz);
	});

	it('should convert CSS matrix(...) strings to matricies', () => {
		// From MDN:
		// 		⎡ a c e ⎤
		// 		⎢ b d f ⎥  =  matrix(a,b,c,d,e,f)
		// 		⎣ 0 0 1 ⎦
		const identity = Mat33.fromCSSMatrix('matrix(1, 0, 0, 1, 0, 0)');
		expect(identity).objEq(Mat33.identity);
		expect(Mat33.fromCSSMatrix('matrix(1, 2, 3, 4, 5, 6)')).objEq(new Mat33(
			1, 3, 5,
			2, 4, 6,
			0, 0, 1,
		));
		expect(Mat33.fromCSSMatrix('matrix(1e2, 2, 3, 4, 5, 6)')).objEq(new Mat33(
			1e2, 3, 5,
			2, 4, 6,
			0, 0, 1,
		));
		expect(Mat33.fromCSSMatrix('matrix(1.6, 2, .3, 4, 5, 6)')).objEq(new Mat33(
			1.6, .3, 5,
			2, 4, 6,
			0, 0, 1,
		));
		expect(Mat33.fromCSSMatrix('matrix(-1, 2, 3.E-2, 4, -5.123, -6.5)')).objEq(new Mat33(
			-1, 0.03, -5.123,
			2, 4, -6.5,
			0, 0, 1,
		));
		expect(Mat33.fromCSSMatrix('matrix(1.6,\n\t2, .3, 4, 5, 6)')).objEq(new Mat33(
			1.6, .3, 5,
			2, 4, 6,
			0, 0, 1,
		));
		expect(Mat33.fromCSSMatrix('matrix(1.6,2, .3E-2, 4, 5, 6)')).objEq(new Mat33(
			1.6, 3e-3, 5,
			2, 4, 6,
			0, 0, 1,
		));
		expect(Mat33.fromCSSMatrix('matrix(-1, 2e6,	3E-2,-5.123, -6.5e-1, 0.01)')).objEq(new Mat33(
			-1, 	3E-2,  	-6.5e-1,
			2e6,	-5.123,	0.01,
			0,  	0,     	1,
		));
	});
});

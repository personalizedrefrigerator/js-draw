import Mat33 from './Mat33';
import { Vec2 } from './Vec2';

describe('Mat33.fromCSSMatrix', () => {
	it('should convert CSS matrix(...) strings to matrices', () => {
		// From MDN:
		// 		⎡ a c e ⎤
		// 		⎢ b d f ⎥  =  matrix(a,b,c,d,e,f)
		// 		⎣ 0 0 1 ⎦
		const identity = Mat33.fromCSSMatrix('matrix(1, 0, 0, 1, 0, 0)');
		expect(identity).objEq(Mat33.identity);
		expect(Mat33.fromCSSMatrix('matrix(1, 2, 3, 4, 5, 6)')).objEq(
			new Mat33(1, 3, 5, 2, 4, 6, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(1e2, 2, 3, 4, 5, 6)')).objEq(
			new Mat33(1e2, 3, 5, 2, 4, 6, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(1.6, 2, .3, 4, 5, 6)')).objEq(
			new Mat33(1.6, 0.3, 5, 2, 4, 6, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(-1, 2, 3.E-2, 4, -5.123, -6.5)')).objEq(
			new Mat33(-1, 0.03, -5.123, 2, 4, -6.5, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(1.6,\n\t2, .3, 4, 5, 6)')).objEq(
			new Mat33(1.6, 0.3, 5, 2, 4, 6, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(1.6,2, .3E-2, 4, 5, 6)')).objEq(
			new Mat33(1.6, 3e-3, 5, 2, 4, 6, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(-1, 2e6,	3E-2,-5.123, -6.5e-1, 0.01)')).objEq(
			new Mat33(-1, 3e-2, -6.5e-1, 2e6, -5.123, 0.01, 0, 0, 1),
		);
		expect(Mat33.fromCSSMatrix('matrix(-1,\t2e6,3E-2,-5.123,  -6.5e-1,\n0.01\n)')).objEq(
			new Mat33(-1, 3e-2, -6.5e-1, 2e6, -5.123, 0.01, 0, 0, 1),
		);
	});

	it('should convert multi-matrix arguments into a single CSS matrix', () => {
		const identity = Mat33.fromCSSMatrix('matrix(1, 0, 0, 1, 0, 0) matrix(1, 0, 0, 1, 0, 0)');
		expect(identity).objEq(Mat33.identity);

		expect(
			Mat33.fromCSSMatrix(
				'matrix(1, 0, 0, 1, 0, 0) matrix(1, 2, 3, 4, 5, 6) matrix(1, 0, 0, 1, 0, 0)',
			),
		).objEq(new Mat33(1, 3, 5, 2, 4, 6, 0, 0, 1));

		expect(
			Mat33.fromCSSMatrix(
				'matrix(2,\n\t 0, 0, 2, 0, 0) matrix(1, 2, 3, 4, 5, 6) matrix(1, 0, 0, 1, 0, 0)',
			),
		).objEq(new Mat33(2, 6, 10, 4, 8, 12, 0, 0, 1));
	});

	it('should convert scale()s with a single argument', () => {
		expect(Mat33.fromCSSMatrix('scale(1)')).objEq(Mat33.identity);
		expect(Mat33.fromCSSMatrix('scale(0.4)')).objEq(Mat33.scaling2D(0.4));
		expect(Mat33.fromCSSMatrix('scale(-0.4 )')).objEq(Mat33.scaling2D(-0.4));
		expect(Mat33.fromCSSMatrix('scale(100%)')).objEq(Mat33.identity);
		expect(Mat33.fromCSSMatrix('scale(20e2%)')).objEq(Mat33.scaling2D(20));
		expect(Mat33.fromCSSMatrix('scale(200%) scale(50%)')).objEq(Mat33.identity);
	});

	it('should convert scale()s with two arguments', () => {
		expect(Mat33.fromCSSMatrix('scale(1\t 1)')).objEq(Mat33.identity);
		expect(Mat33.fromCSSMatrix('scale(1\t 2)')).objEq(Mat33.scaling2D(Vec2.of(1, 2)));
		expect(Mat33.fromCSSMatrix('scale(1\t 2) scale(1)')).objEq(Mat33.scaling2D(Vec2.of(1, 2)));
	});

	it('should convert translate()s', () => {
		expect(Mat33.fromCSSMatrix('translate(0)')).objEq(Mat33.identity);
		expect(Mat33.fromCSSMatrix('translate(1, 1)')).objEq(Mat33.translation(Vec2.of(1, 1)));
		expect(Mat33.fromCSSMatrix('translate(1 200%)')).objEq(Mat33.translation(Vec2.of(1, 2)));
	});

	it('should support px following numbers', () => {
		expect(Mat33.fromCSSMatrix('translate(1px, 2px)')).objEq(Mat33.translation(Vec2.of(1, 2)));
	});
});

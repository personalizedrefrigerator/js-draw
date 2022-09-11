import Path, { PathCommandType } from './Path';
import { Vec2 } from './Vec2';


describe('Path.toString', () => {
	it('a single-point path should produce a move-to command', () => {
		const path = new Path(Vec2.of(0, 0), []);
		expect(path.toString()).toBe('M0,0');
	});

	it('should convert lineTo commands to L SVG commands', () => {
		const path = new Path(Vec2.of(0.1, 0.2), [
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(0.3, 0.4),
			},
		]);
		expect(path.toString()).toBe('M0.1,0.2L0.3,0.4');
	});

	it('should fix rounding errors', () => {
		const path = new Path(Vec2.of(0.100000001, 0.199999999), [
			{
				kind: PathCommandType.QuadraticBezierTo,
				controlPoint: Vec2.of(9999, -10.999999995),
				endPoint: Vec2.of(0.000300001, 1.400000002),
			},
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(184.00482359999998, 1)
			}
		]);
		expect(path.toString()).toBe('M0.1,0.2q9998.9-11.2 -0.0997,1.2L184.0048236,1');
	});

	it('should not remove trailing zeroes before decimal points', () => {
		const path = new Path(Vec2.of(1000, 2_000_000), [
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(30.0001, 40.000000001),
			},
		]);
		expect(path.toString()).toBe('M1000,2000000L30.0001,40');
	});

	it('should use relative commands when shorter', () => {
		const path1 = Path.fromString('M100,100 L101,101 Q102,102 90.000000001,89.99999999 Z');
		expect(path1.toString()).toBe([
			'M100,100', 'l1,1', 'q1,1 -11-11', 'l10,10'
		].join(''));

		const path2 = Path.fromString('M297.2,197.5 L292.2,196.1 Q292.8,198.3 291.3,196');
		expect(path2.toString()).toBe([
			'M297.2,197.5', 'l-5-1.4', 'q0.6,2.2 -0.9-0.1'
		].join(''));
	});
});

import Path, { PathCommandType } from './Path';
import { Vec2 } from '../Vec2';

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
		expect(path.toString()).toBe('M.1,.2L.3,.4');
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
				point: Vec2.of(184.00482359999998, 1),
			},
		]);

		expect(path.toString()).toBe('M.1,.2Q9999,-11 .0003,1.4L184.0048236,1');
	});

	it('should not remove trailing zeroes before decimal points', () => {
		const path = new Path(Vec2.of(1000, 2_000_000), [
			{
				kind: PathCommandType.LineTo,
				point: Vec2.of(30.00000001, 40.000000001),
			},
		]);

		expect(path.toString()).toBe('M1000,2000000l-970-1999960');
	});

	it('deserialized path should serialize to the same/similar path, but with rounded components', () => {
		const path1 = Path.fromString('M100,100 L101,101 Q102,102 90.000000001,89.99999999 Z');
		const ignoreCache = true;

		expect(path1.toString(undefined, ignoreCache)).toBe(
			['M100,100', 'l1,1', 'q1,1 -11-11', 'l10,10'].join(''),
		);
	});

	it('should not lose precision when saving', () => {
		const pathStr =
			'M184.2,52.3l-.2-.2q-2.7,2.4 -3.2,3.5q-2.8,7 -.9,6.1q4.3-2.6 4.8-6.1q1.2-8.8 .4-8.3q-4.2,5.2 -3.9,3.9q.2-1.6 .3-2.1q.2-1.3 -.2-1q-3.8,6.5 -3.2,3.3q.6-4.1 1.1-5.3q4.1-10 3.3-8.3q-5.3,13.1 -6.6,14.1q-3.3,2.8 -1.8-1.5q2.8-9.7 2.7-8.4q0,.3 0,.4q-1.4,7.1 -2.7,8.5q-2.6,3.2 -2.5,2.9q-.3-1.9 -.7-1.9q-4.1,4.4 -2.9,1.9q1.1-3 .3-2.6q-1.8,2 -2.5,2.4q-4.5,2.8 -4.2,1.9q.3-1.6 .2-1.4q1.5,2.2 1.3,2.9q-.8,3.9 -.5,3.3q.8-7.6 2.5-13.3q2.6-9.2 2.9-6.9q.3,1.4 .3,1.2q-.7-.4 -.9,0q-2.2,11.6 -7.6,13.6q-3.9,1.6 -2.1-1.3q3-5.5 2.6-3.4q-.2,1.8 -.5,1.8q-3.2,.5 -4.1,1.2q-2.6,2.6 -1.9,2.5q4.7-4.4 3.7-5.5q-1.1-.9 -1.6-.6q-7.2,7.5 -3.9,6.5q.3-.1 .4-.4q.6-5.3 -.2-4.9q-2.8,2.3 -3.1,2.4q-3.7,1.5 -3.5,.5q.3-3.6 1.4-3.3q3.5,.7 1.9,2.4q-1.7,2.3 -1.6,.8q0-3.5 -.9-3.1q-5.1,3.3 -4.9,2.8q.1-4 -.8-3.5q-4.3,3.4 -4.6,2.5q-1-2.1 .5-8.7l-.2,0q-1.6,6.6 -.7,8.9q.7,1.2 5.2-2.3q.4-.5 .2,3.1q.1,1 5.5-2.4q.4-.4 .3,2.7q.1,2 2.4-.4q1.7-2.3 -2.1-3.2q-1.7-.3 -2,3.7q0,1.4 4.1-.1q.3-.1 3.1-2.4q.3-.5 -.4,4.5q0-.1 -.2,0q-2.6,1.2 4.5-5.7q0-.2 .8,.6q.9,.6 -3.7,4.7q-.5,1 2.7-1.7q.6-.7 3.7-1.2q.7-.2 .9-2.2q.1-2.7 -3.4,3.2q-1.8,3.4 2.7,1.9q5.6-2.1 7.8-14q-.1,.1 .3,.4q.6,.1 .3-1.6q-.7-2.8 -3.7,6.7q-1.8,5.8 -2.5,13.5q.1,1.1 1.3-3.1q.2-1 -1.3-3.3q-.5-.5 -1,1.6q-.1,1.3 4.8-1.5q1-1 3-2q.1-.4 -1.1,2q-1.1,3.1 3.7-1.3q-.4,0 -.1,1.5q.3,.8 3.3-2.5q1.3-1.6 2.7-8.9q0-.1 0-.4q-.3-1.9 -3.5,8.2q-1.3,4.9 2.4,2.1q1.4-1.2 6.6-14.3q.8-2.4 -3.9,7.9q-.6,1.3 -1.1,5.5q-.3,3.7 4-3.1q-.2,0 -.6,.6q-.2,.6 -.3,2.3q0,1.8 4.7-3.5q.1-.5 -1.2,7.9q-.5,3.2 -4.6,5.7q-1.3,1 1.5-5.5q.4-1.1 3.01-3.5';

		const path1 = Path.fromString(pathStr);
		const ignoreCache = true;
		const path = Path.fromString(path1.toString(true, ignoreCache));
		path1['cachedStringVersion'] = null; // Clear the cache manually

		expect(path.toString(true)).toBe(path1.toString(true));
	});

	it('should remove no-op move-tos', () => {
		const path1 = Path.fromString('M50,75m0,0q0,12.5 0,50q0,6.3 25,0');
		path1['cachedStringVersion'] = null;
		const path2 = Path.fromString('M150,175M150,175q0,12.5 0,50q0,6.3 25,0');
		path2['cachedStringVersion'] = null;

		expect(path1.toString()).toBe('M50,75q0,12.5 0,50q0,6.3 25,0');
		expect(path2.toString()).toBe('M150,175q0,12.5 0,50q0,6.3 25,0');
	});
});

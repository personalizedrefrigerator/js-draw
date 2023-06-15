import Color4 from './Color4';
import Vec3 from './math/Vec3';

describe('Color4', () => {
	it('should convert to #RRGGBB-format hex strings (when no alpha)', () => {
		expect(Color4.black.toHexString()).toBe('#000000');
		expect(Color4.fromHex('#f0f').toHexString()).toBe('#f000f0');
	});

	it('should create #RRGGBBAA-format hex strings when there is an alpha component', () => {
		expect(Color4.ofRGBA(1, 1, 1, 0.5).toHexString()).toBe('#ffffff80');
	});

	it('should parse rgb and rgba-format strings', () => {
		expect(Color4.fromString('rgb(0, 0, 0)')).objEq(Color4.black);
		expect(Color4.fromString('rgb ( 255, 0,\t 0)')).objEq(Color4.ofRGBA(1, 0, 0, 1));
		expect(Color4.fromString('rgba ( 255, 0,\t 0, 0.5)')).objEq(Color4.ofRGBA(1, 0, 0, 0.5));
		expect(Color4.fromString('rgba( 0, 0, 128, 0)')).objEq(Color4.ofRGBA(0, 0, 128/255, 0));
	});

	it('should mix blue and red to get dark purple', () => {
		expect(Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 0, 1), 0.5)).objEq(Color4.ofRGB(0.5, 0, 0.5));
		expect(Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 0, 1), 0.1)).objEq(Color4.ofRGB(0.9, 0, 0.1));
	});

	it('should mix red and green to get yellow', () => {
		expect(Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 1, 0), 0.3)).objEq(
			Color4.ofRGB(0.7, 0.3, 0)
		);
	});

	it('should mix red with nothing and get red', () => {
		expect(Color4.average([ Color4.red ])).objEq(Color4.red);
	});

	it('different colors should be different', () => {
		expect(Color4.red.eq(Color4.red)).toBe(true);
		expect(Color4.red.eq(Color4.green)).toBe(false);
		expect(Color4.fromString('#ff000000').eq(Color4.transparent)).toBe(true);
	});

	it('should correctly convert to hsv', () => {
		expect(Color4.red.asHSV()).objEq(Vec3.of(0, 1, 1));
		expect(Color4.ofRGB(0.5, 0.5, 0.5).asHSV()).objEq(Vec3.of(0, 0, 0.5));
		expect(Color4.ofRGB(0.5, 0.25, 0.5).asHSV()).objEq(Vec3.of(Math.PI * 5 / 3, 0.5, 0.5), 0.1);
	});
});
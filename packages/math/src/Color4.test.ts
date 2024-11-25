import Color4 from './Color4';
import Vec3 from './Vec3';

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
		expect(Color4.fromString('rgba( 0, 0, 128, 0)')).objEq(Color4.ofRGBA(0, 0, 128 / 255, 0));
	});

	it('should parse transparent/none as completely transparent', () => {
		expect(Color4.fromString('none')).toBe(Color4.transparent);
		expect(Color4.fromString('transparent')).toBe(Color4.transparent);
	});

	it('should mix blue and red to get dark purple', () => {
		expect(Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 0, 1), 0.5)).objEq(Color4.ofRGB(0.5, 0, 0.5));
		expect(Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 0, 1), 0.1)).objEq(Color4.ofRGB(0.9, 0, 0.1));
	});

	it('should mix red and green to get yellow', () => {
		expect(Color4.ofRGB(1, 0, 0).mix(Color4.ofRGB(0, 1, 0), 0.3)).objEq(Color4.ofRGB(0.7, 0.3, 0));
	});

	it('should mix red with nothing and get red', () => {
		expect(Color4.average([Color4.red])).objEq(Color4.red);
	});

	it('different colors should be different', () => {
		expect(Color4.red.eq(Color4.red)).toBe(true);
		expect(Color4.red.eq(Color4.green)).toBe(false);
		expect(Color4.fromString('#ff000000').eq(Color4.transparent)).toBe(true);
	});

	it('should correctly convert to hsv', () => {
		expect(Color4.red.asHSV()).objEq(Vec3.of(0, 1, 1));
		expect(Color4.ofRGB(0.5, 0.5, 0.5).asHSV()).objEq(Vec3.of(0, 0, 0.5));
		expect(Color4.ofRGB(0.5, 0.25, 0.5).asHSV()).objEq(Vec3.of((Math.PI * 5) / 3, 0.5, 0.5), 0.1);
	});

	it('fromHSV(color.asHSV) should return the original color', () => {
		const testColors = [Color4.red, Color4.green, Color4.blue, Color4.white, Color4.black];

		const testWithColor = (color: Color4) => {
			expect(Color4.fromHSV(...color.asHSV().asArray())).objEq(color);
		};

		for (const color of testColors) {
			testWithColor(color);
		}

		for (let i = 0; i <= 6; i++) {
			testWithColor(Color4.fromHSV((i * Math.PI) / 7, 0.5, 0.5));
			testWithColor(Color4.fromHSV((i * Math.PI) / 6, 0.5, 0.5));
		}
	});

	it('.rgb should return a 3-component vector', () => {
		expect(Color4.red.rgb).objEq(Vec3.of(1, 0, 0));
		expect(Color4.green.rgb).objEq(Vec3.of(0, 1, 0));
		expect(Color4.blue.rgb).objEq(Vec3.of(0, 0, 1));
	});

	it('should return correct contrast ratios', () => {
		// Expected values from https://webaim.org/resources/contrastchecker/
		const testCases: [Color4, Color4, number][] = [
			[Color4.white, Color4.black, 21],
			[Color4.fromHex('#FF0000'), Color4.black, 5.25],
			[Color4.fromHex('#FF0000'), Color4.fromHex('#0000FF'), 2.14],
			[Color4.fromHex('#300000'), Color4.fromHex('#003000'), 1.26],
			[Color4.fromHex('#300000'), Color4.fromHex('#003000'), 1.26],
			[Color4.fromHex('#D60000'), Color4.fromHex('#003000'), 2.71],
		];

		for (const [colorA, colorB, expectedContrast] of testCases) {
			expect(Color4.contrastRatio(colorA, colorB)).toBeCloseTo(expectedContrast, 1);
		}
	});

	it('should support creating colors from an RGBA array', () => {
		expect(Color4.fromRGBArray([255, 0, 0])).objEq(Color4.ofRGB(1, 0, 0));
		expect(Color4.fromRGBArray([255, 0, 0, 128])).objEq(Color4.ofRGBA(1, 0, 0, 0.5));
	});
});

import Color4 from './Color4';

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
});
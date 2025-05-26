import AbstractComponent from './AbstractComponent';
import UnknownSVGObject from './UnknownSVGObject';

describe('UnknownSVGObject', () => {
	it('should not be deserializable', () => {
		const obj = new UnknownSVGObject(
			document.createElementNS('http://www.w3.org/2000/svg', 'circle'),
		);
		const serialized = obj.serialize();
		expect(() => AbstractComponent.deserialize(serialized)).toThrow(/.*cannot be deserialized.*/);
	});
});

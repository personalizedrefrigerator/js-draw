import KeyBinding from './KeyBinding';

describe('KeyBinding', ()  => {
	it('toString should produce keybinds that can be interpreted by fromString', () => {
		const testStrings = [
			'c',
			'Shift+c',
			'Ctrl+Shift+a',
			'Ctrl+c',
			'control',
			'shift',
			'meta',
			'Ctrl+Alt+delete',
			'leftarrow',
			'CtrlOrMeta+z',
			'á',
			'-',
			'+',
		];

		for (const str of testStrings) {
			expect(KeyBinding.fromString(str).toString()).toBe(str);
		}
	});

	it('ctrlOrMeta should match events with either ctrl or meta (or both) modifiers', () => {
		const ctrlOrMetaA = KeyBinding.fromString('CtrlOrMeta-a');
		const ctrlA = KeyBinding.fromString('ctrl-a');
		const metaA = KeyBinding.fromString('meta-a');
		const ctrlOrMetaShiftB = KeyBinding.fromString('CtrlOrMeta-Shift-b');
		const shiftB = KeyBinding.fromString('Shift-b');

		expect(ctrlOrMetaA.matchesEvent(ctrlA)).toBe(true);
		expect(ctrlOrMetaA.matchesEvent(metaA)).toBe(true);
		expect(ctrlOrMetaA.matchesEvent(ctrlOrMetaShiftB)).toBe(false);
		expect(
			ctrlOrMetaShiftB.matchesEvent({
				key: 'b', shiftKey: true, metaKey: true
			}),
		).toBe(true);
		expect(ctrlOrMetaShiftB.matchesEvent(shiftB)).toBe(false);
	});
});

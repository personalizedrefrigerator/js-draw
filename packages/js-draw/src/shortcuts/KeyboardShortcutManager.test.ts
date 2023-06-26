import { undoKeyboardShortcutId } from '../tools/keybindings';
import KeyBinding from './KeyBinding';
import KeyboardShortcutManager from './KeyboardShortcutManager';

describe('KeyboardShortcutManager', () => {
	it('should contain default shortcuts for undo', () => {
		const defaultUndoShortcutKeybinds =
				KeyboardShortcutManager.getShortcutDefaultKeybindings(undoKeyboardShortcutId);
		expect(defaultUndoShortcutKeybinds.length).toBeGreaterThanOrEqual(1);
		expect(defaultUndoShortcutKeybinds.some(shortcut => {
			return shortcut.key === 'z' && shortcut.controlOrMeta;
		})).toBe(true);
	});

	it('should be possible to override keyboard shortcuts', () => {
		const testNewId = 'someIdThatDoesNowExist';
		KeyboardShortcutManager.registerDefaultKeyboardShortcut(
			testNewId,
			[ KeyBinding.fromString('ctrl-1'), KeyBinding.fromString('-') ],
			'Some description'
		);

		const shortcutManager = new KeyboardShortcutManager({
			someIdThatDoesNotExist: [
				KeyBinding.fromString('ctrl-shift-a'),
				KeyBinding.fromString('ctrl-a'),
			],
		});

		// Should work before overriding
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('ctrl-1'))
		).toBe(true);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('-'))
		).toBe(true);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('ctrl-b'))
		).toBe(false);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('ctrl-0'))
		).toBe(false);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('1'))
		).toBe(false);

		shortcutManager.overrideShortcut(testNewId, [
			KeyBinding.fromString('ctrl-b'),
		]);


		// Should work after overriding
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('ctrl-1'))
		).toBe(false);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('-'))
		).toBe(false);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('ctrl-b'))
		).toBe(true);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('ctrl-0'))
		).toBe(false);
		expect(
			shortcutManager.matchesShortcut(testNewId, KeyBinding.fromString('1'))
		).toBe(false);
	});

	it('should provide localized descriptions of keyboard shortcuts', () => {
		const testNewId = 'someIdThatDoesNowExist--testingLocalization';
		const defaultDescription = 'Some description 1';
		KeyboardShortcutManager.registerDefaultKeyboardShortcut(
			testNewId,
			[ KeyBinding.fromString('ctrl-1'), KeyBinding.fromString('-') ],
			defaultDescription
		);

		expect(KeyboardShortcutManager.getShortcutDescription(testNewId)).toBe(defaultDescription);
		expect(
			KeyboardShortcutManager.getShortcutDescription(testNewId, ['fakeLocale'])
		).toBe(defaultDescription);

		const spanishDescription = 'Alguna descripción';
		KeyboardShortcutManager.provideShortcutDescription(
			testNewId,
			'es',
			spanishDescription
		);

		expect(
			KeyboardShortcutManager.getShortcutDescription(testNewId, ['es', 'en'])
		).toBe(spanishDescription);
	});
});

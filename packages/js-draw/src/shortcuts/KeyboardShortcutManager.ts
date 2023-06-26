import { matchingLocalizationTable } from '../localizations/getLocalizationTable';
import KeyBinding, { KeyCombination } from './KeyBinding';

type ShortcutDictionary = Record<string, KeyBinding[]>;

// Maps from shortcut IDs to a description of each.
type ShortcutDescriptionDictionary = Record<string, string>;

/**
 * Allows adding/changing keyboard shortcuts. This class provides static methods for registering
 * default shortcuts. An instance of this class must be used to access or change keyboard shortcuts.
 */
export default class KeyboardShortcutManager {
	private static shortcuts: ShortcutDictionary = Object.create(null);
	private static shortcutDefaultDescriptions: ShortcutDescriptionDictionary
		= Object.create(null);
	private static shortcutLocalizedDescriptions: Record<string, ShortcutDescriptionDictionary>
		= Object.create(null);

	private shortcutOverrides: ShortcutDictionary = Object.create(null);

	/**
	 * Creates a new `ShortcutManager` with an initial set of shortcut overrides.
	 *
	 * @internal
	 */
	public constructor(initialOverrides: ShortcutDictionary) {
		for (const id in initialOverrides) {
			this.overrideShortcut(id, initialOverrides[id]);
		}
	}

	/**
	 * Override an existing shortcut with a custom set of triggers.
	 * @internal
	 */
	public overrideShortcut(shortcutId: string, overrideWith: KeyBinding[]) {
		this.shortcutOverrides[shortcutId] = [ ...overrideWith ];
	}

	/** Returns true if `keyEvent` matches the shortcut with `shortcutId`. @internal */
	public matchesShortcut(shortcutId: string, keyEvent: Partial<KeyCombination>) {
		// Get all shortcucts associated with `shortcutId`.
		let shortcutList = this.shortcutOverrides[shortcutId];

		if (!shortcutList) {
			if (shortcutId in KeyboardShortcutManager.shortcuts) {
				shortcutList = KeyboardShortcutManager.shortcuts[shortcutId];
			} else {
				throw new Error(`No shortcut with ID ${shortcutId} exists!`);
			}
		}

		// return true if keyEvent matches *any* shortcuts in shortcutList
		for (const shortcut of shortcutList) {
			if (shortcut.matchesEvent(keyEvent)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Registers a default keyboard shortcut that can be overridden by individual instances
	 * of `ShortcutManager`. Note that `id` should be a globally unique identifier.
	 *
	 * Only the first call to this method for a given `id` has an effect.
	 *
	 * @example
	 * ```ts
	 * const shortcutId = 'io.github.personalizedrefrigerator.js-draw.select-all';
	 *
	 * // Associate two shortcuts with the same ID
	 * const shortcut1 = KeyboardShortcutManager.keyboardShortcutFromString('ctrlOrMeta+a');
	 * const shortcut2 = KeyboardShortcutManager.keyboardShortcutFromString('ctrlOrMeta+shift+a');
	 * KeyboardShortcutManager.registerDefaultKeyboardShortcut(
	 * 	shortcutId,
	 * 	[ shortcut1, shortcut2 ],
	 * 	"Select All",
	 * );
	 *
	 * // Provide a localized description
	 * KeyboardShortcutManager.provideShortcutDescription(
	 * 	shotcutId,
	 * 	'es',
	 * 	'Seleccionar todo',
	 * );
	 * ```
	 *
	 * @internal
	 */
	public static registerDefaultKeyboardShortcut(
		id: string,
		shortcuts: (KeyBinding|string)[],
		defaultDescription: string,
	): boolean {
		if (id in KeyboardShortcutManager.shortcuts) {
			return false;
		}

		// Convert the strings to shortcut maps.
		const shortcutsAsShortcuts = shortcuts.map(shortcut => {
			if (typeof (shortcut) === 'string') {
				return KeyBinding.fromString(shortcut);
			}
			return shortcut;
		});

		KeyboardShortcutManager.shortcuts[id] = [ ...shortcutsAsShortcuts ];
		KeyboardShortcutManager.shortcutDefaultDescriptions[id] = defaultDescription;
		return true;
	}

	/** Provides a localized description of a keyboard shortcut. @internal */
	public static provideShortcutDescription(id: string, locale: string, description: string) {
		if (!(locale in KeyboardShortcutManager.shortcutLocalizedDescriptions)) {
			KeyboardShortcutManager.shortcutLocalizedDescriptions[locale] = Object.create(null);
		}

		KeyboardShortcutManager.shortcutLocalizedDescriptions[locale][id] = description;
	}

	/**
	 * Gets all registered keyboard shortcut IDs.
	 *
	 * @see {@link getShortcutDescription}
	 */
	public static allShortcutIds() {
		const ids = [];
		for (const id in this.shortcuts) {
			ids.push(id);
		}
		return ids;
	}

	/**
	 * Get the default keybindings associated with a keyboard shortcut.
	 *
	 * Any keybinding in the resultant list, by default, can trigger the function associated
	 * with the shortcut.
	 */
	public static getShortcutDefaultKeybindings(shortcutId: string): KeyBinding[] {
		if (!(shortcutId in KeyboardShortcutManager.shortcuts)) {
			throw new Error(`No shortcut with ID ${shortcutId} exists!`);
		}

		return KeyboardShortcutManager.shortcuts[shortcutId];
	}

	/**
	 * Get a description of a keyboard shortcut.
	 *
	 * `localeList`, if given, attempts to
	 */
	public static getShortcutDescription(id: string, localeList?: string[]): string|null {
		const localizationTable = matchingLocalizationTable(
			localeList ?? [], this.shortcutLocalizedDescriptions, this.shortcutDefaultDescriptions
		);

		return localizationTable[id] ?? this.shortcutDefaultDescriptions[id] ?? null;
	}
}

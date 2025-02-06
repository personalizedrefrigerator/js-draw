import AbstractComponent from '../components/AbstractComponent';
import describeComponentList from '../components/util/describeComponentList';
import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import { assertIsStringArray } from '../util/assertions';
import Erase from './Erase';
import SerializableCommand from './SerializableCommand';

/**
 * A command that duplicates the {@link AbstractComponent}s it's given. This command
 * is the reverse of an {@link Erase} command.
 *
 * @example
 * ```ts
 * // Given some editor...
 *
 * // Find all elements intersecting the rectangle with top left (0,0) and
 * // (width,height)=(100,100).
 * const elems = editor.image.getElementsIntersectingRegion(
 * 	new Rect2(0, 0, 100, 100)
 * );
 *
 * // Create a command that, when applied, will duplicate the elements.
 * const duplicateElems = new Duplicate(elems);
 *
 * // Apply the command (and make it undoable)
 * editor.dispatch(duplicateElems);
 * ```
 *
 * @see {@link Editor.dispatch} {@link EditorImage.getElementsIntersectingRegion}
 */
export default class Duplicate extends SerializableCommand {
	private duplicates: AbstractComponent[];
	private reverse: Erase;

	public constructor(
		private toDuplicate: AbstractComponent[],

		// @internal -- IDs given to the duplicate elements
		idsForDuplicates?: string[],
	) {
		super('duplicate');

		this.duplicates = toDuplicate.map((elem, idx) => {
			// For collaborative editing, it's important for the clones to have
			// the same IDs as the originals
			if (idsForDuplicates && idsForDuplicates[idx]) {
				return elem.cloneWithId(idsForDuplicates[idx]);
			} else {
				return elem.clone();
			}
		});
		this.reverse = new Erase(this.duplicates);
	}

	public apply(editor: Editor): void {
		this.reverse.unapply(editor);
	}

	public unapply(editor: Editor): void {
		this.reverse.apply(editor);
	}

	public override onDrop(editor: Editor): void {
		this.reverse.onDrop(editor);
	}

	public description(_editor: Editor, localizationTable: EditorLocalization): string {
		if (this.duplicates.length === 0) {
			return localizationTable.duplicatedNoElements;
		}

		return localizationTable.duplicateAction(
			describeComponentList(localizationTable, this.duplicates) ?? localizationTable.elements,
			this.duplicates.length,
		);
	}

	protected serializeToJSON() {
		return {
			originalIds: this.toDuplicate.map((elem) => elem.getId()),
			cloneIds: this.duplicates.map((elem) => elem.getId()),
		};
	}

	static {
		SerializableCommand.register('duplicate', (json: any, editor: Editor) => {
			let originalIds;
			let cloneIds;
			// Compatibility with older editors
			if (Array.isArray(json)) {
				originalIds = json;
				cloneIds = [];
			} else {
				originalIds = json.originalIds;
				cloneIds = json.cloneIds;
			}
			assertIsStringArray(originalIds);
			assertIsStringArray(cloneIds);

			// Resolve to elements -- only keep the elements that can be found in the image.
			const resolvedElements = [];
			const filteredCloneIds = [];
			for (let i = 0; i < originalIds.length; i++) {
				const originalId = originalIds[i];
				const foundElement = editor.image.lookupElement(originalId);
				if (!foundElement) {
					console.warn('Duplicate command: Could not find element with ID', originalId);
				} else {
					filteredCloneIds.push(cloneIds[i]);
					resolvedElements.push(foundElement);
				}
			}

			return new Duplicate(resolvedElements, filteredCloneIds);
		});
	}
}

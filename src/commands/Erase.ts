import AbstractComponent from '../components/AbstractComponent';
import describeComponentList from '../components/util/describeComponentList';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import { EditorLocalization } from '../localization';
import SerializableCommand from './SerializableCommand';

export default class Erase extends SerializableCommand {
	private toRemove: AbstractComponent[];
	private applied: boolean;

	public constructor(toRemove: AbstractComponent[]) {
		super('erase');

		// Clone the list
		this.toRemove = toRemove.map(elem => elem);
		this.applied = false;
	}

	public apply(editor: Editor) {
		for (const part of this.toRemove) {
			const parent = editor.image.findParent(part);

			if (parent) {
				parent.remove();
			}
		}

		this.applied = true;
		editor.queueRerender();
	}

	public unapply(editor: Editor) {
		for (const part of this.toRemove) {
			if (!editor.image.findParent(part)) {
				EditorImage.addElement(part).apply(editor);
			}
		}

		this.applied = false;
		editor.queueRerender();
	}

	public override onDrop(editor: Editor) {
		if (this.applied) {
			for (const part of this.toRemove) {
				editor.image.onDestroyElement(part);
			}
		}
	}

	public description(_editor: Editor, localizationTable: EditorLocalization): string {
		if (this.toRemove.length === 0) {
			return localizationTable.erasedNoElements;
		}

		const description = describeComponentList(localizationTable, this.toRemove) ?? localizationTable.elements;
		return localizationTable.eraseAction(description, this.toRemove.length);
	}

	protected serializeToJSON() {
		const elemIds = this.toRemove.map(elem => elem.getId());
		return elemIds;
	}

	static {
		SerializableCommand.register('erase', (json: any, editor) => {
			const elems = json
				.map((elemId: string) => editor.image.lookupElement(elemId))
				.filter((elem: AbstractComponent|null) => elem !== null);
			return new Erase(elems);
		});
	}
}

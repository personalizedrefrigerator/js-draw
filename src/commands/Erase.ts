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

	public onDrop(editor: Editor) {
		if (this.applied) {
			for (const part of this.toRemove) {
				editor.image.onDestroyElement(part);
			}
		}
	}

	public description(localizationTable: EditorLocalization): string {
		if (this.toRemove.length === 0) {
			return localizationTable.erasedNoElements;
		}

		const description = describeComponentList(localizationTable, this.toRemove) ?? localizationTable.elements;
		return localizationTable.eraseAction(description, this.toRemove.length);
	}

	protected serializeToString() {
		const elemIds = this.toRemove.map(elem => elem.getId());
		return JSON.stringify(elemIds);
	}

	static {
		SerializableCommand.register('erase', (data: string, editor: Editor) => {
			const json = JSON.parse(data);
			const elems = json.map((elemId: string) => editor.image.lookupElement(elemId));
			return new Erase(elems);
		});
	}
}

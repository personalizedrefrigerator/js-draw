import AbstractComponent from '../components/AbstractComponent';
import describeComponentList from '../components/util/describeComponentList';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import { EditorLocalization } from '../localization';
import Command from './Command';

export default class Erase extends Command {
	private toRemove: AbstractComponent[];

	public constructor(toRemove: AbstractComponent[]) {
		super();

		// Clone the list
		this.toRemove = toRemove.map(elem => elem);
	}

	public apply(editor: Editor): void {
		for (const part of this.toRemove) {
			const parent = editor.image.findParent(part);

			if (parent) {
				parent.remove();
			}
		}

		editor.queueRerender();
	}

	public unapply(editor: Editor): void {
		for (const part of this.toRemove) {
			if (!editor.image.findParent(part)) {
				new EditorImage.AddElementCommand(part).apply(editor);
			}
		}

		editor.queueRerender();
	}

	public description(localizationTable: EditorLocalization): string {
		if (this.toRemove.length === 0) {
			return localizationTable.erasedNoElements;
		}

		const description = describeComponentList(localizationTable, this.toRemove) ?? localizationTable.elements;
		return localizationTable.eraseAction(description, this.toRemove.length);
	}
}

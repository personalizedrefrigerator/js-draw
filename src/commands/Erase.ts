import AbstractComponent from '../components/AbstractComponent';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import Command from './Command';

export default class Erase implements Command {
	private toRemove: AbstractComponent[];

	public constructor(toRemove: AbstractComponent[]) {
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
}

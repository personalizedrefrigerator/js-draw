import AbstractComponent from '../components/AbstractComponent';
import describeComponentList from '../components/util/describeComponentList';
import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import Erase from './Erase';
import SerializableCommand from './SerializableCommand';

export default class Duplicate extends SerializableCommand {
	private duplicates: AbstractComponent[];
	private reverse: Erase;

	public constructor(private toDuplicate: AbstractComponent[]) {
		super('duplicate');

		this.duplicates = toDuplicate.map(elem => elem.clone());
		this.reverse = new Erase(this.duplicates);
	}

	public apply(editor: Editor): void {
		this.reverse.unapply(editor);
	}

	public unapply(editor: Editor): void {
		this.reverse.apply(editor);
	}

	public description(_editor: Editor, localizationTable: EditorLocalization): string {
		if (this.duplicates.length === 0) {
			return localizationTable.duplicatedNoElements;
		}

		return localizationTable.duplicateAction(
			describeComponentList(localizationTable, this.duplicates) ?? localizationTable.elements,
			this.duplicates.length
		);
	}

	protected serializeToJSON() {
		return this.toDuplicate.map(elem => elem.getId());
	}

	static {
		SerializableCommand.register('duplicate', (json: any, editor: Editor) => {
			const elems = json.map((id: string) => editor.image.lookupElement(id));
			return new Duplicate(elems);
		});
	}
}

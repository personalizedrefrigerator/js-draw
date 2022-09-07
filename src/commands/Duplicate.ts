import AbstractComponent from '../components/AbstractComponent';
import describeComponentList from '../components/util/describeComponentList';
import Editor from '../Editor';
import { EditorLocalization } from '../localization';
import Command from './Command';
import Erase from './Erase';

export default class Duplicate implements Command {
	private duplicates: AbstractComponent[];
	private reverse: Erase;

	public constructor(toDuplicate: AbstractComponent[]) {
		this.duplicates = toDuplicate.map(elem => elem.clone());
		this.reverse = new Erase(this.duplicates);
	}

	public apply(editor: Editor): void {
		this.reverse.unapply(editor);
	}

	public unapply(editor: Editor): void {
		this.reverse.apply(editor);
	}

	public description(localizationTable: EditorLocalization): string {
		if (this.duplicates.length === 0) {
			return localizationTable.duplicatedNoElements;
		}

		return localizationTable.duplicateAction(
			describeComponentList(localizationTable, this.duplicates) ?? localizationTable.elements,
			this.duplicates.length
		);
	}
}

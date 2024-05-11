import Editor from '../Editor';
import { EditorLocalization } from '../localization';

export abstract class Command {
	public abstract apply(editor: Editor): Promise<void> | void;
	public abstract unapply(editor: Editor): Promise<void> | void;

	// Called when the command is being deleted
	public onDrop(_editor: Editor) {}

	public abstract description(editor: Editor, localizationTable: EditorLocalization): string;

	/** @deprecated Use {@link uniteCommands} */
	public static union(a: Command, b: Command): Command {
		return new (class extends Command {
			public apply(editor: Editor) {
				a.apply(editor);
				b.apply(editor);
			}

			public unapply(editor: Editor) {
				b.unapply(editor);
				a.unapply(editor);
			}

			public description(editor: Editor, localizationTable: EditorLocalization) {
				const aDescription = a.description(editor, localizationTable);
				const bDescription = b.description(editor, localizationTable);

				if (aDescription === bDescription) {
					return aDescription;
				}

				return `${aDescription}, ${bDescription}`;
			}
		})();
	}

	public static readonly empty = new (class extends Command {
		public description(_editor: Editor, _localizationTable: EditorLocalization) {
			return '';
		}
		public apply(_editor: Editor) {}
		public unapply(_editor: Editor) {}
	})();
}

export default Command;

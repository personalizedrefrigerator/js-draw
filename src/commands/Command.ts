import Editor from '../Editor';
import { EditorLocalization } from '../localization';

interface Command {
	apply(editor: Editor): void;
	unapply(editor: Editor): void;

	description(localizationTable: EditorLocalization): string;
}

// eslint-disable-next-line no-redeclare
namespace Command {
	export const empty = {
		apply(_editor: Editor) { },
		unapply(_editor: Editor) { },
	};

	export const union = (a: Command, b: Command): Command => {
		return {
			apply(editor: Editor) {
				a.apply(editor);
				b.apply(editor);
			},
			unapply(editor: Editor) {
				b.unapply(editor);
				a.unapply(editor);
			},

			description(localizationTable: EditorLocalization) {
				const aDescription = a.description(localizationTable);
				const bDescription = b.description(localizationTable);

				if (aDescription === bDescription) {
					return aDescription;
				}

				return `${aDescription}, ${bDescription}`;
			},
		};
	};
}

export default Command;

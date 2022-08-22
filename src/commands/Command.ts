import Editor from '../Editor';


interface Command {
	apply(editor: Editor): void;
	unapply(editor: Editor): void;
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
		};
	};
}

export default Command;

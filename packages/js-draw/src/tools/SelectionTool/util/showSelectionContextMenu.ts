import { Point2 } from '@js-draw/math';
import Editor from '../../../Editor';
import Selection from '../Selection';
import createMenuOverlay from '../../util/createMenuOverlay';
import ClipboardHandler from '../../../util/ClipboardHandler';

const showSelectionContextMenu = async (
	selectionBox: Selection|null,
	editor: Editor,
	canvasAnchor: Point2,
	preferSelectionMenu: boolean,
	clearSelection: ()=>void,
) => {
	const localization = editor.localization;
	const showSelectionMenu = selectionBox?.getSelectedItemCount() && preferSelectionMenu;

	const noSelectionMenu = [{
		text: localization.selectionMenu__paste,
		icon: () => editor.icons.makePasteIcon(),
		key: async () => {
			const clipboardHandler = new ClipboardHandler(editor);
			await clipboardHandler.paste();
		},
	}];

	const onActivated = await createMenuOverlay(editor, canvasAnchor, showSelectionMenu ? [{
		text: localization.selectionMenu__duplicate,
		icon: () => editor.icons.makeDuplicateSelectionIcon(),
		key: async () => {
			await editor.dispatch(await selectionBox!.duplicateSelectedObjects());
		},
	}, {
		text: localization.selectionMenu__delete,
		icon: () => editor.icons.makeDeleteSelectionIcon(),
		key: async () => {
			await editor.dispatch(selectionBox!.deleteSelectedObjects());
			clearSelection();
		},
	}, {
		text: localization.selectionMenu__copyToClipboard,
		icon: () => editor.icons.makeCopyIcon(),
		key: async () => {
			const clipboardHandler = new ClipboardHandler(editor);
			await clipboardHandler.copy();
		},
	}, ...noSelectionMenu ] : noSelectionMenu);
	onActivated?.();
};

export default showSelectionContextMenu;
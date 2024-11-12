/**
 * # `@js-draw/material-icons`
 *
 * Provides a material icon theme for `js-draw`.
 *
 * @example
 * ```ts,runnable
 * import { Editor, makeEdgeToolbar } from 'js-draw';
 * import { MaterialIconProvider } from '@js-draw/material-icons';
 *
 * // Apply js-draw CSS
 * import 'js-draw/styles';
 *
 * const editor = new Editor(document.body, {
 *   iconProvider: new MaterialIconProvider(),
 * });
 *
 * // Ensure that there is enough room for the toolbar
 * editor.getRootElement().style.minHeight = '500px';
 *
 * // Add a toolbar
 * const toolbar = makeEdgeToolbar(editor);
 *
 * // ...with the default elements
 * toolbar.addDefaults();
 * ```
 *
 * @see
 * {@link MaterialIconProvider}
 *
 * @packageDocumentation
 */

import { IconProvider, IconElemType, TextRenderingStyle, PenStyle, EraserMode } from 'js-draw';

import README from './icons/README.md';
import ExpandMore from './icons/ExpandMore.svg';
import Undo from './icons/Undo.svg';
import Redo from './icons/Redo.svg';
import InkEraser from './icons/InkEraser.svg';
import InkEraserOff from './icons/InkEraserOff.svg';
import PanTool from './icons/PanTool.svg';
import TouchApp from './icons/TouchApp.svg';
import ScreenLockRotation from './icons/ScreenLockRotation.svg';
import Imagesmode from './icons/Imagesmode.svg';
import Title from './icons/Title.svg';
import Resize from './icons/Resize.svg';
import Delete from './icons/Delete.svg';
import ContentCopy from './icons/ContentCopy.svg';
import EditDocument from './icons/EditDocument.svg';
import Check from './icons/Check.svg';
import InkHighlighter from './icons/InkHighlighter.svg';
import Edit from './icons/Edit.svg';
import CloudUpload from './icons/CloudUpload.svg';
import RotateLeft from './icons/RotateLeft.svg';
import Select from './icons/Select.svg';
import Close from './icons/Close.svg';
import Shapes from './icons/Shapes.svg';
import Draw from './icons/Draw.svg';
import InkPen from './icons/InkPen.svg';
import ContentPaste from './icons/ContentPaste.svg';
import { OpaqueIconType } from './types';

/**
 * Converts an icon to an HTML element.
 *
 * This function accepts an "opaque" type to avoid unsafely creating icon DOM elements
 * from untrusted strings.
 */
const icon = (data: OpaqueIconType) => {
	const icon = document.createElement('div');
	// eslint-disable-next-line no-unsanitized/property -- data must not be user-provided (enforced with a custom type).
	icon.innerHTML = data as unknown as string;
	return icon.childNodes[0] as SVGElement;
};

/**
 * An {@link IconProvider} that uses [material icons](https://github.com/google/material-design-icons).
 */
class MaterialIconProvider extends IconProvider {
	public override makeUndoIcon(): IconElemType {
		return icon(Undo);
	}
	public override makeRedoIcon(): IconElemType {
		return icon(Redo);
	}
	public override makeDropdownIcon(): IconElemType {
		return icon(ExpandMore);
	}
	public override makeEraserIcon(_eraserSize?: number, mode?: EraserMode): IconElemType {
		return icon(mode === EraserMode.PartialStroke ? InkEraserOff : InkEraser);
	}
	public override makeSelectionIcon(): IconElemType {
		return icon(Select);
	}
	public override makeRotateIcon(): IconElemType {
		return icon(RotateLeft);
	}
	public override makeHandToolIcon(): IconElemType {
		return icon(PanTool);
	}
	public override makeTouchPanningIcon(): IconElemType {
		return icon(TouchApp);
	}
	// makeAllDevicePanningIcon(): IconElemType;
	// makeZoomIcon(): IconElemType;
	public override makeRotationLockIcon(): IconElemType {
		return icon(ScreenLockRotation);
	}
	public override makeInsertImageIcon(): IconElemType {
		return icon(Imagesmode);
	}
	public override makeUploadFileIcon(): IconElemType {
		return icon(CloudUpload);
	}
	public override makeTextIcon(_textStyle: TextRenderingStyle): IconElemType {
		return icon(Title);
	}
	public override makePenIcon(style: PenStyle): IconElemType {
		let baseIcon = this.isRoundedTipPen(style) ? Edit : InkHighlighter;
		if (this.isPolylinePen(style)) {
			baseIcon = InkPen;
		}
		const svg = icon(baseIcon);

		svg.setAttribute('viewBox', '0 -880 960 1000');

		const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		line.setAttribute(
			'd',
			`
			M110,-25 L850,-25
		`,
		);
		line.style.stroke = style.color.toHexString();
		line.style.strokeWidth = `${Math.sqrt(style.thickness) * 20}`;

		if (!this.isRoundedTipPen(style)) {
			line.style.strokeLinecap = 'square';
		} else {
			line.style.strokeLinecap = 'round';
		}

		svg.insertAdjacentElement('afterbegin', line);

		// Add a grid background to make transparency visible
		if (style.color.a < 1) {
			const checkerboard = this.makeCheckerboardPattern();
			const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
			defs.appendChild(checkerboard.patternDefElement);
			svg.appendChild(defs);

			const lineBackground = line.cloneNode() as SVGPathElement;
			lineBackground.style.stroke = checkerboard.patternRef;

			svg.insertAdjacentElement('afterbegin', lineBackground);
		}

		return svg;
	}
	// makeIconFromFactory(pen: Pen, factory: ComponentBuilderFactory, includeTransparencyGrid?: boolean): IconElemType;
	// makePipetteIcon(color?: Color4): IconElemType;
	// makeFormatSelectionIcon(): IconElemType;
	public override makeShapeAutocorrectIcon(): IconElemType {
		return icon(Shapes);
	}
	public override makeStrokeSmoothingIcon(): IconElemType {
		return icon(Draw);
	}
	public override makeResizeImageToSelectionIcon(): IconElemType {
		return icon(Resize);
	}
	public override makeDuplicateSelectionIcon(): IconElemType {
		return icon(ContentCopy);
	}
	public override makeCopyIcon(): IconElemType {
		return icon(ContentCopy);
	}
	public override makePasteIcon(): IconElemType {
		return icon(ContentPaste);
	}
	public override makeDeleteSelectionIcon(): IconElemType {
		return icon(Delete);
	}
	public override makeCloseIcon(): IconElemType {
		return icon(Close);
	}
	public override makeSaveIcon(): IconElemType {
		return icon(Check);
	}
	public override makeConfigureDocumentIcon(): IconElemType {
		return icon(EditDocument);
	}
	// makeOverflowIcon(): IconElemType;

	public override licenseInfo() {
		return README;
	}
}

export { MaterialIconProvider };
export default MaterialIconProvider;

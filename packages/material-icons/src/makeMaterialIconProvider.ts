import {
	IconProvider,
	IconElemType,
	TextRenderingStyle,
	PenStyle,
	EraserMode,
	SelectionMode,
} from 'js-draw';

import README from './icons/README';
import ExpandMore from './icons/ExpandMore';
import Undo from './icons/Undo';
import Redo from './icons/Redo';
import InkEraser from './icons/InkEraser';
import InkEraserOff from './icons/InkEraserOff';
import PanTool from './icons/PanTool';
import TouchApp from './icons/TouchApp';
import ScreenLockRotation from './icons/ScreenLockRotation';
import Imagesmode from './icons/Imagesmode';
import Title from './icons/Title';
import Resize from './icons/Resize';
import Delete from './icons/Delete';
import ContentCopy from './icons/ContentCopy';
import EditDocument from './icons/EditDocument';
import Check from './icons/Check';
import InkHighlighter from './icons/InkHighlighter';
import Edit from './icons/Edit';
import CloudUpload from './icons/CloudUpload';
import RotateLeft from './icons/RotateLeft';
import Select from './icons/Select';
import Close from './icons/Close';
import Shapes from './icons/Shapes';
import Draw from './icons/Draw';
import InkPen from './icons/InkPen';
import ContentPaste from './icons/ContentPaste';
import { OpaqueIconType } from './types';
import LassoSelect from './icons/LassoSelect';

/**
 * Parts of the js-draw library required by this package.
 *
 * **Note**: Additional properties may be added to this type between
 * minor js-draw releases. It is recommended that you either:
 * - Provide the entire js-draw library to {@link makeMaterialIconProviderClass}.
 * - Use the {@link MaterialIconProvider} exported by this package.
 */
export type JsDrawSlice = {
	IconProvider: typeof IconProvider;
	EraserMode: typeof EraserMode;
	SelectionMode: typeof SelectionMode;
};

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
 * Creates a `MaterialIconProvider` class bound to a particular instance of the `js-draw`
 * library.
 *
 * **Example**:
 * ```ts,runnable
 * import * as jsdraw from 'js-draw';
 * import { makeMaterialIconProviderClass } from '@js-draw/material-icons';
 * const MaterialIconProvider = makeMaterialIconProviderClass(jsdraw);
 *
 * (new jsdraw.Editor(
 *     document.body, { iconProvider: new MaterialIconProvider() },
 * )).addToolbar();
 * ```
 *
 * If you only have one instance of `js-draw` (which is almost always the case), prefer
 * `new` {@link MaterialIconProvider}.
 *
 * @returns an uninstantiated subclass of {@link js-draw!IconProvider | IconProvider}.
 */
const makeMaterialIconProviderClass = ({
	IconProvider,
	EraserMode,
}: JsDrawSlice): typeof IconProvider =>
	class extends IconProvider {
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
		public override makeSelectionIcon(mode: SelectionMode): IconElemType {
			return icon(mode === SelectionMode.Lasso ? LassoSelect : Select);
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
	};

export default makeMaterialIconProviderClass;

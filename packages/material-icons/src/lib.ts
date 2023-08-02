
import { IconProvider, IconElemType, TextRenderingStyle } from 'js-draw';

import README from './icons/README.md';
import ExpandMore from './icons/ExpandMore.svg';
import Undo from './icons/Undo.svg';
import Redo from './icons/Redo.svg';
import InkEraser from './icons/InkEraser.svg';
import ArrowSelectorTool from './icons/ArrowSelectorTool.svg';
import PanTool from './icons/PanTool.svg';
import TouchApp from './icons/TouchApp.svg';
import ScreenLockRotation from './icons/ScreenLockRotation.svg';
import Imagesmode from './icons/Imagesmode.svg';
import Title from './icons/Title.svg';
import Resize from './icons/Resize.svg';
import Delete from './icons/Delete.svg';
import ContentCopy from './icons/ContentCopy.svg';


const icon = (data: string) => {
	const icon = document.createElement('div');
	icon.innerHTML = data;
	return icon.childNodes[0] as SVGElement;
};

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
	public override makeEraserIcon(_eraserSize?: number): IconElemType {
		return icon(InkEraser);
	}
	public override makeSelectionIcon(): IconElemType {
		return icon(ArrowSelectorTool);
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
	public override makeTextIcon(_textStyle: TextRenderingStyle): IconElemType {
		return icon(Title);
	}
	// makePenIcon(strokeSize: number, color: string | Color4, rounded?: boolean): IconElemType;
	// makeIconFromFactory(pen: Pen, factory: ComponentBuilderFactory, includeTransparencyGrid?: boolean): IconElemType;
	// makePipetteIcon(color?: Color4): IconElemType;
	// makeFormatSelectionIcon(): IconElemType;
	public override makeResizeImageToSelectionIcon(): IconElemType {
		return icon(Resize);
	}
	public override makeDuplicateSelectionIcon(): IconElemType {
		return icon(ContentCopy);
	}
	public override makeDeleteSelectionIcon(): IconElemType {
		return icon(Delete);
	}
	// makeSaveIcon(): IconElemType;
	// makeConfigureDocumentIcon(): IconElemType;
	// makeOverflowIcon(): IconElemType;

	public override licenseInfo() {
		return README;
	}
}

export { MaterialIconProvider };
export default MaterialIconProvider;
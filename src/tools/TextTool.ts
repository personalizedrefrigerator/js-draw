import Color4 from '../Color4';
import Text, { TextStyle } from '../components/Text';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import Mat33 from '../geometry/Mat33';
import { PointerDevice } from '../Pointer';
import { PointerEvt } from '../types';
import BaseTool from './BaseTool';
import { ToolType } from './ToolController';


export default class TextTool extends BaseTool {
	public kind: ToolType = ToolType.Text;
	private textStyle: TextStyle;

	public constructor(private editor: Editor, description: string) {
		super(editor.notifier, description);
		this.textStyle = {
			size: 32,
			fontFamily: 'sans',
			style: {
				fill: Color4.black,
			},
		};
		// TODO:
		// this.textEditOverlay = document.createElement('input');

	}


	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (current.device === PointerDevice.Eraser) {
			return false;
		}

		if (allPointers.length === 1) {
			const text = prompt('(Beta feature — unreleased) Enter the text to add:', '');

			if (text) {
				const textComponent = new Text(
					[ text ],
					Mat33.translation(current.canvasPos).rightMul(
						Mat33.scaling2D(this.editor.viewport.getSizeOfPixelOnCanvas())
					),
					this.textStyle,
				);
				const action = new EditorImage.AddElementCommand(textComponent);
				this.editor.dispatch(action);
				return true;
			}
		}

		return false;
	}
}

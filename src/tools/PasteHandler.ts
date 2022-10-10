/**
 * A tool that handles paste events.
 * @packageDocumentation
 */

import Editor from '../Editor';
import { AbstractComponent, TextComponent } from '../components/lib';
import { Command, uniteCommands } from '../commands/lib';
import SVGLoader from '../SVGLoader';
import { PasteEvent } from '../types';
import { Mat33, Rect2 } from '../math/lib';
import BaseTool from './BaseTool';
import EditorImage from '../EditorImage';
import SelectionTool from './SelectionTool/SelectionTool';
import TextTool from './TextTool';
import Color4 from '../Color4';
import { TextStyle } from '../components/Text';
import ImageComponent from '../components/ImageComponent';
import Viewport from '../Viewport';

// { @inheritDoc PasteHandler! }
export default class PasteHandler extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.pasteHandler);
	}

	public onPaste(event: PasteEvent): boolean {
		const mime = event.mime.toLowerCase();

		if (mime === 'image/svg+xml') {
			void this.doSVGPaste(event.data);
			return true;
		}
		else if (mime === 'text/plain') {
			void this.doTextPaste(event.data);
			return true;
		}
		else if (mime === 'image/png' || mime === 'image/jpeg') {
			void this.doImagePaste(event.data);
			return true;
		}

		return false;
	}

	private async addComponentsFromPaste(components: AbstractComponent[]) {
		let bbox: Rect2|null = null;
		for (const component of components) {
			if (bbox) {
				bbox = bbox.union(component.getBBox());
			} else {
				bbox = component.getBBox();
			}
		}

		if (!bbox) {
			return;
		}

		// Find a transform that scales/moves bbox onto the screen.
		const visibleRect = this.editor.viewport.visibleRect;
		const scaleRatioX = visibleRect.width / bbox.width;
		const scaleRatioY = visibleRect.height / bbox.height;

		let scaleRatio = scaleRatioX;
		if (bbox.width * scaleRatio > visibleRect.width || bbox.height * scaleRatio > visibleRect.height) {
			scaleRatio = scaleRatioY;
		}
		scaleRatio *= 2 / 3;

		scaleRatio = Viewport.roundScaleRatio(scaleRatio);

		const transfm = Mat33.translation(
			visibleRect.center.minus(bbox.center)
		).rightMul(
			Mat33.scaling2D(scaleRatio, bbox.center)
		);

		const commands: Command[] = [];
		for (const component of components) {
			// To allow deserialization, we need to add first, then transform.
			commands.push(EditorImage.addElement(component));
			commands.push(component.transformBy(transfm));
		}

		const applyChunkSize = 100;
		this.editor.dispatch(uniteCommands(commands, applyChunkSize), true);

		for (const selectionTool of this.editor.toolController.getMatchingTools(SelectionTool)) {
			selectionTool.setEnabled(true);
			selectionTool.setSelection(components);
		}
	}

	private async doSVGPaste(data: string) {
		const sanitize = true;
		const loader = SVGLoader.fromString(data, sanitize);

		const components: AbstractComponent[] = [];

		await loader.start((component) => {
			components.push(component);
		},
		(_countProcessed: number, _totalToProcess: number) => null);

		await this.addComponentsFromPaste(components);
	}

	private async doTextPaste(text: string) {
		const textTools = this.editor.toolController.getMatchingTools(TextTool);

		textTools.sort((a, b) => {
			if (!a.isEnabled() && b.isEnabled()) {
				return -1;
			}

			if (!b.isEnabled() && a.isEnabled()) {
				return 1;
			}

			return 0;
		});

		const defaultTextStyle: TextStyle = { size: 12, fontFamily: 'sans', renderingStyle: { fill: Color4.red } };
		const pastedTextStyle: TextStyle = textTools[0]?.getTextStyle() ?? defaultTextStyle;

		const lines = text.split('\n');
		await this.addComponentsFromPaste([ TextComponent.fromLines(lines, Mat33.identity, pastedTextStyle) ]);
	}

	private async doImagePaste(dataURL: string) {
		const image = new Image();
		image.src = dataURL;
		const component = await ImageComponent.fromImage(image, Mat33.identity);
		await this.addComponentsFromPaste([ component ]);
	}
}

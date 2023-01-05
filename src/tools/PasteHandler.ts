/**
 * A tool that handles paste events.
 * @packageDocumentation
 */

import Editor from '../Editor';
import { AbstractComponent, TextComponent } from '../components/lib';
import SVGLoader from '../SVGLoader';
import { PasteEvent } from '../types';
import { Mat33 } from '../math/lib';
import BaseTool from './BaseTool';
import TextTool from './TextTool';
import Color4 from '../Color4';
import { TextStyle } from '../components/TextComponent';
import ImageComponent from '../components/ImageComponent';

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
		await this.editor.addAndCenterComponents(components);
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

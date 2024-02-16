import Editor from '../Editor';
import AbstractComponent from '../components/AbstractComponent';
import TextComponent from '../components/TextComponent';
import SVGLoader from '../SVGLoader';
import { PasteEvent } from '../inputEvents';
import { Mat33, Color4 } from '@js-draw/math';
import BaseTool from './BaseTool';
import TextTool from './TextTool';
import ImageComponent from '../components/ImageComponent';
import TextRenderingStyle from '../rendering/TextRenderingStyle';

/**
 * A tool that handles paste events (e.g. as triggered by ctrl+V).
 *
 * @example
 * While `ToolController` has a `PasteHandler` in its default list of tools,
 * if a non-default set is being used, `PasteHandler` can be added as follows:
 * ```ts
 * const toolController = editor.toolController;
 * toolController.addTool(new PasteHandler(editor));
 * ```
 */
export default class PasteHandler extends BaseTool {
	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.pasteHandler);
	}

	// @internal
	public override onPaste(event: PasteEvent): boolean {
		const mime = event.mime.toLowerCase();

		if (mime === 'image/svg+xml' || mime === 'text/html') {
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
		const loader = SVGLoader.fromString(data, true);

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

		const defaultTextStyle: TextRenderingStyle = { size: 12, fontFamily: 'sans', renderingStyle: { fill: Color4.red } };
		const pastedTextStyle: TextRenderingStyle = textTools[0]?.getTextStyle() ?? defaultTextStyle;

		// Don't paste text that would be invisible.
		if (text.trim() === '') {
			return;
		}

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

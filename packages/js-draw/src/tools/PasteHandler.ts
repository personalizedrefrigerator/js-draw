import Editor from '../Editor';
import AbstractComponent from '../components/AbstractComponent';
import TextComponent from '../components/TextComponent';
import SVGLoader from '../SVGLoader/SVGLoader';
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
	public override onPaste(event: PasteEvent, onComplete?: () => void): boolean {
		const mime = event.mime.toLowerCase();

		const svgData = (() => {
			if (mime === 'image/svg+xml') {
				return event.data;
			}

			// In some environments, it isn't possible to write non-text data to the
			// clipboard. To support these cases, auto-detect text/plain SVG data.
			if (mime === 'text/plain') {
				const trimmedData = event.data.trim();
				if (trimmedData.startsWith('<svg') && trimmedData.endsWith('</svg>')) {
					return trimmedData;
				}
			}

			if (mime !== 'text/html') {
				return false;
			}

			// text/html is sometimes handlable SVG data. Use a hueristic
			// to determine if this is the case:
			// We use [^] and not . so that newlines are included.
			const match = event.data.match(/^[^]{0,200}<svg.*/i); // [^]{0,200} <- Allow for metadata near start
			if (!match) {
				return false;
			}

			// Extract the SVG element from the pasted data
			let svgEnd = event.data.toLowerCase().lastIndexOf('</svg>');
			if (svgEnd === -1) svgEnd = event.data.length;
			return event.data.substring(event.data.search(/<svg/i), svgEnd);
		})();

		if (svgData) {
			void this.doSVGPaste(svgData).then(onComplete);
			return true;
		} else if (mime === 'text/plain') {
			void this.doTextPaste(event.data).then(onComplete);
			return true;
		} else if (mime === 'image/png' || mime === 'image/jpeg') {
			void this.doImagePaste(event.data).then(onComplete);
			return true;
		}

		return false;
	}

	private async addComponentsFromPaste(components: AbstractComponent[]) {
		await this.editor.addAndCenterComponents(
			components,
			true,
			this.editor.localization.pasted(components.length),
		);
	}

	private async doSVGPaste(data: string) {
		this.editor.showLoadingWarning(0);
		try {
			const loader = SVGLoader.fromString(data, {
				sanitize: true,
				plugins: this.editor.getCurrentSettings().svg?.loaderPlugins ?? [],
			});

			const components: AbstractComponent[] = [];
			await loader.start(
				(component) => {
					components.push(component);
				},
				(_countProcessed: number, _totalToProcess: number) => null,
			);

			await this.addComponentsFromPaste(components);
		} finally {
			this.editor.hideLoadingWarning();
		}
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

		const defaultTextStyle: TextRenderingStyle = {
			size: 12,
			fontFamily: 'sans',
			renderingStyle: { fill: Color4.red },
		};
		const pastedTextStyle: TextRenderingStyle = textTools[0]?.getTextStyle() ?? defaultTextStyle;

		// Don't paste text that would be invisible.
		if (text.trim() === '') {
			return;
		}

		const lines = text.split('\n');
		await this.addComponentsFromPaste([
			TextComponent.fromLines(lines, Mat33.identity, pastedTextStyle),
		]);
	}

	private async doImagePaste(dataURL: string) {
		const image = new Image();
		image.src = dataURL;
		const component = await ImageComponent.fromImage(image, Mat33.identity);
		await this.addComponentsFromPaste([component]);
	}
}

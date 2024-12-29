import BaseTool from '../tools/BaseTool';
import createEditor from '../testing/createEditor';
import ClipboardHandler from './ClipboardHandler';
import { CopyEvent, PasteEvent } from '../inputEvents';
import Editor from '../Editor';
import TextComponent from '../components/TextComponent';

interface ExtendedClipboardItem extends ClipboardItem {
	supports(mime: string): boolean;
}
declare const ClipboardItem: ExtendedClipboardItem;

type ClipboardTestData = Record<string, string | Blob>;

// A tool that handles all copy events
class TestCopyPasteTool extends BaseTool {
	public constructor(
		editor: Editor,
		private data: ClipboardTestData,
	) {
		super(editor.notifier, 'copy tool');
	}

	public override onCopy(event: CopyEvent): boolean {
		for (const key in this.data) {
			const data = this.data[key];
			if (typeof data === 'string') {
				event.setData(key, data);
			} else {
				event.setData(key, Promise.resolve(data));
			}
		}

		return true;
	}

	public lastPasteData: PasteEvent;
	public override onPaste(event: PasteEvent): boolean {
		this.lastPasteData = { ...event };
		return false;
	}
}

const setUpCopyPasteTool = (editor: Editor, dataToCopy: ClipboardTestData) => {
	const copyTool = new TestCopyPasteTool(editor, dataToCopy);
	editor.toolController.addTool(copyTool, { addToFront: true });
	return copyTool;
};

const originalClipboardItem = window.ClipboardItem;
const setClipboardApiSupported = (supported: boolean) => {
	if (supported) {
		window.ClipboardItem = originalClipboardItem;
	} else {
		window.ClipboardItem = undefined as any;
	}
};

const getAllTextInImage = (editor: Editor) => {
	const textObjects = editor.image.getAllElements().filter((elem) => elem instanceof TextComponent);
	return textObjects.map((o) => o.getText()).join('\n');
};

describe('ClipboardHandler', () => {
	beforeEach(async () => {
		setClipboardApiSupported(true);
		await navigator.clipboard.write([]);
	});

	describe('copy', () => {
		it('should copy to the clipboard API when no event is given', async () => {
			const editor = createEditor();
			setUpCopyPasteTool(editor, {
				'text/plain': 'Test.',
			});

			const clipboardHandler = new ClipboardHandler(editor);

			await clipboardHandler.copy();

			expect(await navigator.clipboard.readText()).toBe('Test.');
		});

		it('should copy to the clipboard API when images are to be copied', async () => {
			const editor = createEditor();
			setUpCopyPasteTool(editor, {
				'text/plain': 'Testing!',
				'text/html': '<i>Testing!</i>',
				'image/png': 'Fake image.',
			});
			const clipboardHandler = new ClipboardHandler(editor);

			const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer() });
			await clipboardHandler.copy(event);

			// Should not have written to the clipboard event
			expect(event.clipboardData?.getData('text/plain')).toBe('');
			expect(event.clipboardData?.getData('text/html')).toBe('');

			// Should have written to navigator.clipboard
			const clipboardItems = await navigator.clipboard.read();
			const itemTypes = clipboardItems.map((item) => item.types).flat();
			expect(itemTypes).toContain('image/png');
			expect(itemTypes).toContain('text/plain');
			expect(itemTypes).toContain('text/html');
		});

		it.each([
			[
				{
					'text/plain': 'Testing!',
					'text/html': '<i>Testing!</i>',
				},
			],
			[
				{
					'text/plain': 'Test 2',
					'text/html': '<i>...</i>',

					// image/svg+xml is a text format, so shouldn't cause navigator.clipboard to be used
					'image/svg+xml': 'test',
				},
			],
		])('should use event.dataTransfer when no images are to be copied (case %#)', async (data) => {
			const editor = createEditor();
			setUpCopyPasteTool(editor, data);
			const clipboardHandler = new ClipboardHandler(editor);

			const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer() });
			await clipboardHandler.copy(event);

			expect(event.clipboardData?.getData('text/plain')).toBe(data['text/plain']);
			expect(event.clipboardData?.getData('text/html')).toBe(data['text/html']);
		});

		it('should use event.dataTransfer when the clipboard API is unsupported', async () => {
			setClipboardApiSupported(false);

			const editor = createEditor();
			setUpCopyPasteTool(editor, {
				'text/plain': 'This should be copied.',
				'image/png': 'Fake image.',
			});

			const clipboardHandler = new ClipboardHandler(editor);

			const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer() });
			await clipboardHandler.copy(event);

			expect(event.clipboardData?.getData('text/plain')).toBe('This should be copied.');
			expect(await navigator.clipboard.read()).toHaveLength(0);
		});

		// image/svg+xml is unsupported in iOS as of mid 2024.
		it('should copy text/html instead of image/svg+xml when copying to the Clipboard API', async () => {
			const editor = createEditor();
			setUpCopyPasteTool(editor, {
				'image/svg+xml': '<svg>This should be copied.</svg>',
			});

			const clipboardHandler = new ClipboardHandler(editor);

			await clipboardHandler.copy();

			const clipboardItems = await navigator.clipboard.read();
			expect(clipboardItems).toHaveLength(1);
			expect(await (await clipboardItems[0].getType('text/html')).text()).toBe(
				'<svg>This should be copied.</svg>',
			);
		});

		it('should not attempt to copy MIME types explicitly marked as unsupported by the browser', async () => {
			const editor = createEditor();
			const disallowedType = 'image/svg+xml';
			setUpCopyPasteTool(editor, {
				[disallowedType]: '<svg>This should NOT be copied.</svg>',
				'text/plain': 'This should be copied',
			});

			ClipboardItem.supports = jest.fn((mime: string) => mime !== disallowedType);

			const clipboardHandler = new ClipboardHandler(editor);

			await clipboardHandler.copy();

			const clipboardItems = await navigator.clipboard.read();
			expect(clipboardItems).toHaveLength(1);
			expect(await (await clipboardItems[0].getType('text/plain')).text()).toBe(
				'This should be copied',
			);
			expect(clipboardItems[0].types).not.toContain(disallowedType);
		});

		it('should prefer editorSettings.clipboardApi (if provided) to the native clipboard API', async () => {
			const clipboardWrite = jest.fn((_data: Map<string, string>) => {});
			const editor = createEditor({
				clipboardApi: {
					write: clipboardWrite,
					read: async () => new Map(),
				},
			});

			setUpCopyPasteTool(editor, {
				'text/plain': 'This should be copied',
				'text/html': '<strong>test!</strong>',
			});

			const clipboardHandler = new ClipboardHandler(editor);
			await clipboardHandler.copy();

			expect(clipboardWrite.mock.calls).toEqual([
				[
					new Map([
						['text/plain', 'This should be copied'],
						['text/html', '<strong>test!</strong>'],
					]),
				],
			]);
		});

		it('should prefer ClipboardEvents to editorSettings.clipboardApi', async () => {
			const clipboardWrite = jest.fn(() => {});
			const editor = createEditor({
				clipboardApi: {
					write: clipboardWrite,
					read: async () => new Map(),
				},
			});
			setUpCopyPasteTool(editor, {
				'text/plain': 'This is the content to copy.',
			});

			const clipboardHandler = new ClipboardHandler(editor);

			const event = new ClipboardEvent('copy', { clipboardData: new DataTransfer() });
			await clipboardHandler.copy(event);

			// Should write the data to the event, rather than calling api.clipboardWrite.
			expect(clipboardWrite).not.toHaveBeenCalled();
			expect(event.clipboardData?.getData('text/plain')).toBe('This is the content to copy.');
		});
	});

	describe('paste', () => {
		it('should support pasting from the clipboard API', async () => {
			const editor = createEditor();
			const clipboardHandler = new ClipboardHandler(editor);

			const testData = '<svg><text>Testing...</text></svg>';
			const copyPasteTool = setUpCopyPasteTool(editor, {
				'image/svg+xml': testData,
			});
			await clipboardHandler.copy();
			await clipboardHandler.paste();

			// Should have pasted
			expect(copyPasteTool.lastPasteData).toMatchObject({
				mime: 'image/svg+xml',
				data: testData,
			});
		});

		it('should support pasting Blobs from editorSettings.clipboardApi', async () => {
			const clipboardRead = jest.fn(
				async () => new Map([['text/plain', new Blob(['This should be pasted'])]]),
			);
			const editor = createEditor({
				clipboardApi: {
					write: () => {},
					read: clipboardRead,
				},
			});

			setUpCopyPasteTool(editor, {});

			const clipboardHandler = new ClipboardHandler(editor);
			await clipboardHandler.paste();

			expect(getAllTextInImage(editor)).toBe('This should be pasted');
		});

		it('should prefer editorSettings.clipboardApi (if provided) to the native clipboard API', async () => {
			const clipboardRead = jest.fn(async () => new Map([['text/plain', 'This SHOULD be pasted']]));
			const editor = createEditor({
				clipboardApi: {
					write: () => {},
					read: clipboardRead,
				},
			});

			await navigator.clipboard.writeText('Test!');

			setUpCopyPasteTool(editor, {});

			const clipboardHandler = new ClipboardHandler(editor);
			await clipboardHandler.paste();

			expect(clipboardRead).toHaveBeenCalled();
			expect(getAllTextInImage(editor)).toBe('This SHOULD be pasted');
		});

		it('should prefer ClipboardEvents to editorSettings.clipboardApi', async () => {
			const clipboardRead = jest.fn(async () => {
				return new Map([['text/plain', 'This should NOT be pasted']]);
			});
			const editor = createEditor({
				clipboardApi: {
					write: () => {},
					read: clipboardRead,
				},
			});
			setUpCopyPasteTool(editor, {});

			const clipboardHandler = new ClipboardHandler(editor);

			const event = new ClipboardEvent('paste', { clipboardData: new DataTransfer() });
			event.clipboardData?.setData('text/plain', 'This SHOULD be pasted!');
			await clipboardHandler.paste(event);

			// Should read from the event, rather than the API
			expect(clipboardRead).not.toHaveBeenCalled();
			expect(getAllTextInImage(editor)).toBe('This SHOULD be pasted!');
		});
	});
});

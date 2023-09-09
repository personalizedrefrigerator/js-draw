import EditorImage from './EditorImage';
import Stroke from './components/Stroke';
import { Vec2, Color4, Path, PathCommandType, Rect2, Mat33 } from '@js-draw/math';
import DummyRenderer from './rendering/renderers/DummyRenderer';
import createEditor from './testing/createEditor';
import RenderingStyle from './rendering/RenderingStyle';
import { Command, Erase, SerializableCommand, uniteCommands } from './commands/lib';
import { pathToRenderable } from './rendering/RenderablePathSpec';

describe('EditorImage', () => {
	const testStroke = new Stroke([
		{
			startPoint: Vec2.of(1, 0),
			commands: [
				{
					kind: PathCommandType.MoveTo,
					point: Vec2.of(3, 3),
				},
			],
			style: {
				fill: Color4.red,
			},
		},
	]);
	const testFill: RenderingStyle = { fill: Color4.black };
	const addTestStrokeCommand = EditorImage.addElement(testStroke);

	it('elements added to the image should be findable', () => {
		const editor = createEditor();
		const image = editor.image;

		// We haven't activated the command, so testStroke's parent should be null.
		expect(image.findParent(testStroke)).toBeNull();
		addTestStrokeCommand.apply(editor);
		expect(image.findParent(testStroke)).not.toBeNull();
	});

	it('should render an element added to the image', () => {
		const editor = createEditor();
		const renderer = editor.display.getDryInkRenderer();
		if (!(renderer instanceof DummyRenderer)) {
			throw new Error('Wrong display type!');
		}

		const emptyDocumentPathCount = renderer.renderedPathCount;
		expect(renderer.objectNestingLevel).toBe(0);
		editor.dispatch(addTestStrokeCommand);
		editor.rerender();
		expect(renderer.renderedPathCount - emptyDocumentPathCount).toBeGreaterThanOrEqual(1);

		// Should not be within objects after finished rendering
		expect(renderer.objectNestingLevel).toBe(0);
	});

	it('should have a 1-deep tree if two non-overlapping strokes are added', () => {
		const editor = createEditor();
		const image = editor.image;

		const leftmostStroke = new Stroke([
			pathToRenderable(Path.fromString('M0,0L1,1L0,1'), testFill),
		]);

		// Lowercase ls: lineTo(Δx, Δy) instead of lineTo(x, y)
		const rightmostStroke = new Stroke([
			pathToRenderable(Path.fromString('M-10,0 l1,1 l0,-1'), testFill),
		]);

		expect(!leftmostStroke.getBBox().intersects(rightmostStroke.getBBox()));

		(EditorImage.addElement(leftmostStroke)).apply(editor);

		// The first node should be at the image's root.
		let firstParent = image.findParent(leftmostStroke);
		expect(firstParent).not.toBe(null);
		expect(firstParent?.getParent()).toBe(null);
		expect(firstParent?.getBBox()?.corners).toMatchObject(leftmostStroke.getBBox()?.corners);

		(EditorImage.addElement(rightmostStroke)).apply(editor);

		firstParent = image.findParent(leftmostStroke);
		const secondParent = image.findParent(rightmostStroke);

		expect(firstParent).not.toStrictEqual(secondParent);
		expect(firstParent?.getParent()).toStrictEqual(secondParent?.getParent());
		expect(firstParent?.getParent()?.getParent()).toBeNull();
	});

	it('setImportExportRect should return a serializable command', () => {
		const editor = createEditor();
		const image = editor.image;

		const originalRect = editor.getImportExportRect();
		const newRect = new Rect2(3, 4, 5, 6);
		const command = image.setImportExportRect(newRect);
		expect(command.serialize().data).toMatchObject({
			originalSize: originalRect.size.xy,
			originalTransform: Mat33.identity.toArray(),
			newRegion: {
				x: 3,
				y: 4,
				w: 5,
				h: 6,
			},
			autoresize: false,
			originalAutoresize: false,
		});

		expect(editor.getImportExportRect()).objEq(originalRect);
		command.apply(editor);
		expect(editor.getImportExportRect()).objEq(newRect);

		const deserializedCommand = SerializableCommand.deserialize(command.serialize(), editor);

		deserializedCommand.unapply(editor);
		expect(editor.getImportExportRect()).objEq(originalRect);
		deserializedCommand.apply(editor);
		expect(editor.getImportExportRect()).objEq(newRect);
	});

	it('should autoresize the import/export region when autoresize is enabled', async () => {
		const editor = createEditor();
		const image = editor.image;

		const getScreenRect = () => editor.image.getImportExportRect();

		const originalRect = getScreenRect();

		await editor.dispatch(image.addElement(testStroke));

		expect(image.getAutoresizeEnabled()).toBe(false);

		// the autoresizeEnabled command should enable autoresize
		const setAutoresizeCommand = image.setAutoresizeEnabled(true);
		expect(image.getAutoresizeEnabled()).toBe(false);
		await editor.dispatch(setAutoresizeCommand);
		expect(image.getAutoresizeEnabled()).toBe(true);

		// Should match the bounding box of the **content** of the image
		expect(getScreenRect()).objEq(testStroke.getBBox());
		expect(getScreenRect()).not.objEq(originalRect);

		await editor.history.undo();

		// Should match the original image size
		expect(getScreenRect()).objEq(originalRect);

		await editor.history.redo();

		// Should match the test stroke again
		expect(getScreenRect()).objEq(testStroke.getBBox());

		// Adding another test stroke should update the screen rect size.
		const testStroke2 = testStroke.clone();
		await editor.dispatch(uniteCommands([
			editor.image.addElement(testStroke2),
			testStroke2.transformBy(Mat33.translation(Vec2.of(100, -10))),
		]));

		// After adding, the viewport should update
		expect(getScreenRect()).objEq(
			testStroke.getBBox().union(testStroke2.getBBox())
		);

		// After deleting one of the strokes, the viewport should update
		await editor.dispatch(new Erase([
			testStroke
		]));

		expect(getScreenRect()).objEq(
			testStroke2.getBBox()
		);
	});

	it('setAutoresizeEnabled should return a serializable command', async () => {
		const editor = createEditor();
		const originalScreenRect =  editor.image.getImportExportRect();

		const enableAutoresizeCommand = editor.image.setAutoresizeEnabled(true) as SerializableCommand;

		// When autoresize is already disabled, the setAutoresizeEnabled(false) should do
		// nothing (in this case, return the empty command).
		const disableAutoresizeCommand = editor.image.setAutoresizeEnabled(false);
		expect(disableAutoresizeCommand).toBe(Command.empty);

		const deserializedEnableCommand = SerializableCommand.deserialize(
			enableAutoresizeCommand.serialize(), editor
		);

		// Dispatching a deserialized version of the enableAutoresize command should work
		await editor.dispatch(deserializedEnableCommand);
		expect(editor.image.getAutoresizeEnabled()).toBe(true);

		// Dispatching a deserialized version of a command that disables autoresize should work
		const deserializedDisableCommand = SerializableCommand.deserialize(
			(editor.image.setAutoresizeEnabled(false) as SerializableCommand).serialize(),
			editor,
		);

		expect(editor.image.getAutoresizeEnabled()).toBe(true);
		await editor.dispatch(deserializedDisableCommand);
		expect(editor.image.getAutoresizeEnabled()).toBe(false);

		await editor.history.undo();
		await editor.history.undo();

		expect(editor.image.getImportExportRect()).objEq(originalScreenRect);
	});
});

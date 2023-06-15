import EditorImage from './EditorImage';
import Stroke from './components/Stroke';
import { Vec2 } from './math/Vec2';
import Path, { PathCommandType } from './math/Path';
import Color4 from './Color4';
import DummyRenderer from './rendering/renderers/DummyRenderer';
import createEditor from './testing/createEditor';
import RenderingStyle from './rendering/RenderingStyle';
import Rect2 from './math/Rect2';
import Mat33 from './math/Mat33';
import { SerializableCommand } from './lib';

describe('EditorImage', () => {
	const testStroke = new Stroke([
		{
			startPoint: Vec2.of(0, 0),
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
			Path.fromString('M0,0L1,1L0,1').toRenderable(testFill),
		]);

		// Lowercase ls: lineTo(Δx, Δy) instead of lineTo(x, y)
		const rightmostStroke = new Stroke([
			Path.fromString('M-10,0 l1,1 l0,-1').toRenderable(testFill),
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
});

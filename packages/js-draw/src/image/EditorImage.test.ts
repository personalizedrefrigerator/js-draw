import EditorImage from './EditorImage';
import Stroke from '../components/Stroke';
import {
	Vec2,
	Color4,
	Path,
	PathCommandType,
	Rect2,
	Mat33,
	LineSegment2,
	Vec3,
} from '@js-draw/math';
import DummyRenderer from '../rendering/renderers/DummyRenderer';
import createEditor from '../testing/createEditor';
import RenderingStyle from '../rendering/RenderingStyle';
import { Command, Erase, SerializableCommand, uniteCommands } from '../commands/lib';
import { pathToRenderable } from '../rendering/RenderablePathSpec';
import AbstractComponent, { ComponentSizingMode } from '../components/AbstractComponent';
import { ImageComponentLocalization } from '../components/localization';
import { AbstractRenderer } from '../rendering/lib';

// A base component with some methods implemented to facilitate creating
// custom AbstractComponent subclasses for the tests below.
abstract class BaseTestComponent extends AbstractComponent {
	protected override contentBBox: Rect2;

	public constructor(bbox: Rect2, componentKind: string) {
		super(componentKind);
		this.contentBBox = bbox;
	}
	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2) {
		canvas.startObject(this.contentBBox);
		canvas.fillRect(this.contentBBox, Color4.red);
		canvas.endObject();
	}
	public override intersects(lineSegment: LineSegment2): boolean {
		return this.contentBBox.intersectsLineSegment(lineSegment).length > 0;
	}
	protected override serializeToJSON(): string | number | any[] | Record<string, any> | null {
		return {
			bbox: this.getBBox().corners.map((corner) => corner.asArray()),
		};
	}
	public override description(_localizationTable: ImageComponentLocalization): string {
		return 'A test component';
	}
}

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
	const addTestStrokeCommand = EditorImage.addComponent(testStroke);

	beforeEach(() => {
		EditorImage.setDebugMode(true);
	});

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

		EditorImage.addComponent(leftmostStroke).apply(editor);

		// The first node should be at the image's root.
		let firstParent = image.findParent(leftmostStroke);
		expect(firstParent).not.toBe(null);
		expect(firstParent?.getParent()).toBe(null);
		expect(firstParent?.getBBox()?.corners).toMatchObject(leftmostStroke.getBBox()?.corners);

		EditorImage.addComponent(rightmostStroke).apply(editor);

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

		await editor.dispatch(image.addComponent(testStroke));

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
		await editor.dispatch(
			uniteCommands([
				editor.image.addComponent(testStroke2),
				testStroke2.transformBy(Mat33.translation(Vec2.of(100, -10))),
			]),
		);

		// After adding, the viewport should update
		expect(getScreenRect()).objEq(testStroke.getBBox().union(testStroke2.getBBox()));

		// After deleting one of the strokes, the viewport should update
		await editor.dispatch(new Erase([testStroke]));

		expect(getScreenRect()).objEq(testStroke2.getBBox());

		//
		// Regression test:
		// In the past, js-draw had a bug where the top-left of the root bounding box
		// would be incorrect after:
		// 1. Creating a node
		// 2. Creating a node within the node created in (1)
		// 3. Adding many strokes within node (2)
		// 4. Deleting node (2)
		// 5. Deleting node (1)
		//

		const stroke3 = new Stroke([
			pathToRenderable(Path.fromRect(new Rect2(5, -11, 53, 53)), { fill: Color4.red }),
		]);
		await editor.dispatch(EditorImage.addComponent(stroke3));

		// After adding multiple new strokes, should have correct top-left corner
		// (tests non-zero case).
		for (let x = 10; x <= 60; x += 1) {
			for (let y = -10; y <= 40; y += 1) {
				const stroke = new Stroke([
					pathToRenderable(Path.fromString(`m${x},${y} l1,0 l0,1`), { fill: Color4.red }),
				]);
				await editor.dispatch(EditorImage.addComponent(stroke));
			}
		}

		expect(getScreenRect()).objEq(stroke3.getBBox().union(testStroke2.getBBox()));

		await editor.dispatch(new Erase([stroke3]));
		await editor.dispatch(new Erase([testStroke2]));

		expect(getScreenRect()).objEq(new Rect2(10, -10, 51, 51));
	});

	it('setAutoresizeEnabled should return a serializable command', async () => {
		const editor = createEditor();
		const originalScreenRect = editor.image.getImportExportRect();

		const enableAutoresizeCommand = editor.image.setAutoresizeEnabled(true) as SerializableCommand;

		// When autoresize is already disabled, the setAutoresizeEnabled(false) should do
		// nothing (in this case, return the empty command).
		const disableAutoresizeCommand = editor.image.setAutoresizeEnabled(false);
		expect(disableAutoresizeCommand).toBe(Command.empty);

		const deserializedEnableCommand = SerializableCommand.deserialize(
			enableAutoresizeCommand.serialize(),
			editor,
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

	describe('should correctly adding/remove a single component', () => {
		const runTest = async (positioning: ComponentSizingMode, isBackground: boolean) => {
			const renderMock = jest.fn();
			const addToImageMock = jest.fn();

			// Create a subclass of AbstractComponent with the given positioning mode.
			const TestComponent = class extends BaseTestComponent {
				public positioning: ComponentSizingMode;

				public constructor(bbox: Rect2) {
					super(bbox, 'test-component');
					this.positioning = positioning;
				}
				public override render(canvas: AbstractRenderer, visibleRect?: Rect2): void {
					renderMock(canvas, visibleRect);
					super.render(canvas, visibleRect);
				}
				protected override applyTransformation(_affineTransfm: Mat33): void {
					throw new Error('Method not implemented.');
				}
				protected override createClone(): AbstractComponent {
					return new TestComponent(this.getBBox());
				}
				public override onAddToImage(image: EditorImage): void {
					addToImageMock(image);
				}
				public override getSizingMode(): ComponentSizingMode {
					return this.positioning;
				}
				public override isBackground(): boolean {
					return isBackground;
				}
			};

			AbstractComponent.registerComponent('test-component', (data) => {
				return new TestComponent(
					Rect2.bboxOf(
						JSON.parse(data).bbox.map((corner: [number, number, number]) => Vec3.of(...corner)),
					),
				);
			});

			const testBBoxes = [Rect2.unitSquare, Rect2.empty];

			for (const bbox of testBBoxes) {
				renderMock.mockClear();
				addToImageMock.mockClear();

				const testComponent = new TestComponent(bbox);

				const editor = createEditor();
				const image = editor.image;
				const addElementCommand = image.addComponent(testComponent);

				expect(renderMock).not.toHaveBeenCalled();
				expect(addToImageMock).not.toHaveBeenCalled();

				await editor.dispatch(addElementCommand);

				// addToImage should have been called
				expect(addToImageMock).toHaveBeenCalledWith(image);

				// Should have a parent
				expect(image.findParent(testComponent)).not.toBeNull();

				// If set to fill the screen, even a query with a far-away bounding box
				// should return the element.
				if (positioning === ComponentSizingMode.FillScreen) {
					expect(
						image.getComponentsIntersecting(new Rect2(50, 50, 1, 1), true).includes(testComponent),
					).toBe(true);
				}

				// Querying the component's own bounding box should also return results.
				const elements = image.getComponentsIntersecting(
					// Grow the check region if an empty bbox
					bbox.maxDimension === 0 ? bbox.grownBy(1) : bbox,

					// Include background components
					true,
				);

				// If one of the intersectable positioning types,
				if (positioning !== ComponentSizingMode.Anywhere) {
					expect(elements).toMatchObject([testComponent]);
				} else {
					expect(elements).toHaveLength(0);
				}

				expect(image.estimateNumElements()).toBe(1);

				// getAllElements does not include backgrounds
				const expectToBeOnlyElement = () => {
					if (!isBackground) {
						// Regardless of type, should be present in allElements
						expect(image.getAllElements()).toHaveLength(1);
						expect(image.getAllElements()[0]).toBe(testComponent);
					} else {
						expect(image.getBackgroundComponents()).toHaveLength(1);
						expect(image.getBackgroundComponents()[0]).toBe(testComponent);
					}
				};
				expectToBeOnlyElement();

				renderMock.mockClear();

				// Calling renderAll should render the component.
				const renderer = editor.display.getDryInkRenderer();
				image.renderAll(renderer);

				expect(renderMock).toHaveBeenCalledTimes(1);
				expect(renderMock).toHaveBeenCalledWith(renderer, undefined);

				// Calling render should render the component depending on the
				// viewport and whether the component has type Anywhere.
				await editor.viewport.zoomTo(bbox).apply(editor);

				image.render(renderer, editor.viewport);

				// Should not have rendered the Anywhere positioned element (should consider
				// the element off-screen for performance reasons).
				if (
					positioning === ComponentSizingMode.BoundingBox ||
					positioning === ComponentSizingMode.FillScreen
				) {
					expect(renderMock).toHaveBeenCalledTimes(2);
					expect(renderMock).toHaveBeenLastCalledWith(renderer, editor.viewport.visibleRect);
				} else {
					expect(renderMock).toHaveBeenCalledTimes(1);
				}

				// Remove the element
				await editor.history.undo();

				expect(image.estimateNumElements()).toBe(0);

				// Calling renderAll should now NOT render the component.
				renderMock.mockClear();
				image.renderAll(renderer);
				expect(renderMock).toHaveBeenCalledTimes(0);

				expect(image.getAllElements()).toHaveLength(0);
				expect(image.getBackgroundComponents()).toHaveLength(0);

				// Add the element back
				await editor.history.redo();
				expectToBeOnlyElement();

				// Change the positioning of the element
				if (positioning === ComponentSizingMode.BoundingBox) {
					testComponent.positioning = ComponentSizingMode.FillScreen;
				} else {
					testComponent.positioning = ComponentSizingMode.BoundingBox;
				}

				// Should still find the parent.
				expect(image.findParent(testComponent)).not.toBeNull();

				// Remove the element -- should remove, even though positioning has changed.
				await editor.dispatch(new Erase([testComponent]));
				expect(image.estimateNumElements()).toBe(0);
				expect(image.getAllElements()).toHaveLength(0);
			}
		};

		it('should correctly add/remove Anywhere-positioned components', async () => {
			await runTest(ComponentSizingMode.Anywhere, false);
			await runTest(ComponentSizingMode.Anywhere, true);
		});

		it('should correctly add/remove FillScreen-positioned components', async () => {
			await runTest(ComponentSizingMode.FillScreen, false);
			await runTest(ComponentSizingMode.FillScreen, true);
		});

		it('should correctly add/remove BoundingBox-positioned components', async () => {
			await runTest(ComponentSizingMode.BoundingBox, true);
			await runTest(ComponentSizingMode.BoundingBox, false);
		});
	});
});

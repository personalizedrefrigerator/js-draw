import { Color4, Mat33, Rect2, TextComponent, EditorImage, Vec2, StrokeComponent, SelectionTool, sendPenEvent, InputEvtType } from './lib';
import TextRenderingStyle from './rendering/TextRenderingStyle';
import SVGLoader from './SVGLoader';
import createEditor from './testing/createEditor';

describe('Editor.toSVG', () => {
	it('should correctly nest text objects', async () => {
		const editor = createEditor();
		const textStyle: TextRenderingStyle = {
			fontFamily: 'sans', size: 12, renderingStyle: { fill: Color4.black }
		};
		const text = new TextComponent([
			'Testing...',
			new TextComponent([ 'Test 2' ], Mat33.translation(Vec2.of(0, 100)), textStyle),
		], Mat33.identity, textStyle);
		editor.dispatch(EditorImage.addElement(text));

		const matches = editor.image.getElementsIntersectingRegion(new Rect2(4, -100, 100, 100));
		expect(matches).toHaveLength(1);
		expect(text).not.toBeNull();

		const asSVG = editor.toSVG();
		const allTSpans = [ ...asSVG.querySelectorAll('tspan') ];
		expect(allTSpans).toHaveLength(1);
		expect(allTSpans[0].getAttribute('x')).toBe('0');
		expect(allTSpans[0].getAttribute('y')).toBe('100');
		expect(allTSpans[0].style.transform).toBe('');
	});

	it('should preserve empty tspans', async () => {
		const editor = createEditor();
		await editor.loadFrom(SVGLoader.fromString(`
			<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
				<style id="js-draw-style-sheet">
					path {
						stroke-linecap:round;
						stroke-linejoin:round;
					}
				</style>
				<text style="transform: matrix(1, 0, 0, 1, 12, 35); font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">Testing...<tspan x="3" y="40" style="font-family: sans-serif; font-size: 33px; fill: rgb(128, 51, 128);"></tspan><tspan x="3" y="70">Test 2. ☺</tspan></text>
			</svg>
		`, true));

		const textNodesInImage = editor.image.getAllElements().filter(elem => elem instanceof TextComponent);
		expect(
			textNodesInImage
		).toHaveLength(1);

		const asSVG = editor.toSVG();
		const textObject = asSVG.querySelector('text');

		if (!textObject) {
			throw new Error('No text object found');
		}

		const childTextNodes = textObject.querySelectorAll('tspan');
		expect(childTextNodes).toHaveLength(2);
	});

	it('should preserve text child size/placement while not saving additional properties', async () => {
		const secondLineText = 'This is a test of a thing that has been known to break. Will this test catch the issue?';
		const thirdLineText = 'This is a test of saving/loading multi-line text...';

		const editor = createEditor();
		await editor.loadFrom(SVGLoader.fromString(`
			<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
				<style id="js-draw-style-sheet">
					path {
						stroke-linecap:round;
						stroke-linejoin:round;
					}
				</style>
				<text style="transform: matrix(1, 0, 0, 1, 12, 35); font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">Testing...<tspan x="3" y="40" style="font-family: sans-serif; font-size: 33px; fill: rgb(128, 51, 128);">${secondLineText}</tspan><tspan x="0" y="72" style="font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">${thirdLineText}</tspan><tspan x="0" y="112" style="font-family: sans-serif; font-size: 32px; fill: rgb(128, 51, 128);">Will it pass or fail?</tspan></text>
			</svg>
		`, true));

		expect(
			editor.image.getAllElements().filter(elem => elem instanceof TextComponent)
		).toHaveLength(1);

		const asSVG = editor.toSVG();
		const textObject = asSVG.querySelector('text');

		if (!textObject) {
			throw new Error('No text object found');
		}

		expect(textObject.style.transform.replace(/\s+/g, '')).toBe('matrix(1,0,0,1,12,35)');
		expect(textObject.style.fontFamily).toBe('sans-serif');
		expect(textObject.style.fontSize).toBe('32px');

		const childTextNodes = textObject.querySelectorAll('tspan');
		expect(childTextNodes).toHaveLength(3);
		const firstChild = childTextNodes[0];

		expect(firstChild.textContent).toBe(secondLineText);
		expect(firstChild.style.transform).toBe('');
		expect(firstChild.style.fontSize).toBe('33px');
		expect(firstChild.getAttribute('x')).toBe('3');
		expect(firstChild.getAttribute('y')).toBe('40');

		// Should not save a fontSize when not necessary (same fill as parent text node)
		const secondChild = childTextNodes[1];
		expect(secondChild.style.fontSize ?? '').toBe('');

		// Should not save additional "style" attributes when not necessary
		// TODO: Uncomment before some future major version release. Currently a "fill" is set for every
		//  tspan to work around a loading bug.
		//expect(secondChild.outerHTML).toBe(`<tspan x="0" y="72">${thirdLineText}</tspan>`);
	});

	it('should preserve group elements', async () => {
		const editor = createEditor();
		await editor.loadFrom(SVGLoader.fromString(`
			<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
				<style id="js-draw-style-sheet">
					path {
						stroke-linecap:round;
						stroke-linejoin:round;
					}
				</style>
				<g id='main-group'>
					<g id='sub-group-1'>
						<path d='M0,0 L10,10 0,10' fill='#f00'/>
						<path d='M20,0 L10,10 0,10'/>
					</g>
					<g id='empty-group-2'></g>
				</g>
				<g id='empty-group-3'></g>

				<!-- Groups without IDs should also be preserved -->
				<g><g><g id='marker-1'></g></g></g>
				<g class='test'><g id='marker-2'/></g>

				<!-- Groups with duplicate IDs should preserved (though IDs)
					may be changed -->
				<g id='empty-group-2'/>
				<g id='empty-group-2'><g id='empty-group-2'/></g>
			</svg>
		`));

		// Both paths should exist.
		expect(
			editor.image
				.getElementsIntersectingRegion(new Rect2(-10, -10, 100, 100))
				.filter(elem => elem instanceof StrokeComponent)
		).toHaveLength(2);

		const outputSVG = editor.toSVG();

		// Should still have the expected number of groups
		expect(outputSVG.querySelectorAll('g')).toHaveLength(12);

		// Should preserve the empty group.
		expect(outputSVG.querySelectorAll('g#empty-group-2')).toHaveLength(1);

		// The empty group should still have the correct parent
		expect(outputSVG.querySelectorAll('g#main-group > g#empty-group-2')).toHaveLength(1);

		// Paths should still be children of sub-group-1
		expect(outputSVG.querySelectorAll('g#sub-group-1 > path')).toHaveLength(2);

		// sub-group-1 should have the correct parent
		expect(outputSVG.querySelectorAll('g#main-group > g#sub-group-1')).toHaveLength(1);

		// And these should be the only paths.
		expect(outputSVG.querySelectorAll('path')).toHaveLength(2);

		// Should also preserve groups without IDs
		// Selector ref: https://stackoverflow.com/a/18607777
		expect(outputSVG.querySelectorAll('svg > g > g > g#marker-1')).toHaveLength(1);
		expect(outputSVG.querySelectorAll('svg > g > g#marker-2')).toHaveLength(1);

		// Should preserve class names on `g` objects:
		expect(outputSVG.querySelectorAll('svg > g.test > g#marker-2')).toHaveLength(1);

		// Should preserve groups that had duplicate IDs
		expect(outputSVG.querySelectorAll('svg > g#empty-group-2--1')).toHaveLength(1);
		expect(outputSVG.querySelectorAll('svg > g#empty-group-2--2')).toHaveLength(1);
		expect(outputSVG.querySelectorAll('svg > g#empty-group-2--2 > g#empty-group-2--3')).toHaveLength(1);
	});

	describe('should not preserve group elements when doing so would change the z order', () => {
		it('in an image with few items', async () => {
			const editor = createEditor();
			await editor.loadFrom(SVGLoader.fromString(`
				<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
					<g id='main-group-1'>
						<path d='M0,0 L-10,10 0,10' fill='#f00'/>
						<path d='M20,0 L10,10 0,10'/>
					</g>
					<path d='M40,40 l10,10 0,10'/>
				</svg>
			`));

			// All paths should exist.
			expect(
				editor.image
					.getElementsIntersectingRegion(new Rect2(-10, -10, 100, 100))
					.filter(elem => elem instanceof StrokeComponent)
			).toHaveLength(3);

			// Before modifying, both paths should be within the main-group-1 group
			expect(editor.toSVG().querySelectorAll('svg > g#main-group-1 > path')).toHaveLength(2);

			const selectionTool = editor.toolController.getMatchingTools(SelectionTool)[0];
			selectionTool.setEnabled(true);

			// Select the bottommost stroke
			sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(-11, 9));
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(-9, 10));
			sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(-9, 10));

			// The stroke should be selected
			expect(selectionTool.getSelectedObjects()).toHaveLength(1);
			expect(selectionTool.getSelectedObjects()[0].getBBox())
				.objEq(new Rect2(-10, 0, 10, 10));

			// Drag the selection (moves the selected item to the top)
			sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(-11, 9));
			sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(0, 0));
			sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(0, 0));

			expect(selectionTool.getSelectedObjects()[0].getBBox())
				.not.objEq(new Rect2(-10, 0, 10, 10));
			selectionTool.setEnabled(false);

			// One of the items should have been moved out of the main group
			const outputSVG = editor.toSVG();
			expect(outputSVG.querySelectorAll('svg > path')).toHaveLength(2);
			expect(outputSVG.querySelectorAll('svg > g#main-group-1 > path')).toHaveLength(1);
		});

		it('in an image with many items in nested groups', async () => {
			const editor = createEditor();
			await editor.loadFrom(SVGLoader.fromString(`
				<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
					<path d='M-100,-100 l 2,2 0,2'/>
					<g id='group-1'>
						<path d='M0,0 L-10,10 0,10' fill='#f00'/>
						<path d='M20,0 L10,10 0,10'/>

						<g id='group-2'>
							<path d='M100,100 l 2,2 0,2'/>
						</g>
					</g>
					<path d='M40,40 l10,10 0,10'/>
				</svg>
			`));

			// .expects that all paths have their original parent groups.
			const expectGroupParentsToBeOriginal = () => {
				expect(
					editor.image
						.getAllElements()
						.filter(elem => elem instanceof StrokeComponent)
				).toHaveLength(5);

				const output = editor.toSVG();
				expect(
					output.querySelectorAll('svg > g#group-1 path')
				).toHaveLength(3);
				expect(
					output.querySelectorAll('svg > g#group-1 > g > path')
				).toHaveLength(1);
			};

			expectGroupParentsToBeOriginal();

			const nudgePathNear = async (pos: Vec2) => {
				const targetElems = editor.image.getElementsIntersectingRegion(Rect2.bboxOf([ pos ], 5));

				expect(targetElems).toHaveLength(1);

				// Move the path to the top
				const target = targetElems[0];
				await editor.dispatch(target.transformBy(Mat33.scaling2D(1.01)));
			};

			// Moving a path that's below all groups should not change group parentings.
			nudgePathNear(Vec2.of(-100, -100));
			expectGroupParentsToBeOriginal();

			// Moving a path that's within nested groups should move the path out of that group.
			nudgePathNear(Vec2.of(100, 100));

			const outputSVG = editor.toSVG();
			expect(outputSVG.querySelectorAll('svg > path')).toHaveLength(3);
			expect(outputSVG.querySelectorAll('svg > g#group-1 > path')).toHaveLength(2);
			expect(outputSVG.querySelectorAll('svg > g#group-1 > g')).toHaveLength(1);
			expect(outputSVG.querySelectorAll('svg > g#group-1 > g > *')).toHaveLength(0);
		});
	});

	it('should preserve unknown SVG objects', async () => {
		const editor = createEditor();
		await editor.loadFrom(SVGLoader.fromString(`
			<svg viewBox="0 0 500 500" width="500" height="500" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg">
				<path d='M10,10 L20,10 L10,40'/>
				<some-elem some-attr='foo'/>
				<path d='M40,40 l10,10 0,10'/>
			</svg>
		`, {
			// Keep unknown elements
			sanitize: false,

			// Don't warn on unknown elements
			disableUnknownObjectWarnings: true,
		}));

		const asSVG = editor.toSVG();

		expect(asSVG.querySelectorAll('svg > some-elem')).toHaveLength(1);
		expect(asSVG.querySelectorAll('svg > path')).toHaveLength(2);
		expect(asSVG.querySelector('svg > some-elem')?.getAttribute('some-attr')).toBe('foo');
	});

	describe('should increase SVG size if minDimension is greater than the image size', () => {
		it('...with the same width/height', () => {
			const editor = createEditor();
			editor.dispatch(editor.setImportExportRect(new Rect2(10, 10, 20, 20)));

			// No option: Don't change the width/height
			let asSVG = editor.toSVG();
			expect(asSVG.getAttribute('width')).toBe('20');
			expect(asSVG.getAttribute('height')).toBe('20');

			asSVG = editor.toSVG({ minDimension: 100 });
			expect(asSVG.getAttribute('width')).toBe('100');
			expect(asSVG.getAttribute('height')).toBe('100');

			asSVG = editor.toSVG({ minDimension: 30 });
			expect(asSVG.getAttribute('width')).toBe('30');
			expect(asSVG.getAttribute('height')).toBe('30');
		});

		it('...with a smaller width', () => {
			const editor = createEditor();
			editor.dispatch(editor.setImportExportRect(new Rect2(0, 0, 10, 20)));

			// Should preserve aspect ratio
			let asSVG = editor.toSVG({ minDimension: 100 });
			expect(asSVG.getAttribute('width')).toBe('100');
			expect(asSVG.getAttribute('height')).toBe('200');

			asSVG = editor.toSVG({ minDimension: 30 });
			expect(asSVG.getAttribute('width')).toBe('30');
			expect(asSVG.getAttribute('height')).toBe('60');
		});

		it('...with a smaller height', () => {
			const editor = createEditor();
			editor.dispatch(editor.setImportExportRect(new Rect2(0, 0, 20, 10)));

			let asSVG = editor.toSVG({ minDimension: 100 });
			expect(asSVG.getAttribute('width')).toBe('200');
			expect(asSVG.getAttribute('height')).toBe('100');

			asSVG = editor.toSVG({ minDimension: 30 });
			expect(asSVG.getAttribute('width')).toBe('60');
			expect(asSVG.getAttribute('height')).toBe('30');
		});
	});
});

```ts,runnable
import { Editor, RenderingStyle, Erase, Stroke, pathToRenderable } from 'js-draw';
import { Path, Color4, Point2, Vec2, Rect2 } from '@js-draw/math';
const editor = new Editor(document.body);


// //////////////// //
// Helper functions //
// //////////////// //

function addStroke(path: Path, style: RenderingStyle) {
	const stroke = new Stroke([
		pathToRenderable(path, style)
	]);

	// Create a command that adds the stroke to the image
	// (but don't apply it yet).
	const command = editor.image.addComponent(stroke);
	// Actually apply the command.
	editor.dispatch(command);
}

function addBoxAt(point: Point2, color: Color4) {
	// Create a 10x10 square at the given point:
	const box = new Rect2(point.x, point.y, 10, 10);

	addStroke(
		Path.fromRect(box),
		{ fill: color },
	);
}


function makeTrashIcon() {
	const container = document.createElement('div');
	container.textContent = '🗑️';
	return container;
}


// //////////////////// //
// End helper functions //
// //////////////////// //



// Add some components to the image:
addBoxAt(Vec2.of(0, 0), Color4.green);
addBoxAt(Vec2.of(20, 0), Color4.orange);
addBoxAt(Vec2.of(20, 20), Color4.blue);

// Get the components in a small rectangle near (0, 0)
const components = editor.image.getElementsIntersectingRegion(
	new Rect2(0, 0, 5, 5), // a 5x5 square with top left (0, 0)
);


// Add a button that removes the components
const toolbar = editor.addToolbar();
toolbar.addActionButton({
	icon: makeTrashIcon(),
	label: 'remove near (0,0)',
}, () => {
	const deleteCommand = new Erase(components);
	editor.dispatch(deleteCommand);
});

```

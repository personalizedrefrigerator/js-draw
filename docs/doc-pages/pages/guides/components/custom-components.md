---
title: Custom components
---

# Custom components

It's possible to create custom subclasses of {@link js-draw!AbstractComponent | AbstractComponent}. You might do this if, for example, none of the built-in components are sufficient to implement a particular feature.

There are several steps to creating a custom component:

1. Subclass `AbstractComponent`.
2. Implement the `abstract` methods.
   - `description`, `createClone`, `applyTransformation`, `intersects`, and `render`.
3. (Optional) Make it possible to load/save the `AbstractComponent` to SVG.
4. (Optional) Make it possible to serialize/deserialize the component.
   - Component serialization and deserialization is used for collaborative editing.

This guide shows how to create a simple custom component.

## Setup

```ts,runnable
import { Editor } from 'js-draw';
const editor = new Editor(document.body);
editor.addToolbar();
```

## 1. Subclass `AbstractComponent`

We'll start by subclassing `AbstractComponent`. There are a few methods we'll implement:

```ts
const componentId = 'example';
class ImageStatusComponent extends AbstractComponent {
	// The bounding box of the component -- REQUIRED
	// The bounding box should be a rectangle that completely contains the
	// component's content.
	protected contentBBox: Rect2;

	public constructor() {
		super(componentId);
		this.contentBBox = // TODO
	}

	public override render(canvas: AbstractRenderer): void {
		// TODO: Render the component
	}

	public intersects(line: LineSegment2): boolean {
		// TODO: Return true if the component intersects a line
	}

	protected applyTransformation(transformation: Mat33): void {
		// TODO: Move/scale/rotate the component based on `transformation`
	}

	protected createClone(): AbstractComponent {
		// TODO: Return a copy of the component.
	}

	public description(): string {
		// TODO: Describe the component for accessibility tools
	}

	protected serializeToJSON(): string {
		// TODO: Return a JSON string that represents the component state.
		//       Only used for collaborative editing.
	}
}
```

Above,

- `componentId` is a unique identifier for this type of component. It's main use is to support collaborative editing.
- `render` will draw the component to the screen.

The most important of the above methods is arguably `render`.

## 2. Making it render

Let's get started by making the component render something.

```ts,runnable
---use-previous---
---visible---
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import { AbstractRenderer, AbstractComponent } from 'js-draw';

const componentId = 'example';
class ExampleComponent extends AbstractComponent {
	protected contentBBox: Rect2;

	public constructor() {
		super(componentId);

		// For now, create a 50x50 bounding box centered at (0,0).
		// We'll update this later:
		this.contentBBox = new Rect2(0, 0, 50, 50);
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		// Be sure that everything drawn between .startObject and .endObject is within contentBBox.
		// Content outside contentBBox may not be drawn in all cases.
		canvas.startObject(this.contentBBox);

		// _visibleRect is the part of the image that's currently visible. We can
		// ignore it for now.

		canvas.fillRect(this.contentBBox, Color4.red);

		// Ends the object and attaches any additional metadata attached by an image loader
		// (e.g. if this object was created by SVGLoader).
		canvas.endObject(this.getLoadSaveData());
	}

	// Must be implemented by all components, used for things like erasing and selection.
	public intersects(line: LineSegment2) {
		// TODO: For now, our component won't work correctly if the user tries to select it.
		// We'll implement this later.
		return false;
	}

	protected applyTransformation(transformation: Mat33): void {
		// TODO: Eventually, this should move the component. We'll implement this later.
	}

	protected createClone(): AbstractComponent {
		return new ExampleComponent();
	}

	public description(): string {
		// This should be a brief description of the component's content (for
		// accessibility tools)
		return 'a red box';
	}

	protected serializeToJSON() {
		return JSON.stringify({
			// Some data to save (for collaborative editing)
		});
	}
}

// data: The data serialized by serlailzeToJSON
AbstractComponent.registerComponent(componentId, data => {
	// TODO: Deserialize the component from [data]. This is used if collaborative
	// editing is enabled.
	return new ExampleComponent();
});

// Add the component
editor.dispatch(editor.image.addComponent(new ExampleComponent()));
```

Try clicking "run"! Notice that we now have a red box. Since `applyTransformation` and `intersects` aren't implemented, it doesn't work with the selection or eraser tools. We'll implement those methods next.

## 3. Making it selectable

To make it possible for a user to move and resize our `ExampleComponent`, we'll need a bit more state. In particular, we'll add:

- A {@link @js-draw/math!Mat33 | Mat33} that stores the position/rotation of the component.
  - See the {@link @js-draw/math!Mat33 | Mat33} documentation for more information.
- Logic to update `contentBBox` when the component is changed.
  - `contentBBox` is the bounding box of the component. In other words, the component should be entirely within `contentBBox`.
  - As a performance optimization, `js-draw` avoids drawing components that are completely offscreen. `js-draw` determines whether a component is onscreen using `contentBBox`. In incorrect bounding box can result in the component not being drawn.

```ts,runnable
import { Editor } from 'js-draw';
const editor = new Editor(document.body);
editor.addToolbar();
---visible---
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import { AbstractRenderer, AbstractComponent } from 'js-draw';

const componentId = 'example';
class ExampleComponent extends AbstractComponent {
	protected contentBBox: Rect2;

	// NEW: Stores the scale/rotation/position. "Transform" is short for "transformation".
	private transform: Mat33;
	// NEW: Stores the untransformed bounding box of the component. If the component hasn't
	// been moved/scaled yet, initialBBox should completely contain the component's content.
	private initialBBox: Rect2;

	public constructor(transform: Mat33) {
		super(componentId);

		this.transform = transform;
		this.initialBBox = new Rect2(0, 0, 50, 50);
		this.updateBoundingBox();
	}

	// NEW: Updates this.contentBBox. Should be called whenever this.transform changes.
	private updateBoundingBox() {
		this.contentBBox = this.initialBBox.transformedBoundingBox(
			this.transform,
		);
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);

		// Everything between .pushTransform and .popTransform will be scaled/rotated by this.transform.
		// Try removing the .pushTransform and .popTransform lines!
		canvas.pushTransform(this.transform);
		canvas.fillRect(this.initialBBox, Color4.red);
		canvas.popTransform();

		// After the call to .popTransform, this.transform is no longer transforming the canvas.
		// Try uncommenting the following line:
		// canvas.fillRect(this.initialBBox, Color4.orange);
		// What happens when the custom component is selected and moved?
		// What happens to the orange rectangle when the red rectangle is moved offscreen?

		canvas.endObject(this.getLoadSaveData());
	}

	public intersects(line: LineSegment2) {
		// Our component is currently just a rectangle. As such (for some values of this.transform),
		// we can use the Rect2.intersectsLineSegment method here:
		const intersectionCount = this.contentBBox.intersectsLineSegment(line).length;
		return intersectionCount > 0; // What happpens if you always return `true` here?
	}

	protected applyTransformation(transformUpdate: Mat33): void {
		// `.rightMul`, "right matrix multiplication" combines two transformations.
		// The transformation on the left is applied **after** the transformation on the right.
		// As such, `transformUpdate.rightMul(this.transform)` means that `this.transform`
		// will be applied **before** the `transformUpdate`.
		this.transform = transformUpdate.rightMul(this.transform);
		this.updateBoundingBox();
	}

	protected createClone(): AbstractComponent {
		const clone = new ExampleComponent(this.transform);
		return clone;
	}

	public description(): string {
		return 'a red box';
	}

	protected serializeToJSON() {
		return JSON.stringify({
			// TODO: Some data to save (for collaborative editing)
		});
	}
}

// data: The data serialized by serlailzeToJSON
AbstractComponent.registerComponent(componentId, data => {
	// TODO: Deserialize the component from [data]. This is used if collaborative
	// editing is enabled.
	return new ExampleComponent(Mat33.identity);
});

// Add the component
const initialTransform = Mat33.identity;
editor.dispatch(editor.image.addComponent(new ExampleComponent(initialTransform)));
```

After clicking "run", it should be possible to select and move the custom component.

> [!NOTE]
>
> Above, `intersects` is implemented using `this.contentBBox.intersectsLineSegment`. This is incorrect if the component has been rotated. In this case, the bounding box is **not** the same as the rectangle that's drawn onscreen:
>
> <figure>
> <svg viewBox="0 -2 35.6 16.24" height="200" style="max-width: 100%; background: #111;" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"><text style="transform: matrix(0.0511596, 0, 0, 0.0511596, 17.49, 1.27); font-family: monospace; font-size: 32px; fill: rgb(255, 255, 255);">Bounding box</text><path d="M2.75,12.87L3.5,12.13L15.25,12.13L15.25,.37L3.5,.37L3.5,12.13L2.75,12.87L2.75,-.37L16,-.37L16,12.87L2.75,12.87" fill="#ffffff"/><path d="M2.76,7.2L3.72,7.29L7.38,11.63L14.82,5.36L11.16,1.02L3.72,7.29L2.76,7.2L11.24,.06L15.78,5.45L7.3,12.59L2.76,7.2" fill="#ff0000"/><text style="transform: matrix(0.0464052, 0.00393329, -0.00393329, 0.0464052, 16.49, 6.02); font-family: monospace; font-size: 32px; fill: rgb(255, 0, 0);">What's drawn onscreen</text></svg>
> <figcaption>A rotated red box ("what's drawn onscreen") is inside a white box labeled "bounding box"</figcaption>
> </figure>
>
> A more correct implementation might be:
>
> ```ts
> line = line.transformedBy(this.transform.inverse());
> return this.initialBBox.intersectsLineSegment(line).length > 0;
> ```
>
> This "untransforms" the line so that `initialBBox` represents our object, relative to the updated line.

## 4. Loading and saving

Currently, copy-pasting the `ExampleComponent` pastes a `StrokeComponent`. Let's fix that.

**Why does this happen?** `js-draw` copies components as SVG. As a result, to paste our components correctly, we need to add logic to load from SVG. This can be done by creating a {@link js-draw!SVGLoaderPlugin | SVGLoaderPlugin} and including it in the {@link js-draw!EditorSettings | EditorSettings} for a new editor.

A `SVGLoaderPlugin` should contain a single `visit` method that will be called with each node in the image. A simple such plugin might look like this

```ts,runnable
import { Editor, SVGLoaderPlugin, Stroke } from 'js-draw';
import { Color4 } from '@js-draw/math';

let nextX = 0;
const testPlugin: SVGLoaderPlugin = {
	async visit(node, loader) {
		if (node.tagName.toLowerCase() === 'text') {
			const testComponent = Stroke.fromFilled(
				`m${nextX},0 l50,0 l0,50 z`, Color4.red,
			);
			nextX += 100;
			loader.addComponent(testComponent);
			return true;
		}
		// Return false to do the default image loading
		return false;
	}
};

const editor = new Editor(document.body, {
	svg: {
		loaderPlugins: [ testPlugin ],
	}
});
editor.addToolbar();

// With the loader plugin, text objects are converted to red triangles.
editor.loadFromSVG(`
	<svg>
		<text>test</text>
		<text y="50">test 2</text>
		<text y="100">test 3</text>
	</svg>
`);
```

The above example loads the `text` objects as triangles.

Let's create a version that loads our custom component:

```ts
const plugin: SVGLoaderPlugin = {
	async visit(node, loader) {
		if (node.classList.contains('comp--example-component')) {
			const transform = // TODO: Get transform from the `node`.
			const customComponent = new ExampleComponent(transform);
			loader.addComponent(customComponent);
			return true;
		}
		// Return false to do the default image loading
		return false;
	},
};
```

...and update our custom component to attach the correct information while saving:

```ts
class ExampleComponent extends AbstractComponent {
	// ...

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);

		canvas.pushTransform(this.transform);
		canvas.fillRect(this.initialBBox, Color4.red);
		canvas.popTransform();

		// The containerClassNames argument, when rendering to an SVG, wraps our component
		// in a <g class="..."> with the provided class names.
		const containerClassNames = ['comp--example-component'];
		canvas.endObject(this.getLoadSaveData(), containerClassNames);
	}

	// ...
}
```

All together,

```ts,runnable
import { Editor } from 'js-draw';
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import { AbstractRenderer, AbstractComponent } from 'js-draw';

const componentId = 'example';
class ExampleComponent extends AbstractComponent {
	protected contentBBox: Rect2;

	private transform: Mat33;
	private initialBBox: Rect2;

	public constructor(transform: Mat33) {
		super(componentId);

		this.transform = transform;
		this.initialBBox = new Rect2(0, 0, 50, 50);
		this.updateBoundingBox();
	}

	private updateBoundingBox() {
		this.contentBBox = this.initialBBox.transformedBoundingBox(
			this.transform,
		);
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);

		canvas.pushTransform(this.transform);
		canvas.fillRect(this.initialBBox, Color4.red);
		canvas.popTransform();

		const containerClassNames = ['comp--example-component'];
		canvas.endObject(this.getLoadSaveData(), containerClassNames);
	}

	public intersects(line: LineSegment2) {
		// Our component is currently just a rectangle. As such (for some values of this.transform),
		// we can use the Rect2.intersectsLineSegment method here:
		const intersectionCount = this.contentBBox.intersectsLineSegment(line).length;
		return intersectionCount > 0; // What happpens if you always return `true` here?
	}

	protected applyTransformation(transformUpdate: Mat33): void {
		// `.rightMul`, "right matrix multiplication" combines two transformations.
		// The transformation on the left is applied **after** the transformation on the right.
		// As such, `transformUpdate.rightMul(this.transform)` means that `this.transform`
		// will be applied **before** the `transformUpdate`.
		this.transform = transformUpdate.rightMul(this.transform);
		this.updateBoundingBox();
	}

	protected createClone(): AbstractComponent {
		const clone = new ExampleComponent(this.transform);
		return clone;
	}

	public description(): string {
		return 'a red box';
	}

	protected serializeToJSON() {
		return JSON.stringify({
			// TODO: Some data to save (for collaborative editing)
		});
	}
}

AbstractComponent.registerComponent(componentId, data => {
	// TODO:
	return new ExampleComponent(Mat33.identity);
});

const plugin: SVGLoaderPlugin = {
	async visit(node, loader) {
		if (node.classList.contains('comp--example-component')) {
			// TODO: Set the transformation matrix correctly -- get this information
			// from the `node`. This isn't too important for copy/paste support.
			const customComponent = new ExampleComponent(Mat33.identity);
			loader.addComponent(customComponent);
			return true;
		}
		// Return false to do the default image loading
		return false;
	},
};

const editor = new Editor(document.body, {
	svg: {
		loaderPlugins: [ plugin ],
	},
});
editor.addToolbar();

// Add the component
const initialTransform = Mat33.identity;
editor.dispatch(editor.image.addComponent(new ExampleComponent(initialTransform)));
```

It should now be possible to copy/paste the custom component, without it becoming a `Stroke`.

## 5. Make it possible to serialize/deserialize for collaborative editing

> [!NOTE]
>
> If you find collaborative editing bugs, please [report them](https://github.com/personalizedrefrigerator/js-draw/issues).

Let's start by setting up two editors that sync commands:

```ts,runnable
import { Editor, invertCommand, SerializableCommand, EditorEventType } from 'js-draw';

const editor1 = new Editor(document.body);
// Store the toolbar in a variable -- we'll use it later
const toolbar = editor1.addToolbar();

const editor2 = new Editor(document.body);
editor2.addToolbar();

const applySerializedCommand = (serializedCommand: any, editor: Editor) => {
	const command = SerializableCommand.deserialize(serializedCommand, editor);
	command.apply(editor);
};

const applyCommandsToOtherEditor = (sourceEditor: Editor, otherEditor: Editor) => {
	sourceEditor.notifier.on(EditorEventType.CommandDone, (evt) => {
		// Type assertion.
		if (evt.kind !== EditorEventType.CommandDone) {
			throw new Error('Incorrect event type');
		}

		if (evt.command instanceof SerializableCommand) {
			const serializedCommand = evt.command.serialize();
			applySerializedCommand(serializedCommand, otherEditor);
		} else {
			console.log('Nonserializable command');
		}
	});
	sourceEditor.notifier.on(EditorEventType.CommandUndone, (evt) => {
		// Type assertion.
		if (evt.kind !== EditorEventType.CommandUndone) {
			throw new Error('Incorrect event type');
		}

		if (evt.command instanceof SerializableCommand) {
			const serializedCommand = invertCommand(evt.command).serialize();
			applySerializedCommand(serializedCommand, otherEditor);
		} else {
			console.log('Nonserializable command');
		}
	});
};

applyCommandsToOtherEditor(editor1, editor2);
applyCommandsToOtherEditor(editor2, editor1);
```

Next, we'll take our component from before, except implement `serializeToJSON` and the deserialize callback in `registerComponent`:

```ts,runnable
---use-previous---
import { Editor } from 'js-draw';
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import { AbstractRenderer, AbstractComponent } from 'js-draw';

const componentId = 'example';
class ExampleComponent extends AbstractComponent {
	protected contentBBox: Rect2;

	private transform: Mat33;
	private initialBBox: Rect2;

	public constructor(transform: Mat33) {
		super(componentId);

		this.transform = transform;
		this.initialBBox = new Rect2(0, 0, 50, 50);
		this.updateBoundingBox();
	}

	private updateBoundingBox() {
		this.contentBBox = this.initialBBox.transformedBoundingBox(
			this.transform,
		);
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);

		canvas.pushTransform(this.transform);
		canvas.fillRect(this.initialBBox, Color4.red);
		canvas.popTransform();

		const containerClassNames = ['comp--example-component'];
		canvas.endObject(this.getLoadSaveData(), containerClassNames);
	}

	public intersects(line: LineSegment2) {
		// Our component is currently just a rectangle. As such (for some values of this.transform),
		// we can use the Rect2.intersectsLineSegment method here:
		const intersectionCount = this.contentBBox.intersectsLineSegment(line).length;
		return intersectionCount > 0; // What happpens if you always return `true` here?
	}

	protected applyTransformation(transformUpdate: Mat33): void {
		// `.rightMul`, "right matrix multiplication" combines two transformations.
		// The transformation on the left is applied **after** the transformation on the right.
		// As such, `transformUpdate.rightMul(this.transform)` means that `this.transform`
		// will be applied **before** the `transformUpdate`.
		this.transform = transformUpdate.rightMul(this.transform);
		this.updateBoundingBox();
	}

	protected createClone(): AbstractComponent {
		const clone = new ExampleComponent(this.transform);
		return clone;
	}

	public description(): string {
		return 'a red box';
	}

---visible---
	// ...other component logic...

	protected serializeToJSON() {
		return JSON.stringify({
			// NEW: Save the transform matrix:
			transform: this.transform.toArray(),
		});
	}
}

AbstractComponent.registerComponent(componentId, data => {
	const transformArray = JSON.parse(data).transform;

	// NEW: Validation
	if (!Array.isArray(transformArray)) {
		throw new Error('data.transform must be an array');
	}
	for (const entry of transformArray) {
		if (!isFinite(entry)) {
			throw new Error(`Non-finite entry in transform: ${entry}`);
		}
	}

	// NEW: Create and return the component from the data
	const transform = new Mat33(...transformArray);
	return new ExampleComponent(transform);
});

// Make a button that adds the component
function makeAddIcon() {
	const container = document.createElement('div');
	container.textContent = '+';
	return container;
}

toolbar.addActionButton({
	icon: makeAddIcon(),
	label: 'Add test component',
}, () => {
	const initialTransform = Mat33.identity;
	const component = new ExampleComponent(initialTransform);

	// The addAndCenterComponents method automatically selects,
	// centers, and adds the provided components to the editor.
	//
	// We could also add the component using
	// editor.dispatch(editor.image.addComponent(component));
	editor1.addAndCenterComponents([
		component
	]);
});
```

Above, clicking the "+" button should add the component to both editors.

## More advanced rendering

If you find that the {@link js-draw!AbstractRenderer | AbstractRenderer}'s built-in methods are insufficient, it's possible to directly access the [`RenderingContext2D`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) or [`SVGElement`](https://developer.mozilla.org/en-US/docs/Web/API/SVGElement) used by the renderer. See {@link js-draw!CanvasRenderer.drawWithRawRenderingContext | drawWithRawRenderingContext} and {@link js-draw!SVGRenderer.drawWithSVGParent | drawWithSVGParent} for details.

> [!NOTE]
>
> Where possible, try to use the `AbstractRenderer`-provided methods. Doing so can help keep your logic compatible with future renderer types.

Let's see an example that has SVG-specific and Canvas-specific rendering logic:

```ts,runnable
import { Editor, CanvasRenderer, SVGRenderer } from 'js-draw';
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import { AbstractRenderer, AbstractComponent } from 'js-draw';

const componentId = 'example';
class ExampleComponent extends AbstractComponent {
	protected contentBBox: Rect2;

	private transform: Mat33;
	private initialBBox: Rect2;

	public constructor(transform: Mat33) {
		super(componentId);

		this.transform = transform;
		this.initialBBox = new Rect2(0, 0, 50, 50);
		this.updateBoundingBox();
	}

	private updateBoundingBox() {
		this.contentBBox = this.initialBBox.transformedBoundingBox(
			this.transform,
		);
	}

	public override render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);

		canvas.pushTransform(this.transform);
		if (canvas instanceof CanvasRenderer) {
			canvas.drawWithRawRenderingContext(ctx => {
				ctx.strokeStyle = 'green';

				// Draw a large number of rectangles
				const rectSize = 20;
				const maximumX = this.initialBBox.width - rectSize;
				for (let x = 0; x < maximumX; x += 2) {
					ctx.strokeRect(x, 0, rectSize, rectSize);
				}
			});
		} else if (canvas instanceof SVGRenderer) {
			canvas.drawWithSVGParent(parent => {
				// Draw some text. Note that this can also
				// be done with canvas.drawText
				const text = document.createElementNS(
					'http://www.w3.org/2000/svg', 'text',
				);

				text.textContent = 'Text in an SVG element!';
				text.setAttribute('x', '50');
				text.setAttribute('y', '25');
				text.style.fill = 'red';

				parent.appendChild(text);
			});
		} else {
			// Fallback for other renderers
			canvas.fillRect(this.initialBBox, Color4.red);
		}
		canvas.popTransform();

		const containerClassNames = ['comp--example-component'];
		canvas.endObject(this.getLoadSaveData(), containerClassNames);
	}

	public intersects(line: LineSegment2) {
		return false; // TODO (see above sections for implementation)
	}

	protected applyTransformation(transformUpdate: Mat33): void {
		this.transform = transformUpdate.rightMul(this.transform);
		this.updateBoundingBox();
	}

	protected createClone(): AbstractComponent {
		const clone = new ExampleComponent(this.transform);
		return clone;
	}

	public description(): string {
		return 'a red box'; // TODO (see examples above)
	}

	protected serializeToJSON() {
		return JSON.stringify({
			// TODO: Some data to save (for collaborative editing)
		});
	}
}

AbstractComponent.registerComponent(componentId, data => {
	// TODO: See above examples for how to implement this
	// Needed for collaborative editing
	throw new Error('Not implemented');
});

const editor = new Editor(document.body);
editor.addToolbar();

// Add the component
const initialTransform = Mat33.identity;
editor.dispatch(editor.image.addComponent(new ExampleComponent(initialTransform)));

// Preview the SVG output
document.body.appendChild(editor.toSVG());
```

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

This guide shows how to create a custom `ImageStatus` component that shows information about the current content of the image.

## Setup

```ts,runnable
import { Editor } from 'js-draw';
const editor = new Editor(document.body);
editor.addToolbar();
```

## 1. Subclass `AbstractComponent`

We'll start by subclassing `AbstractComponent`. There are a few methods we'll implement:

```ts
const componentId = 'image-info';
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

	protected intersects(line: LineSegment2): boolean {
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

const componentId = 'image-info';
class ImageInfoComponent extends AbstractComponent {
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
	protected intersects(line: LineSegment2) {
		// TODO: For now, our component won't work correctly if the user tries to select it.
		// We'll implement this later.
		return false;
	}

	protected applyTransformation(transformation: Mat33): void {
		// TODO: Eventually, this should move the component. We'll implement this later.
	}

	protected createClone(): AbstractComponent {
		return new ImageInfoComponent();
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
	return new ImageInfoComponent();
});

// Add the component
editor.dispatch(editor.image.addComponent(new ImageInfoComponent()));
```

Try clicking "run"! Notice that we now have a red box. Since `applyTransformation` and `intersects` aren't implemented, it doesn't work with the selection or eraser tools. We'll implement those methods next.

## 3. Making it selectable

To make it possible for a user to move and resize our `ImageInfoComponent`, we'll need a bit more state. In particular, we'll add:

- A {@link @js-draw/math!Mat33 | Mat33} that stores the position/rotation of the component.
  - See the {@link @js-draw/math!Mat33 | Mat33} documentation for more information.
- Logic to update `contentBBox` when the component is changed. As a performance optimization, `js-draw` avoids drawing components that are completely offscreen. `js-draw` determines whether a component is onscreen using `contentBBox`.

```ts,runnable
import { Editor } from 'js-draw';
const editor = new Editor(document.body);
editor.addToolbar();
---visible---
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import { AbstractRenderer, AbstractComponent } from 'js-draw';

const componentId = 'image-info';
class ImageInfoComponent extends AbstractComponent {
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

	protected intersects(line: LineSegment2) {
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
		const clone = new ImageInfoComponent(this.transform);
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
	return new ImageInfoComponent(Mat33.identity);
});

// Add the component
const initialTransform = Mat33.identity;
editor.dispatch(editor.image.addComponent(new ImageInfoComponent(initialTransform)));
```

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

**To-do**

## 5. Changing what it renders

**To-do**

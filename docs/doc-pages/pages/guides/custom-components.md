---
title: Custom components
---

# Custom components

It's possible to create custom subclasses of {@link js-draw!AbstractComponent | AbstractComponent}. This guide shows how to create a custom `ImageStatus` component that shows information about the current content of the image.

## 1. Setup

```ts,runnable
import { Editor, AbstractComponent } from 'js-draw';
const editor = new Editor(document.body);
```

## 2. Subclass `AbstractComponent`

```ts,runnable
---use-previous---
---visible---
import { LineSegment2, Mat33, Rect2, Color4 } from '@js-draw/math';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';

const componentId = 'image-info';
export default class ImageInfoComponent extends AbstractComponent {
	// The bounding box of the component -- REQUIRED
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

		canvas.drawRect(this.contentBBox, 3, { fill: Color4.red });

		// Ends the object and attaches any additional metadata attached by an image loader
		// (e.g. if this object was created by SVGLoader).
		canvas.endObject(this.getLoadSaveData());
	}

	// Must be implemented by all components, used for things like erasing and selection.
	protected intersects(line: LineSegment2) {
		// For now, return true if the line intersects the bounding box.
		const intersectionCount = this.contentBBox.intersectsLineSegment(line).length;
		return intersectionCount > 0;
	}

	protected applyTransformation(transformation: Mat33): void {
		this.contentBBox = this.contentBBox.transformedBoundingBox(transformation);
	}

	protected createClone(): AbstractComponent {
		const clone = new ImageInfoComponent();
		// Set the clone's initial position to the same place as this.
		// For now, we use contentBBox for position information.
		clone.contentBBox = this.contentBBox;
		return clone;
	}

	public description(): string {
		return 'some description here (for accessibility tools)';
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

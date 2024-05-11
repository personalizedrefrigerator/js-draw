# Customizing existing tools

## Changing which tools are in the toolbar

Let's say that I want to change the default pen type and color for the second pen.

There are a few ways to do this, some more fragile than others. All use `editor.toolController` to access and modify the available tools.

### Method 1: Get the second pen tool and modify it

This method uses `ToolController.getMatchingTools` with a type of `PenTool`, then uses methods like `PenTool.setThickness` to change the default properties of the tool:

```ts,runnable
import {
	Editor, PenTool, Color4
} from 'js-draw';
import 'js-draw/styles';
const editor = new Editor(document.body, {
	wheelEventsEnabled: 'only-if-focused',
});

// The toolbar can be added either before or after changing the tool.
editor.addToolbar();

// Get all tools of type PenTool (we could also do this with an EraserTool).
const penTools = editor.toolController.getMatchingTools(PenTool);

// Get the second pen tool (somewhat fragile -- js-draw might change
// the default toolbar configuration in a future major release).
const secondPen = penTools[1];

secondPen.setThickness(200);
secondPen.setColor(Color4.red);
```

This method is a bit fragile. Let's say that a future release of `js-draw` only has one pen tool. In this case, there will be no second pen tool to fetch from the toolbar. A change like this should only happen between major versions (e.g. from `2.x.x` to `3.x.x`).

### Method 2: Use a custom set of default tools

This method creates new tools and adds them to the list of default tools. Be sure to do this before initializing the toolbar — most toolbar widgets are created based on the presence/absence of tools in the `ToolController`.

```ts,runnable
import {
	Editor, PenTool, Color4, makeOutlinedCircleBuilder,
} from 'js-draw';
import 'js-draw/styles';
const editor = new Editor(document.body, {
	wheelEventsEnabled: 'only-if-focused',
});

const toolController = editor.toolController;

const originalPenTools = toolController.getMatchingTools(PenTool);

// Add a new pen after the existing
const penStyle: PenStyle = {
	color: Color4.red,
	// Draw circles by default
	factory: makeOutlinedCircleBuilder,
	thickness: 4,
};

const newPen = new PenTool(editor, 'My custom pen', penStyle);

// Add after the first pre-existing pen tool
toolController.insertToolsAfter(originalPenTools[0], [ newPen ]);

// Remove the previous pen tools
toolController.removeAndDestroyTools(originalPenTools);

// Make the new pen a primary tool -- it disables other primary tools
// when the user first enables it (like the default eraser/text tool/pens)
toolController.addPrimaryTool(newPen);

// Must be done after changing the tools:
editor.addToolbar();
```

## Adding a new pen type

To add a custom pen type that can be selected using the toolbar, use the `pen` setting.

For example, to enable the polyline pen,

```ts,runnable
import { Editor, makePolylineBuilder } from 'js-draw';

const editor = new Editor(document.body, {
	pens: {
		additionalPenTypes: [{
			name: 'Polyline pen',
			id: 'custom-polyline',
			factory: makePolylineBuilder,

			// The pen doesn't create fixed shapes (e.g. squares, rectangles, etc)
			// and so should go under the "pens" section.
			isShapeBuilder: false,
		}],
	},
});
editor.addToolbar();
```

We could then make it the default pen style for the first pen:

```ts,runnable
---use-previous---
---visible---
import { PenTool } from 'js-draw';

const firstPen = editor.toolController.getMatchingTools(PenTool)[0];
firstPen.setStrokeFactory(makePolylineBuilder);
```

### Custom pens

It's also possible to create custom pens.

To create a custom pen type, create a class that implements `ComponentBuilder`. For example, to create a pen that draws wavy lines,

```ts,runnable
import {
	pathToRenderable, Path, Stroke, ComponentBuilderFactory, Point2, Vec2, Rect2, Color4, Viewport, StrokeDataPoint, RenderingStyle, PathCommandType, ComponentBuilder, AbstractRenderer
} from 'js-draw';


///
/// The custom ComponentBuilder
///
/// This class handles conversion between input data (for example, as generated
/// by a mouse) and AbstractComponents that will be added to the drawing.
///

class CustomBuilder implements ComponentBuilder {
	private path: Path;
	private renderingStyle: RenderingStyle;
	private lastPoint: Point2;

	public constructor(
		startPoint: StrokeDataPoint,

		// We'll use sizeOfScreenPixelOnCanvas later, to round points
		// based on the current zoom level.
		private sizeOfScreenPixelOnCanvas: number
	) {
		// Round points based on the current zoom to prevent the saved SVG
		// from having large decimals.
		const startPosition = this.roundPoint(startPoint.pos);

		// Initially, just a point:
		this.path = new Path(startPosition, []);

		this.renderingStyle = {
			// No fill
			fill: Color4.transparent,

			stroke: {
				color: startPoint.color,

				// For now, the custom pen has a constant width based on the first
				// point.
				width: startPoint.width,
			},
		};

		this.lastPoint = startPosition;
	}

	// Returns the bounding box of the stroke drawn so far. This box should contain
	// all points in the stroke.
	public getBBox(): Rect2 {
		return this.path.bbox;
	}

	// Called to build the final version of the stroke.
	public build(): Stroke {
		return new Stroke([ pathToRenderable(this.path, this.renderingStyle) ]);
	}

	// Called while building the stroke. This is separate from .build() to
	// allow for greater efficiency (.build creates the final version, .preview
	// can be a fast preview).
	public preview(renderer: AbstractRenderer) {
		// For simplicity, use the same final shape as the preview.
		const stroke = this.build();
		stroke.render(renderer);
	}

	private roundPoint(point: Point2): Point2 {
		// Because js-draw supports a very large zoom range, we round differently
		// at different zoom levels. sizeOfScreenPixelOnCanvas is based on the current zoom level.
		return Viewport.roundPoint(point, this.sizeOfScreenPixelOnCanvas);
	}

	// .addPoint is called when a new point of input data has been received.
	// newPoint contains color, pressure, and position information.
	public addPoint(newPoint: StrokeDataPoint) {
		// Create a new point based on the input data, plus some randomness!
		const size = newPoint.width * 4;
		const newPos = newPoint.pos.plus(
			Vec2.of(Math.random() * size - size/2, Math.random() * size - size/2)
		);

		// Round the point to prevent long decimal values when saving to SVG.
		const roundedPoint = this.roundPoint(newPos);

		this.path = new Path(this.path.startPoint, [
			...this.path.parts,
			{
				kind: PathCommandType.LineTo,
				point: roundedPoint,
			},
		]);
	}
}

///
/// The custom ComponentBuilderFactory
///


// A ComponentBuilderFactory is responsible for creating instances of a
// ComponentBuilder. It's what we'll provide to js-draw.
export const makeCustomBuilder: ComponentBuilderFactory =
	(initialPoint: StrokeDataPoint, viewport: Viewport) => {
		const sizeOfScreenPixelOnCanvas = viewport.getSizeOfPixelOnCanvas();
		return new CustomBuilder(initialPoint, sizeOfScreenPixelOnCanvas);
	};


///
/// The editor
///

import { Editor } from 'js-draw';

const editor = new Editor(document.body, {
	pens: {
		additionalPenTypes: [{
			name: 'Wavy pen',
			id: 'wavy-lines',
			factory: makeCustomBuilder,

			// Put under the "pens" section.
			isShapeBuilder: false,
		}],
	},
});

editor.addToolbar();

///
/// Select our custom pen by default.
///

import { PenTool } from 'js-draw';

const firstPen = editor.toolController.getMatchingTools(PenTool)[0];
firstPen.setStrokeFactory(makeCustomBuilder);

```

After running the example above, it should be possible to select a "Wavy pen" from the pen menu.

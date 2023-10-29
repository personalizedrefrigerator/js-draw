
# Customizing existing tools

Let's say that I want to change the default pen type and color for the second pen.

There are a few ways to do this, some more fragile than others. All use `editor.toolController` to access and modify the available tools.

## Method 1: Get the second pen tool and modify it

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

## Method 2: Use a custom set of default tools

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
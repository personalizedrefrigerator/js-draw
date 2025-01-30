---
title: Adding and modifying components
---

# Adding and modifying components

Images in `js-draw` are made up of images, text, strokes, and other components. Each is represented by a subclass of {@link js-draw!AbstractComponent | AbstractComponent}.

## Adding a stroke to the editor

Let's see how to add a stroke to an editor. Here's a few of the APIs we'll use:

- {@link js-draw!Editor.image | editor.image}: Data structure that stores information about the image currently shown in the editor.
- {@link js-draw!Stroke | Stroke}: A component that renders as a stroke.
- {@link js-draw!Editor.dispatch | editor.dispatch}: Applies commands in a way that can be undone/redone.

```ts,runnable
import {
	Editor, EditorImage, Stroke, Path, Color4,
} from 'js-draw';

// 1.
const editor = new Editor(document.body);
editor.addToolbar();

// Create path data that we'll use to make the stroke.
const path = Path.fromString('m0,0 l0,40 l40,4 l0,-48 z');

// 2.
const stroke = Stroke.fromFilled(
	path, Color4.red,
);

// 3.
const command = editor.image.addComponent(stroke);

// 4.
editor.dispatch(command);
```

Above:

1. A new `Editor` is created and added to the document.
2. A stroke with a red fill is created. The shape of the stroke is determined by `path`. For information about how to specify paths, see [the MDN documentation on `<path>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path) elements.
3. A {@link js-draw!Command | Command} is created that will add the component to the editor. The command doesn't do anything until `4.`.
4. The command is applied to the editor.
   - `editor.dispatch` adds the command to the undo history and announces it for accessibility tools. Try replacing `editor.dispatch(command)` with `command.apply(editor)`. What's the difference?

## Adding a large number of strokes to the editor

Next, we'll create a large number of strokes

```ts,runnable
import {
	Editor, EditorImage, Stroke, Path, Color4, uniteCommands,
} from 'js-draw';

const editor = new Editor(document.body);
editor.addToolbar();

// 1.
const commands = [];
for (let x = 0; x < 100; x += 10) {
	for (let y = 0; y < 100; y += 10) {
		// 2. Try changing these!
		const strokeWidth = 3;
		const strokeColor = Color4.orange;

		// 3.
		const stroke = Stroke.fromStroked(
			// A path that starts at (i,i) then moves three units to the right
			`m${x},${y} l3,0`,
			{ width: strokeWidth, color: strokeColor },
		);
		const command = editor.image.addComponent(stroke);
		commands.push(command);
	}
}

// 4.
const compoundCommand = uniteCommands(commands);
editor.dispatch(compoundCommand);
```

Above:

1. We create a list of commands.
2. **Stroke style**: Try changing this:
   - Replace `Color4.orange` with `Color4.ofRGBA(x / 100, 0, y / 100, 1)`.
   - Replace `strokeWidth = 3` with `strokeWidth = 10`.
3. The stroke is created from an [SVG-style path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path) and a style.
4. The stroke commands are combined into one command and applied.
   - Try moving the `editor.dispatch` into the `for` loop and dispatching the commands one-by-one. Does this change what the undo and redo buttons do? See {@link js-draw!uniteCommands | uniteCommands} for more information.

## Finding strokes in an image

Let's start with the previous example and see how to:

1. Get all strokes in part of the editor.
2. Change the color of the strokes in that region.

```ts,runnable
---use-previous---
---visible---
// This example starts by running the code from the previous example --
// make sure the previous example compiles!
import { Rect2 } from 'js-draw';

// 1.
const components = editor.image.getComponentsIntersecting(
	new Rect2( // a 2D rectangle
		5, // x
		6, // y
		60, // width
		30, // height
	)
);

// 2.
const styleCommands = [];
for (const component of components) {
	// Only process Strokes -- there **are** other types of components.
	if (!(component instanceof Stroke)) continue;

	const command = component.updateStyle({ color: Color4.red });
	styleCommands.push(command);
}
// 3.
editor.dispatch(uniteCommands(styleCommands));
```

Above:

1. **Strokes are found**: All components in a rectangle are stored in `components`.
   - Try changing the bounds of the rectangle!
2. **Commands are created**: Each command changes the color of a `Stroke`.
3. **Changes are applied**: The color change is applied to the editor.

Instead of `component.updateStyle`, we could have changed the component in some other way. For example, replacing the `component.updateStyle(...)` with `component.transformBy`,

```ts,runnable
---use-previous---
---visible---
// This example starts by running the code from the previous example --
// make sure the previous example compiles!
import { Mat33, Vec2 } from 'js-draw';

const transformCommands = [];
for (const component of components) {
	const command = component.transformBy(
		Mat33.translation(Vec2.of(45, 0))
	);
	transformCommands.push(command);
}
editor.dispatch(uniteCommands(transformCommands));
```

See {@link @js-draw/math!Mat33 | Mat33} for more transformation types.

## Erasing strokes

The {@link js-draw!Erase | Erase} command can be used to remove components from the image:

```ts,runnable
---use-previous---
---visible---
// This example starts by running the code from the previous example --
// make sure the previous example compiles!
import { Erase } from 'js-draw';

// Deletes all components found in the previous steps
const eraseCommand = new Erase(components);
editor.dispatch(eraseCommand);
```

Try replacing {@link js-draw!Editor.dispatch | editor.dispatch(eraseCommand)} with `eraseCommand.apply(editor)`. What's the effect on the undo/redo behavior?

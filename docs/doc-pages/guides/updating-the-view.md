---
title: Updating the viewport
category: Guides
---

# Updating the editor's viewport

This guide demonstrates changing which part of an image is visible in an {@link js-draw!Editor | Editor}.

Related APIs:

- {@link js-draw!Viewport.transformBy | Viewport.transformBy}: Creates a `Command` that moves/zooms/rotates the viewport.
- {@link js-draw!Editor.dispatch | Editor.dispatch}: Applies a `Command`.
- {@link @js-draw/math!Mat33 | Mat33}: Can be used to tell `Viewport.transformBy` **how** to move/scale/rotate.
  - For example, `Mat33.scaling2D(2)` zooms in by a factor of 2.

## Example: Zooming out

For example, to zoom out by a factor of 4,

```ts,runnable
import { Editor, Viewport, Mat33 } from 'js-draw';
const editor = new Editor(document.body); // 1
editor.addToolbar();

const command = Viewport.transformBy(Mat33.scaling2D(1/4)); // 2
editor.dispatch(command); // 3
```

Above:

1. An editor is created using the {@link js-draw!Editor | Editor} constructor and added to `document.body`.
2. A `transformBy` command is created. In this case, the command scales the viewport by a factor of 4.
   - Try replacing `1/4` with `1/2`. This should zoom out by a factor of 2.
   - Try replacing `1/4` with `4`. This should **zoom in** by a factor of 4.
   - Try replacing {@link @js-draw/math!Mat33.scaling2D | Mat33.scaling2D} with {@link @js-draw/math!Mat33.zRotation | Mat33.zRotation}!
3. The viewport is updated by applying `command` to the editor.
   - Many types of editor changes are applied with {@link js-draw!Editor.dispatch | Editor.dispatch}. This allows these actions to be **undone** using the undo button. Try pressing the undo button in the example above! Notice that the `transformBy` command is unapplied.

In the example above, pressing "undo" unapplies the zoom command. There are at least two ways to prevent this:

1. Replacing `editor.dispatch(command)` with `command.apply(editor)`.
   - **Warning**: This will _not_ announce that `command` was done for accessibility tools.
2. Replacing `editor.dispatch(command)` with `editor.dispatch(command, false)`.

```ts,runnable
import { Editor, Viewport, Mat33 } from 'js-draw';
const editor = new Editor(document.body); // 1
editor.addToolbar();

---visible---
const command = Viewport.transformBy(Mat33.scaling2D(1/4)); // 2
editor.dispatch(command, false); // false: Don't add to history

// Alternatively,
// command.apply(editor);
```

See also {@link js-draw!Editor.dispatchNoAnnounce | Editor.dispatchNoAnnounce}.

## Example: Moving left

Let's start by creating an editor and adding it to the document:

```ts,runnable
import { Editor } from 'js-draw';

// Create an editor with a toolbar:
const editor = new Editor(document.body);
editor.addToolbar();
```

Next, to make it clear that the editor is moving, let's give the editor a repeating background:

```ts,runnable
---use-previous---
---visible---
import { Color4, BackgroundComponentBackgroundType } from 'js-draw';

editor.dispatch(
  editor.setBackgroundStyle({
    color: Color4.orange,
    type: BackgroundComponentBackgroundType.Grid,

	// Make the background autoresize so that it's always
	// visible:
	autoresize: true,
  }),
);
```

Next, let's move the viewport in a loop:

```ts,runnable
---use-previous---
---visible---
import { Viewport } from 'js-draw';
import { Mat33, Vec2 } from '@js-draw/math';

// When moveLeftUpdate is applied to the viewport, it moves the
// viewport to the left by 1 unit.
const moveLeftUpdate = Mat33.translation(Vec2.of(-1, 0));

function update() {
	const moveLeftCommand = Viewport.transformBy(moveLeftUpdate);
	moveLeftCommand.apply(editor);

	requestAnimationFrame(update);
}
update();
```

Above, the `Vec2.of(-1, 0)` gives the direction to move the viewport. Try replacing it with `Vec2.of(0, 1)`!

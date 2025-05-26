---
title: Positioning an element above the editor
---

# Positioning an element above the editor

The built-in `TextTool` tool renders a `<textarea>` above the editor at a particular location on the canvas. This guide demonstrates how to position custom HTML elements above the editor.

Related APIs:

- {@link js-draw!Editor.anchorElementToCanvas | Editor.anchorElementToCanvas}: Attaches the element at a specific location.
- {@link @js-draw/math!Mat33.translation | Mat33.translation}: Lets us specify where to put the element.

## Getting started: Creating the editor

Let's start by creating an editor with a toolbar:

```ts,runnable
import { Editor } from 'js-draw';

// Adds the editor to document.body:
const editor = new Editor(document.body); // 1
editor.addToolbar();
```

Running the above example should display an empty editor with the default toolbar.

## Creating an element to be positioned

We'll start by creating a `<button>` to position above the editor. Unlike the {@link js-draw!TextTool | TextTool}, we're using a `<button>` instead of a `<textarea>`:

```ts,runnable
---use-previous---
---visible---
const button = document.createElement('button');
button.textContent = 'Example!';
button.style.position = 'absolute';
```

## Attaching the element

Finally, the element can be attached to the editor using `anchorElementToCanvas`:

```ts,runnable
---use-previous---
---visible---
import { Mat33, Vec2 } from '@js-draw/math';

const positioning = Mat33.translation(Vec2.of(10, 20));
const anchor = editor.anchorElementToCanvas(button, positioning);
```

Above, a {@link @js-draw/math!Mat33 | Mat33} is used to specify where to place the `button`. See the {@link @js-draw/math!Mat33 | Mat33} documentation for how to display the button with a different position/rotation.

## Unattaching the element

Later, the element can be removed from the editor with `anchor.remove()`. Let's do this when the button is clicked:

```ts,runnable
---use-previous---
---visible---
button.onclick = () => {
	anchor.remove();
};
```

```ts,runnable
import {Editor,CanvasRenderer} from 'js-draw';

// Create an editor and load initial data -- don't add to the body (hidden editor).
const editor = new Editor(document.createElement('div'));
await editor.loadFromSVG('<svg><path d="m0,0 l100,5 l-50,60 l30,20 z" fill="green"/></svg>');
---visible---
// Given some editor.
// Set up the canvas to be drawn onto.
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Ensure that the canvas can fit the entire rendering
const viewport = editor.image.getImportExportViewport();
canvas.width = viewport.getScreenRectSize().x;
canvas.height = viewport.getScreenRectSize().y;

// Render editor.image onto the renderer
const renderer = new CanvasRenderer(ctx, viewport);
editor.image.render(renderer, viewport);

// Add the rendered canvas to the document.
document.body.appendChild(canvas);
```

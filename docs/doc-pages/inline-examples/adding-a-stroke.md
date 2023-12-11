```ts,runnable
import {
	Editor, EditorImage, Stroke, pathToRenderable.
	Path, Color4,
} from 'js-draw';

const editor = new Editor(document.body);

const stroke = new Stroke([
	pathToRenderable(Path.fromString('m0,0 l100,100 l0,-10 z'), { fill: Color4.red }),
]);
editor.dispatch(EditorImage.addElement(stroke));
```
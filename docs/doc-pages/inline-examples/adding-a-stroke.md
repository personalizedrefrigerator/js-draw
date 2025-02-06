```ts,runnable
import {
	Editor, EditorImage, Stroke, Path, Color4,
} from 'js-draw';

const editor = new Editor(document.body);

const stroke = Stroke.fromFilled(
	Path.fromString('m0,0 l100,100 l0,-10 z'),
	Color4.red,
);
editor.dispatch(EditorImage.addComponent(stroke));
```

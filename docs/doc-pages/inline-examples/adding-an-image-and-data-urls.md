```ts,runnable
import { Editor, ImageComponent, Mat33 } from 'js-draw';
const editor = new Editor(document.body);

//
// Adding an image
//
const myHtmlImage = new Image();
myHtmlImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAKklEQVQIW2Ns022zZGRgfPnz8s8HDQwN/xgZgKBDu0PuL8tf5d8/fz8FAOiDD1H2gfpGAAAAAElFTkSuQmCC';

const rotated45Degrees = Mat33.zRotation(Math.PI / 4); // A 45 degree = pi/4 radian rotation
const scaledByFactorOf100 = Mat33.scaling2D(100);
// Scale **and** rotate
const transform = rotated45Degrees.rightMul(scaledByFactorOf100);

const imageComponent = await ImageComponent.fromImage(myHtmlImage, transform);
await editor.dispatch(editor.image.addElement(imageComponent));

//
// Make a new image from the editor itself (with editor.toDataURL)
//
const toolbar = editor.addToolbar();
toolbar.addActionButton('From editor', async () => {
	const dataUrl = editor.toDataURL();
	const htmlImage = new Image();
	htmlImage.src = dataUrl;

	const imageComponent = await ImageComponent.fromImage(htmlImage, Mat33.identity);
	await editor.addAndCenterComponents([ imageComponent ]);
});
```

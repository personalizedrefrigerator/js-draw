```ts,runnable
import { Editor, makePolylineBuilder } from 'js-draw';

const editor = new Editor(document.body, {
	pens: {
		additionalPenTypes: [{
			name: 'Polyline (For debugging)',
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

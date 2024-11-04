```ts,runnable
import {
	Editor,
	PenTool,
	makePolylineBuilder,
	makeOutlinedCircleBuilder,
	makeOutlinedRectangleBuilder,
	makeArrowBuilder,
	makePressureSensitiveFreehandLineBuilder,
	makeFreehandLineBuilder,
	InputEvtType,
	sendPenEvent,
} from 'js-draw';
import { Color4, Vec2 } from '@js-draw/math';

const editor = new Editor(document.body);
editor.addToolbar();

// Different pen types that build strokes in different ways:
const strokeBuilders = [
	makePolylineBuilder,
	makeOutlinedCircleBuilder,
	makeOutlinedRectangleBuilder,
	makeArrowBuilder,
	makePressureSensitiveFreehandLineBuilder,
	makeFreehandLineBuilder,
];

// Get the first pen
const pen = editor.toolController.getMatchingTools(PenTool)[0];
// If using a different pen (e.g. the second), be sure to select it!
// pen.setEnabled(true);

// Draw something with each style
for (const factory of strokeBuilders) {
	pen.setStrokeFactory(factory);

	// Select a random pen color
	const penColor = Color4.ofRGB(Math.random(), Math.random(), Math.random());
	pen.setColor(penColor);

	// Draw something!
	const imageSize = editor.getImportExportRect().size;
	const startPos = Vec2.of(Math.random() * imageSize.x, Math.random() * imageSize.y);
	const endPos = Vec2.of(Math.random() * imageSize.x, Math.random() * imageSize.y);
	sendPenEvent(editor, InputEvtType.PointerDownEvt, startPos);
	sendPenEvent(editor, InputEvtType.PointerMoveEvt, startPos.lerp(endPos, 0.5));
	sendPenEvent(editor, InputEvtType.PointerUpEvt, endPos);
}
```

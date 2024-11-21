import { Color4, Path, Rect2, Vec2 } from '@js-draw/math';

import { InputEvtType } from '../../inputEvents';
import Pointer, { PointerDevice } from '../../Pointer';
import SerializableCommand from '../../commands/SerializableCommand';
import createEditor from '../../testing/createEditor';
import SelectionTool from './SelectionTool';
import { pathToRenderable, Stroke } from '../../lib';
import sendPenEvent from '../../testing/sendPenEvent';
import sendTouchEvent from '../../testing/sendTouchEvent';

describe('SelectionTool.selecting', () => {
	it('should select strokes that intersect the selection box', async () => {
		// This data replicates a bug experienced occasionally while rectangle-selecting objects.
		// This was originally caused by the maximum number of raymarching steps being too small.
		const strokeCommandsJSON = [
			'{"data":{"elemData":{"name":"stroke","zIndex":60,"id":"1693946356753-0.4982706980836502","loadSaveData":{},"data":[{"style":{"fill":"#00000000","stroke":{"color":"#803380","width":2.4000000000000004}},"path":"M402,136q6,53 6,66q0,23.3 -2,93"}]}},"commandType":"add-element"}',
			'{"data":{"elemData":{"name":"stroke","zIndex":61,"id":"1693946357271-0.6344931324187324","loadSaveData":{},"data":[{"style":{"fill":"#00000000","stroke":{"color":"#803380","width":2.4000000000000004}},"path":"M326,167q22-7 32-12q21.8-10.9 85-48q21.8-12.8 41-8q1.7,.4 4,6"}]}},"commandType":"add-element"}',
			'{"data":{"elemData":{"name":"stroke","zIndex":62,"id":"1693946360492-0.5654211831176934","loadSaveData":{},"data":[{"style":{"fill":"#00000000","stroke":{"color":"#803380","width":2.4000000000000004}},"path":"M437,242q5-2.2 20-9q1.1-.5 5-16q1.5-6 -5-6q-5.3,0 -13,23q-3.9,11.7 9,16q11.3,3.8 25-19q6-10 6-15q0-6.2 14,19q13.3,24 -14,24q-9.7,0 -6-11q2.2-6.5 20-19q23.9-16.7 31-52q1.6-7.9 -4-19q-5-10 -5,80q0,14 9,23q2.7,2.7 14-20q1.8-3.7 4-16q1-5.7 1,22q0,2.7 8-7q3.8-4.6 7-11q.8-1.6 6,7q2.1,3.5 3,3q4.6-2.3 16-13q3.1-2.9 13,17q2,4 15-9q6-6 6-13q0-2.8 -5,10q-.7,1.8 14-8q.5-.3 8,11q8.8,13.1 -1,57q-7.4,33.5 -46,44q-11.9,3.2 -17-7q-9.6-19.2 2-40q19.5-35.1 49-41q2.7-.5 11,0"}]}},"commandType":"add-element"}',
			'{"data":{"elemData":{"name":"stroke","zIndex":63,"id":"1693946360865-0.09511970697187222","loadSaveData":{},"data":[{"style":{"fill":"#00000000","stroke":{"color":"#803380","width":2.4000000000000004}},"path":"M552,213q.3,.3 1,1"}]}},"commandType":"add-element"}',
			'{"data":{"elemData":{"name":"stroke","zIndex":64,"id":"1693946362936-0.06480839257491244","loadSaveData":{},"data":[{"style":{"fill":"#00000000","stroke":{"color":"#803380","width":2.4000000000000004}},"path":"M480,187q28,1 40-1q27.6-4.6 71-34q12.5-8.4 49-35q11-8 50-22"}]}},"commandType":"add-element"}',
		];
		const editor = createEditor();

		for (const commandJSON of strokeCommandsJSON) {
			const command = SerializableCommand.deserialize(commandJSON, editor);

			await editor.dispatch(command);
		}

		const selectionTool = editor.toolController.getMatchingTools(SelectionTool)[0];
		expect(selectionTool).toBeTruthy();

		selectionTool.setEnabled(true);

		const touchCommandData = [
			{
				type: 'pointerdown',
				timeStamp: 9324,
				clientX: 343,
				clientY: 323,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9459,
				clientX: 353,
				clientY: 330,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9468,
				clientX: 357,
				clientY: 334,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9476,
				clientX: 363,
				clientY: 339,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9486,
				clientX: 369,
				clientY: 345,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9495,
				clientX: 375,
				clientY: 351,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9514,
				clientX: 387,
				clientY: 361,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9523,
				clientX: 394,
				clientY: 367,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9531,
				clientX: 399,
				clientY: 372,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9542,
				clientX: 404,
				clientY: 375,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9559,
				clientX: 415,
				clientY: 384,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9569,
				clientX: 421,
				clientY: 389,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9578,
				clientX: 428,
				clientY: 395,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9587,
				clientX: 435,
				clientY: 400,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9596,
				clientX: 443,
				clientY: 406,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9615,
				clientX: 458,
				clientY: 417,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9623,
				clientX: 465,
				clientY: 421,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9633,
				clientX: 473,
				clientY: 426,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9642,
				clientX: 480,
				clientY: 431,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9651,
				clientX: 487,
				clientY: 436,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9669,
				clientX: 501,
				clientY: 443,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9678,
				clientX: 507,
				clientY: 446,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9687,
				clientX: 513,
				clientY: 450,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9697,
				clientX: 519,
				clientY: 454,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9715,
				clientX: 531,
				clientY: 461,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9724,
				clientX: 536,
				clientY: 464,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9733,
				clientX: 542,
				clientY: 467,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9742,
				clientX: 547,
				clientY: 469,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9752,
				clientX: 552,
				clientY: 472,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9760,
				clientX: 557,
				clientY: 474,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9779,
				clientX: 568,
				clientY: 479,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9787,
				clientX: 572,
				clientY: 481,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9797,
				clientX: 577,
				clientY: 483,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9806,
				clientX: 583,
				clientY: 484,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9824,
				clientX: 593,
				clientY: 486,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9834,
				clientX: 599,
				clientY: 487,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9842,
				clientX: 605,
				clientY: 488,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9851,
				clientX: 611,
				clientY: 489,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9871,
				clientX: 620,
				clientY: 490,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9880,
				clientX: 626,
				clientY: 491,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9888,
				clientX: 630,
				clientY: 491,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9897,
				clientX: 634,
				clientY: 492,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9906,
				clientX: 637,
				clientY: 492,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9925,
				clientX: 644,
				clientY: 493,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9934,
				clientX: 648,
				clientY: 494,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9944,
				clientX: 651,
				clientY: 494,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9953,
				clientX: 653,
				clientY: 495,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9962,
				clientX: 656,
				clientY: 495,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9980,
				clientX: 660,
				clientY: 496,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9989,
				clientX: 661,
				clientY: 497,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 9998,
				clientX: 663,
				clientY: 498,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10007,
				clientX: 664,
				clientY: 499,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10026,
				clientX: 667,
				clientY: 500,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10035,
				clientX: 668,
				clientY: 500,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10044,
				clientX: 669,
				clientY: 500,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10053,
				clientX: 670,
				clientY: 501,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10062,
				clientX: 671,
				clientY: 501,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10081,
				clientX: 672,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10089,
				clientX: 673,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10108,
				clientX: 673,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10117,
				clientX: 674,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10145,
				clientX: 674,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10181,
				clientX: 675,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10191,
				clientX: 675,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10567,
				clientX: 676,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10602,
				clientX: 676,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointermove',
				timeStamp: 10611,
				clientX: 676,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 1,
				pressure: 0,
			},
			{
				type: 'pointerup',
				timeStamp: 10850,
				clientX: 676,
				clientY: 502,
				primary: true,
				id: 91,
				buttons: 0,
				pressure: 0,
			},
		];

		const eventNameToPointerEventKind = {
			pointerdown: InputEvtType.PointerDownEvt,
			pointermove: InputEvtType.PointerMoveEvt,
			pointerup: InputEvtType.PointerUpEvt,
		};

		for (const event of touchCommandData) {
			const screenTopLeft = Vec2.of(9, 167);
			const screenPoint = Vec2.of(event.clientX, event.clientY).minus(screenTopLeft);
			const canvasPoint = editor.viewport.screenToCanvas(screenPoint);

			const isDown = event.type !== 'pointerup';
			const pointer = Pointer.ofCanvasPoint(
				canvasPoint,
				isDown,
				editor.viewport,
				event.id,
				PointerDevice.Touch,
				event.primary,
				event.pressure,
			).withTimestamp(event.timeStamp);

			const kind = (eventNameToPointerEventKind as any)[event.type];
			editor.toolController.dispatchInputEvent({
				kind,
				current: pointer,
				allPointers: [pointer],
			});
		}

		expect(selectionTool.getSelectedObjects()).toHaveLength(5);
	});

	it("should not select a stroke if not intersecting the stroke's edge", async () => {
		const editor = createEditor();

		// Create the stroke near (100,100) to avoid the potential scroll caused by selecting
		// near the edge of the screen.
		const testStroke = new Stroke([
			pathToRenderable(Path.fromString('m100,100 l10,0'), {
				fill: Color4.transparent,
				stroke: {
					width: 10,
					color: Color4.red,
				},
			}),
		]);

		await editor.dispatch(editor.image.addElement(testStroke));

		const selectionTool = editor.toolController.getMatchingTools(SelectionTool)[0];
		selectionTool.setEnabled(true);

		// Select the start point of the stroke, but within the stroke width
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(99, 99));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(100, 100));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 100));

		// Because the selection is within the stroke width, nothing should be selected
		expect(selectionTool.getSelectedObjects()).toHaveLength(0);

		// A larger selection, however, should select the stroke
		sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(80, 80));
		sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(100, 100));
		sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 100));

		expect(selectionTool.getSelectedObjects()).toHaveLength(1);
	});

	it('should allow creating a selection with nonprimary pointers', async () => {
		const editor = createEditor();
		await editor.loadFromSVG(
			'<svg width="100" height="100"><path d="m0,0 l10,10 l-1,0" stroke="red" fill="red"></path></svg>',
		);

		// Should have loaded the stroke
		expect(editor.image.getElementsIntersectingRegion(Rect2.unitSquare)).toHaveLength(1);

		const selectionTool = editor.toolController.getMatchingTools(SelectionTool)[0];
		selectionTool.setEnabled(true);

		const initialCanvasPos = Vec2.of(0, 0);
		const isPrimary = false;
		let pointer = Pointer.ofCanvasPoint(
			initialCanvasPos,
			false,
			editor.viewport,
			0,
			PointerDevice.Pen,
			isPrimary,
		);

		// Select with a single non-primary pointer
		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.PointerDownEvt,
			current: pointer,
			allPointers: [pointer],
		});

		pointer = pointer.withCanvasPosition(Vec2.of(10, 10), editor.viewport);
		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.PointerMoveEvt,
			current: pointer,
			allPointers: [pointer],
		});
		editor.toolController.dispatchInputEvent({
			kind: InputEvtType.PointerUpEvt,
			current: pointer,
			allPointers: [pointer],
		});

		expect(selectionTool.getSelectedObjects()).toHaveLength(1);
	});

	it('should cancel a touch selection when interrupted by a pinch gesture', async () => {
		const editor = createEditor();
		await editor.loadFromSVG(
			'<svg width="10" height="10"><path d="m0,0 l10,10 l-1,0" stroke="red" fill="red"></path></svg>',
		);

		const selectionTool = editor.toolController.getMatchingTools(SelectionTool)[0];
		selectionTool.setEnabled(true);

		let pointer1 = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.zero);
		pointer1 = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(3, 3));

		expect(selectionTool.getSelection()!.getScreenRegion()).objEq(new Rect2(0, 0, 3, 3), 1e-6);

		// Second pointer -- cancel the selection
		let pointer2 = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.unitX, [pointer1]);
		pointer2 = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.unitY, [pointer1]);

		// Should be cancelled.
		expect(selectionTool.getSelection()).toBeNull();

		// Should stay cancelled.
		pointer1 = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(3, -4), [pointer2]);
		expect(selectionTool.getSelection()).toBeNull();
	});
});


import Editor from '../Editor';
import { Mat33, Vec2 } from '../lib';
import createEditor from '../testing/createEditor';
import sendTouchEvent from '../testing/sendTouchEvent';
import { InputEvtType } from '../types';
import waitForTimeout from '../util/waitForTimeout';
import PanZoom from './PanZoom';

const selectPanZom = (editor: Editor): PanZoom => {
	const primaryTools = editor.toolController.getPrimaryTools();
	const panZoom = primaryTools.filter(tool => tool instanceof PanZoom)[0] as PanZoom;
	panZoom.setEnabled(true);
	return panZoom;
};

describe('PanZoom', () => {
	it('touch and drag should pan, then inertial scroll', async () => {
		const editor = createEditor();
		selectPanZom(editor);
		editor.viewport.resetTransform(Mat33.identity);

		const origTranslation = editor.viewport.canvasToScreen(Vec2.zero);

		sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		for (let i = 1; i <= 10; i++) {
			jest.advanceTimersByTime(10);
			sendTouchEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(i * 10, 0));
		}

		// Use real timers -- we need to be able to start the inertial scroller.
		jest.useRealTimers();
		sendTouchEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(100, 0));

		const updatedTranslation = editor.viewport.canvasToScreen(Vec2.zero);
		expect(updatedTranslation.minus(origTranslation).magnitude()).toBeGreaterThanOrEqual(100);
		expect(updatedTranslation.minus(origTranslation).magnitude()).toBeLessThan(110);

		await waitForTimeout(600); // ms
		jest.useFakeTimers();

		// Should inertial scroll
		const afterDelayTranslation = editor.viewport.canvasToScreen(Vec2.zero);
		expect(afterDelayTranslation.minus(updatedTranslation).magnitude()).toBeGreaterThan(0);
	});

	it('should scale the view based on distance between two touches', () => {
		const editor = createEditor();
		selectPanZom(editor);
		editor.viewport.resetTransform(Mat33.identity);
		
		let firstPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(0, 0));
		let secondPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, Vec2.of(100, 0), [ firstPointer ]);

		let expectedScale = 1;
		expect(editor.viewport.getScaleFactor()).toBe(expectedScale);
		expect(editor.viewport.canvasToScreen(Vec2.zero)).objEq(Vec2.zero);

		const maxIterations = 10;
		for (let i = 0; i < maxIterations; i++) {
			jest.advanceTimersByTime(100);

			const point1 = Vec2.of(-i * 5, 0);
			const point2 = Vec2.of(i * 5 + 100, 0);

			const eventType = InputEvtType.PointerMoveEvt;

			firstPointer = sendTouchEvent(editor, eventType, point1, [ secondPointer ]);
			secondPointer = sendTouchEvent(editor, eventType, point2, [ firstPointer ]);
			expectedScale = point1.minus(point2).magnitude() / 100;
			Vec2.zero;
			if (i === maxIterations - 1) {
				jest.advanceTimersByTime(10);

				sendTouchEvent(editor, InputEvtType.PointerUpEvt, point1, [ secondPointer ]);
				sendTouchEvent(editor, InputEvtType.PointerUpEvt, point2);
			}

			jest.advanceTimersByTime(100);

			expect(editor.viewport.getRotationAngle()).toBe(0);
			expect(editor.viewport.getScaleFactor()).toBeCloseTo(expectedScale);

			// Center of touches should remain roughly center
			// (One touch is updating before the other, so there will be some leftwards drift)
			const translation = editor.viewport.canvasToScreen(Vec2.zero).minus(Vec2.zero);
			expect(translation.magnitude()).toBeLessThanOrEqual(i * 10);
		}
	});
});

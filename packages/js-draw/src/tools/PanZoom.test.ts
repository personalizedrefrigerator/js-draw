
import Editor from '../Editor';
import { Mat33, Vec2 } from '../lib';
import createEditor from '../testing/createEditor';
import sendTouchEvent from '../testing/sendTouchEvent';
import { InputEvtType } from '../inputEvents';
import waitForTimeout from '../util/waitForTimeout';
import PanZoom, { PanZoomMode } from './PanZoom';
import startPinchGesture from '../testing/startPinchGesture';

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
		expect(updatedTranslation.distanceTo(origTranslation)).toBeGreaterThanOrEqual(100);
		expect(updatedTranslation.distanceTo(origTranslation)).toBeLessThan(110);

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

	it('should zoom in to point within current screen', () => {
		// This sequence of touches and initial zoom was found to cause issues in
		// 4abe27ff8e7913155828f98dee77b09c57c51d30 and before.
		const initialCanvasTransform = new Mat33(832845.8900685566,0,-62599136.228663616,0,832845.8900685566,-86864630.94239436,0,0,1);
		const touchData = [
			{ touch1Point: {'x':776.41796875,'y':161.8515625}, touch2Point: {'x':794.09765625,'y':321.3984375}, },
			{ touch1Point: {'x':776.41796875,'y':159.7578125}, touch2Point: {'x':794.09765625,'y':321.3984375}, },
			{ touch1Point: {'x':776.41796875,'y':159.7578125}, touch2Point: {'x':794.09765625,'y':318.2578125}, },
			{ touch1Point: {'x':777.45703125,'y':157.6640625}, touch2Point: {'x':794.09765625,'y':318.2578125}, },
			{ touch1Point: {'x':777.45703125,'y':157.6640625}, touch2Point: {'x':794.09765625,'y':316.16796875}, },
			{ touch1Point: {'x':777.9765625,'y':155.57421875}, touch2Point: {'x':794.09765625,'y':316.16796875}, },
			{ touch1Point: {'x':777.9765625,'y':155.57421875}, touch2Point: {'x':795.13671875,'y':313.02734375}, },
			{ touch1Point: {'x':778.49609375,'y':153.48046875}, touch2Point: {'x':795.13671875,'y':313.02734375}, },
			{ touch1Point: {'x':778.49609375,'y':153.48046875}, touch2Point: {'x':795.65625,'y':307.796875}, },
			{ touch1Point: {'x':779.015625,'y':150.34375}, touch2Point: {'x':795.65625,'y':307.796875}, },
			{ touch1Point: {'x':779.015625,'y':150.34375}, touch2Point: {'x':796.69921875,'y':301.51953125}, },
			{ touch1Point: {'x':779.53515625,'y':146.15625}, touch2Point: {'x':796.69921875,'y':301.51953125}, },
			{ touch1Point: {'x':779.53515625,'y':146.15625}, touch2Point: {'x':797.73828125,'y':295.2421875}, },
			{ touch1Point: {'x':780.05859375,'y':141.97265625}, touch2Point: {'x':797.73828125,'y':295.2421875}, },
			{ touch1Point: {'x':780.05859375,'y':141.97265625}, touch2Point: {'x':799.296875,'y':288.44140625}, },
			{ touch1Point: {'x':780.578125,'y':136.7421875}, touch2Point: {'x':799.296875,'y':288.44140625}, },
			{ touch1Point: {'x':780.578125,'y':136.7421875}, touch2Point: {'x':800.859375,'y':280.59765625}, },
			{ touch1Point: {'x':781.09765625,'y':131.51171875}, touch2Point: {'x':800.859375,'y':280.59765625}, },
			{ touch1Point: {'x':781.09765625,'y':131.51171875}, touch2Point: {'x':801.8984375,'y':273.796875}, },
			{ touch1Point: {'x':781.6171875,'y':126.27734375}, touch2Point: {'x':801.8984375,'y':273.796875}, },
			{ touch1Point: {'x':781.6171875,'y':126.27734375}, touch2Point: {'x':802.41796875,'y':267.51953125}, },
			{ touch1Point: {'x':782.13671875,'y':120}, touch2Point: {'x':802.41796875,'y':267.51953125}, },
			{ touch1Point: {'x':782.13671875,'y':120}, touch2Point: {'x':802.9375,'y':261.2421875}, },
			{ touch1Point: {'x':782.65625,'y':113.72265625}, touch2Point: {'x':802.9375,'y':261.2421875}, },
			{ touch1Point: {'x':782.65625,'y':113.72265625}, touch2Point: {'x':803.45703125,'y':254.44140625}, },
			{ touch1Point: {'x':783.17578125,'y':107.96875}, touch2Point: {'x':803.45703125,'y':254.44140625}, },
			{ touch1Point: {'x':783.17578125,'y':107.96875}, touch2Point: {'x':803.9765625,'y':249.2109375}, },
			{ touch1Point: {'x':783.6953125,'y':102.21484375}, touch2Point: {'x':803.9765625,'y':249.2109375}, },
			{ touch1Point: {'x':783.6953125,'y':102.21484375}, touch2Point: {'x':803.9765625,'y':244.5}, },
			{ touch1Point: {'x':784.21875,'y':96.984375}, touch2Point: {'x':803.9765625,'y':244.5}, },
			{ touch1Point: {'x':784.21875,'y':96.984375}, touch2Point: {'x':803.9765625,'y':240.31640625}, },
			{ touch1Point: {'x':784.73828125,'y':92.80078125}, touch2Point: {'x':803.9765625,'y':240.31640625}, },
			{ touch1Point: {'x':784.73828125,'y':92.80078125}, touch2Point: {'x':803.9765625,'y':235.0859375}, },
			{ touch1Point: {'x':785.2578125,'y':89.13671875}, touch2Point: {'x':803.9765625,'y':235.0859375}, },
			{ touch1Point: {'x':785.2578125,'y':89.13671875}, touch2Point: {'x':803.9765625,'y':229.85546875}, },
			{ touch1Point: {'x':785.2578125,'y':86.5234375}, touch2Point: {'x':803.9765625,'y':229.85546875}, },
			{ touch1Point: {'x':785.2578125,'y':86.5234375}, touch2Point: {'x':803.9765625,'y':224.625}, },
			{ touch1Point: {'x':785.2578125,'y':83.90625}, touch2Point: {'x':803.9765625,'y':224.625}, },
			{ touch1Point: {'x':785.2578125,'y':83.90625}, touch2Point: {'x':803.9765625,'y':220.4375}, },
			{ touch1Point: {'x':785.2578125,'y':81.29296875}, touch2Point: {'x':803.9765625,'y':220.4375}, },
			{ touch1Point: {'x':785.2578125,'y':81.29296875}, touch2Point: {'x':803.9765625,'y':216.77734375}, },
			{ touch1Point: {'x':785.2578125,'y':78.67578125}, touch2Point: {'x':803.9765625,'y':216.77734375}, },
			{ touch1Point: {'x':785.2578125,'y':78.67578125}, touch2Point: {'x':803.9765625,'y':212.58984375}, },
			{ touch1Point: {'x':785.2578125,'y':76.05859375}, touch2Point: {'x':803.9765625,'y':212.58984375}, },
			{ touch1Point: {'x':785.2578125,'y':76.05859375}, touch2Point: {'x':803.9765625,'y':208.40625}, },
			{ touch1Point: {'x':785.2578125,'y':76.05859375}, touch2Point: {'x':803.45703125,'y':204.74609375}, },
			{ touch1Point: {'x':785.2578125,'y':72.921875}, touch2Point: {'x':803.45703125,'y':204.74609375}, },
			{ touch1Point: {'x':785.2578125,'y':72.921875}, touch2Point: {'x':802.9375,'y':201.08203125}, },
			{ touch1Point: {'x':785.2578125,'y':70.828125}, touch2Point: {'x':802.9375,'y':201.08203125}, },
			{ touch1Point: {'x':785.2578125,'y':70.828125}, touch2Point: {'x':802.41796875,'y':198.46875}, },
			{ touch1Point: {'x':785.2578125,'y':68.73828125}, touch2Point: {'x':802.41796875,'y':198.46875}, },
			{ touch1Point: {'x':785.2578125,'y':68.73828125}, touch2Point: {'x':801.8984375,'y':195.8515625}, },
			{ touch1Point: {'x':785.2578125,'y':66.64453125}, touch2Point: {'x':801.8984375,'y':195.8515625}, },
			{ touch1Point: {'x':785.2578125,'y':66.64453125}, touch2Point: {'x':801.37890625,'y':193.23828125}, },
			{ touch1Point: {'x':785.2578125,'y':64.55078125}, touch2Point: {'x':801.37890625,'y':193.23828125}, },
			{ touch1Point: {'x':785.2578125,'y':61.9375}, touch2Point: {'x':801.37890625,'y':193.23828125}, },
			{ touch1Point: {'x':785.2578125,'y':61.9375}, touch2Point: {'x':801.37890625,'y':190.09765625}, },
			{ touch1Point: {'x':785.2578125,'y':59.84375}, touch2Point: {'x':801.37890625,'y':190.09765625}, },
			{ touch1Point: {'x':785.77734375,'y':57.23046875}, touch2Point: {'x':801.37890625,'y':190.09765625}, },
			{ touch1Point: {'x':785.77734375,'y':57.23046875}, touch2Point: {'x':800.859375,'y':187.484375}, },
			{ touch1Point: {'x':785.77734375,'y':55.13671875}, touch2Point: {'x':800.859375,'y':187.484375}, },
			{ touch1Point: {'x':785.77734375,'y':55.13671875}, touch2Point: {'x':800.859375,'y':185.390625}, },
			{ touch1Point: {'x':785.77734375,'y':51.99609375}, touch2Point: {'x':800.859375,'y':185.390625}, },
			{ touch1Point: {'x':785.77734375,'y':51.99609375}, touch2Point: {'x':800.859375,'y':183.296875}, },
			{ touch1Point: {'x':785.77734375,'y':49.90625}, touch2Point: {'x':800.859375,'y':183.296875}, },
			{ touch1Point: {'x':785.77734375,'y':49.90625}, touch2Point: {'x':800.859375,'y':181.20703125}, },
			{ touch1Point: {'x':785.77734375,'y':47.8125}, touch2Point: {'x':800.859375,'y':181.20703125}, },
			{ touch1Point: {'x':771.21484375,'y':187.484375}, touch2Point: {'x':753.53515625,'y':321.921875}, },
			{ touch1Point: {'x':768.09765625,'y':185.390625}, touch2Point: {'x':753.53515625,'y':321.921875}, },
			{ touch1Point: {'x':763.9375,'y':183.296875}, touch2Point: {'x':753.53515625,'y':321.921875}, },
			{ touch1Point: {'x':760.81640625,'y':182.25}, touch2Point: {'x':753.53515625,'y':321.921875}, },
			{ touch1Point: {'x':760.81640625,'y':182.25}, touch2Point: {'x':756.13671875,'y':321.921875}, },
			{ touch1Point: {'x':757.6953125,'y':181.20703125}, touch2Point: {'x':756.13671875,'y':321.921875}, },
			{ touch1Point: {'x':755.09375,'y':180.16015625}, touch2Point: {'x':756.13671875,'y':321.921875}, },
			{ touch1Point: {'x':755.09375,'y':180.16015625}, touch2Point: {'x':758.21484375,'y':321.921875}, },
			{ touch1Point: {'x':753.015625,'y':179.63671875}, touch2Point: {'x':758.21484375,'y':321.921875}, },
			{ touch1Point: {'x':750.93359375,'y':179.11328125}, touch2Point: {'x':758.21484375,'y':321.921875}, },
			{ touch1Point: {'x':750.93359375,'y':179.11328125}, touch2Point: {'x':760.296875,'y':321.921875}, },
			{ touch1Point: {'x':748.85546875,'y':178.58984375}, touch2Point: {'x':760.296875,'y':321.921875}, },
			{ touch1Point: {'x':748.85546875,'y':178.58984375}, touch2Point: {'x':763.4140625,'y':321.3984375}, },
			{ touch1Point: {'x':745.734375,'y':177.54296875}, touch2Point: {'x':763.4140625,'y':321.3984375}, },
			{ touch1Point: {'x':745.734375,'y':177.54296875}, touch2Point: {'x':766.53515625,'y':320.3515625}, },
			{ touch1Point: {'x':742.09375,'y':176.49609375}, touch2Point: {'x':766.53515625,'y':320.3515625}, },
			{ touch1Point: {'x':742.09375,'y':176.49609375}, touch2Point: {'x':768.6171875,'y':319.3046875}, },
			{ touch1Point: {'x':740.015625,'y':175.97265625}, touch2Point: {'x':768.6171875,'y':319.3046875}, },
			{ touch1Point: {'x':737.93359375,'y':175.44921875}, touch2Point: {'x':768.6171875,'y':319.3046875}, },
			{ touch1Point: {'x':737.93359375,'y':175.44921875}, touch2Point: {'x':772.2578125,'y':317.21484375}, },
			{ touch1Point: {'x':735.33203125,'y':174.9296875}, touch2Point: {'x':772.2578125,'y':317.21484375}, },
			{ touch1Point: {'x':733.25390625,'y':174.40625}, touch2Point: {'x':772.2578125,'y':317.21484375}, },
			{ touch1Point: {'x':733.25390625,'y':174.40625}, touch2Point: {'x':775.375,'y':315.12109375}, },
			{ touch1Point: {'x':731.171875,'y':173.8828125}, touch2Point: {'x':775.375,'y':315.12109375}, },
			{ touch1Point: {'x':729.09375,'y':173.8828125}, touch2Point: {'x':775.375,'y':315.12109375}, },
			{ touch1Point: {'x':729.09375,'y':173.8828125}, touch2Point: {'x':778.49609375,'y':313.02734375}, },
			{ touch1Point: {'x':727.01171875,'y':173.8828125}, touch2Point: {'x':778.49609375,'y':313.02734375}, },
			{ touch1Point: {'x':727.01171875,'y':173.8828125}, touch2Point: {'x':782.13671875,'y':310.9375}, },
			{ touch1Point: {'x':723.89453125,'y':173.8828125}, touch2Point: {'x':782.13671875,'y':310.9375}, },
			{ touch1Point: {'x':723.89453125,'y':173.8828125}, touch2Point: {'x':784.21875,'y':309.890625}, },
			{ touch1Point: {'x':723.89453125,'y':173.8828125}, touch2Point: {'x':786.296875,'y':308.84375}, },
			{ touch1Point: {'x':721.8125,'y':173.8828125}, touch2Point: {'x':786.296875,'y':308.84375}, },
			{ touch1Point: {'x':721.8125,'y':173.8828125}, touch2Point: {'x':788.37890625,'y':307.796875}, },
			{ touch1Point: {'x':721.8125,'y':173.8828125}, touch2Point: {'x':790.45703125,'y':306.75}, },
			{ touch1Point: {'x':719.734375,'y':173.8828125}, touch2Point: {'x':790.45703125,'y':306.75}, },
			{ touch1Point: {'x':719.734375,'y':173.8828125}, touch2Point: {'x':792.5390625,'y':305.703125}, },
			{ touch1Point: {'x':719.734375,'y':173.8828125}, touch2Point: {'x':795.65625,'y':303.61328125}, },
			{ touch1Point: {'x':717.65234375,'y':173.8828125}, touch2Point: {'x':795.65625,'y':303.61328125}, },
			{ touch1Point: {'x':717.65234375,'y':173.8828125}, touch2Point: {'x':798.77734375,'y':302.56640625}, },
			{ touch1Point: {'x':717.65234375,'y':173.8828125}, touch2Point: {'x':801.8984375,'y':300.47265625}, },
			{ touch1Point: {'x':715.5703125,'y':173.8828125}, touch2Point: {'x':801.8984375,'y':300.47265625}, },
			{ touch1Point: {'x':715.5703125,'y':173.8828125}, touch2Point: {'x':805.01953125,'y':297.859375}, },
			{ touch1Point: {'x':715.5703125,'y':173.8828125}, touch2Point: {'x':806.578125,'y':296.2890625}, },
			{ touch1Point: {'x':713.4921875,'y':173.8828125}, touch2Point: {'x':806.578125,'y':296.2890625}, },
			{ touch1Point: {'x':713.4921875,'y':173.8828125}, touch2Point: {'x':809.1796875,'y':294.1953125}, },
			{ touch1Point: {'x':711.41015625,'y':173.359375}, touch2Point: {'x':809.1796875,'y':294.1953125}, },
			{ touch1Point: {'x':711.41015625,'y':173.359375}, touch2Point: {'x':811.2578125,'y':292.10546875}, },
			{ touch1Point: {'x':711.41015625,'y':173.359375}, touch2Point: {'x':813.859375,'y':290.01171875}, },
			{ touch1Point: {'x':709.33203125,'y':173.359375}, touch2Point: {'x':813.859375,'y':290.01171875}, },
			{ touch1Point: {'x':709.33203125,'y':173.359375}, touch2Point: {'x':817.5,'y':287.91796875}, },
			{ touch1Point: {'x':707.25,'y':173.359375}, touch2Point: {'x':817.5,'y':287.91796875}, },
			{ touch1Point: {'x':707.25,'y':173.359375}, touch2Point: {'x':820.62109375,'y':285.828125}, },
			{ touch1Point: {'x':705.171875,'y':173.359375}, touch2Point: {'x':820.62109375,'y':285.828125}, },
			{ touch1Point: {'x':705.171875,'y':173.359375}, touch2Point: {'x':823.73828125,'y':283.734375}, },
			{ touch1Point: {'x':705.171875,'y':173.359375}, touch2Point: {'x':825.8203125,'y':282.6875}, },
			{ touch1Point: {'x':703.08984375,'y':173.8828125}, touch2Point: {'x':825.8203125,'y':282.6875}, },
			{ touch1Point: {'x':703.08984375,'y':173.8828125}, touch2Point: {'x':827.8984375,'y':281.640625}, },
			{ touch1Point: {'x':703.08984375,'y':173.8828125}, touch2Point: {'x':829.98046875,'y':280.59765625}, },
			{ touch1Point: {'x':700.4921875,'y':174.9296875}, touch2Point: {'x':829.98046875,'y':280.59765625}, },
			{ touch1Point: {'x':700.4921875,'y':174.9296875}, touch2Point: {'x':833.1015625,'y':278.50390625}, },
			{ touch1Point: {'x':697.890625,'y':175.97265625}, touch2Point: {'x':833.1015625,'y':278.50390625}, },
			{ touch1Point: {'x':697.890625,'y':175.97265625}, touch2Point: {'x':836.22265625,'y':277.45703125}, },
			{ touch1Point: {'x':694.76953125,'y':177.54296875}, touch2Point: {'x':836.22265625,'y':277.45703125}, },
			{ touch1Point: {'x':694.76953125,'y':177.54296875}, touch2Point: {'x':838.8203125,'y':276.41015625}, },
			{ touch1Point: {'x':691.6484375,'y':180.16015625}, touch2Point: {'x':838.8203125,'y':276.41015625}, },
			{ touch1Point: {'x':690.08984375,'y':181.7265625}, touch2Point: {'x':838.8203125,'y':276.41015625}, },
			{ touch1Point: {'x':688.53125,'y':183.296875}, touch2Point: {'x':838.8203125,'y':276.41015625}, },
			{ touch1Point: {'x':688.53125,'y':183.296875}, touch2Point: {'x':840.3828125,'y':274.83984375}, },
			{ touch1Point: {'x':686.96875,'y':185.390625}, touch2Point: {'x':840.3828125,'y':274.83984375}, },
			{ touch1Point: {'x':685.41015625,'y':188.00390625}, touch2Point: {'x':840.3828125,'y':274.83984375}, },
			{ touch1Point: {'x':683.8515625,'y':190.62109375}, touch2Point: {'x':840.3828125,'y':274.83984375}, },
			{ touch1Point: {'x':683.8515625,'y':190.62109375}, touch2Point: {'x':841.94140625,'y':273.2734375}, },
			{ touch1Point: {'x':682.2890625,'y':194.28125}, touch2Point: {'x':841.94140625,'y':273.2734375}, },
			{ touch1Point: {'x':680.73046875,'y':197.9453125}, touch2Point: {'x':841.94140625,'y':273.2734375}, },
			{ touch1Point: {'x':679.16796875,'y':201.60546875}, touch2Point: {'x':841.94140625,'y':273.2734375}, },
			{ touch1Point: {'x':677.609375,'y':205.79296875}, touch2Point: {'x':841.94140625,'y':273.2734375}, },
			{ touch1Point: {'x':677.609375,'y':205.79296875}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':676.5703125,'y':209.453125}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':675.52734375,'y':212.58984375}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':674.48828125,'y':214.68359375}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':673.44921875,'y':216.77734375}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':672.9296875,'y':218.8671875}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':671.890625,'y':221.484375}, touch2Point: {'x':844.0234375,'y':272.2265625}, },
			{ touch1Point: {'x':671.890625,'y':221.484375}, touch2Point: {'x':844.0234375,'y':270.1328125}, },
			{ touch1Point: {'x':671.890625,'y':223.578125}, touch2Point: {'x':844.0234375,'y':270.1328125}, },
			{ touch1Point: {'x':671.890625,'y':223.578125}, touch2Point: {'x':844.0234375,'y':267.51953125}, },
			{ touch1Point: {'x':671.890625,'y':225.66796875}, touch2Point: {'x':844.0234375,'y':267.51953125}, },
			{ touch1Point: {'x':671.890625,'y':225.66796875}, touch2Point: {'x':844.0234375,'y':265.42578125}, },
			{ touch1Point: {'x':671.890625,'y':225.66796875}, touch2Point: {'x':844.54296875,'y':263.33203125}, },
			{ touch1Point: {'x':671.890625,'y':227.76171875}, touch2Point: {'x':844.54296875,'y':263.33203125}, },
			{ touch1Point: {'x':671.890625,'y':227.76171875}, touch2Point: {'x':844.54296875,'y':261.2421875}, },
			{ touch1Point: {'x':672.41015625,'y':229.85546875}, touch2Point: {'x':844.54296875,'y':261.2421875}, },
			{ touch1Point: {'x':672.41015625,'y':229.85546875}, touch2Point: {'x':844.54296875,'y':259.1484375}, },
			{ touch1Point: {'x':673.44921875,'y':231.9453125}, touch2Point: {'x':844.54296875,'y':259.1484375}, },
			{ touch1Point: {'x':673.44921875,'y':231.9453125}, touch2Point: {'x':844.54296875,'y':256.0078125}, },
			{ touch1Point: {'x':675.0078125,'y':234.5625}, touch2Point: {'x':844.54296875,'y':256.0078125}, },
			{ touch1Point: {'x':675.0078125,'y':234.5625}, touch2Point: {'x':844.54296875,'y':253.91796875}, },
			{ touch1Point: {'x':676.05078125,'y':236.65625}, touch2Point: {'x':844.54296875,'y':253.91796875}, },
			{ touch1Point: {'x':676.05078125,'y':236.65625}, touch2Point: {'x':844.54296875,'y':250.77734375}, },
			{ touch1Point: {'x':677.609375,'y':238.74609375}, touch2Point: {'x':844.54296875,'y':250.77734375}, },
			{ touch1Point: {'x':677.609375,'y':238.74609375}, touch2Point: {'x':844.54296875,'y':247.640625}, },
			{ touch1Point: {'x':678.6484375,'y':240.83984375}, touch2Point: {'x':844.54296875,'y':247.640625}, },
			{ touch1Point: {'x':678.6484375,'y':240.83984375}, touch2Point: {'x':844.54296875,'y':244.5}, },
			{ touch1Point: {'x':678.6484375,'y':240.83984375}, touch2Point: {'x':844.54296875,'y':241.36328125}, },
			{ touch1Point: {'x':680.73046875,'y':242.41015625}, touch2Point: {'x':844.54296875,'y':241.36328125}, },
			{ touch1Point: {'x':680.73046875,'y':242.41015625}, touch2Point: {'x':844.54296875,'y':238.74609375}, },
			{ touch1Point: {'x':682.2890625,'y':243.9765625}, touch2Point: {'x':844.54296875,'y':238.74609375}, },
			{ touch1Point: {'x':682.2890625,'y':243.9765625}, touch2Point: {'x':844.54296875,'y':236.65625}, },
			{ touch1Point: {'x':683.8515625,'y':245.546875}, touch2Point: {'x':844.54296875,'y':236.65625}, },
			{ touch1Point: {'x':683.8515625,'y':245.546875}, touch2Point: {'x':844.54296875,'y':234.5625}, },
			{ touch1Point: {'x':685.9296875,'y':246.0703125}, touch2Point: {'x':844.54296875,'y':234.5625}, },
			{ touch1Point: {'x':685.9296875,'y':246.0703125}, touch2Point: {'x':844.54296875,'y':232.46875}, },
		].map(touchPoints => {
			return [
				Vec2.ofXY(touchPoints.touch1Point),
				Vec2.ofXY(touchPoints.touch2Point),
			];
		});


		const editor = createEditor();
		selectPanZom(editor);
		editor.viewport.resetTransform(initialCanvasTransform);

		editor.toolController.getMatchingTools(PanZoom).forEach(tool => {
			tool.setModeEnabled(PanZoomMode.RotationLocked, false);
		});

		let lastVisibleRect = editor.viewport.visibleRect;


		let firstPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, touchData[0][0]);
		let secondPointer = sendTouchEvent(editor, InputEvtType.PointerDownEvt, touchData[0][1], [ firstPointer ]);

		for (const [touch1Point, touch2Point] of touchData) {
			jest.advanceTimersByTime(10);

			firstPointer = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, touch1Point, [ secondPointer ]);
			secondPointer = sendTouchEvent(editor, InputEvtType.PointerMoveEvt, touch2Point, [ firstPointer ]);

			const rectCenterDelta = editor.viewport.visibleRect.center.minus(lastVisibleRect.center);

			expect(rectCenterDelta.magnitude()).toBeLessThan(lastVisibleRect.w);

			lastVisibleRect = editor.viewport.visibleRect;
		}
	});

	it('should have a larger rotation snap distance when first starting a rotation gesture', () => {
		const editor = createEditor();
		selectPanZom(editor);
		editor.viewport.resetTransform(Mat33.identity);

		const pinchCenter = Vec2.of(50, 50);
		const pinchDistance = 10;
		const pinchGesture = startPinchGesture(editor, pinchCenter, pinchDistance, 0);

		const expectedScale = 1;
		expect(editor.viewport.getScaleFactor()).toBe(expectedScale);
		expect(editor.viewport.canvasToScreen(Vec2.zero)).objEq(Vec2.zero);

		// We're just starting the gesture, so the snap angle should be larger
		const maxIterations = 10;
		for (let i = 0; i < maxIterations; i++) {
			jest.advanceTimersByTime(100);

			// Should snap for small angles
			pinchGesture.update(pinchCenter, pinchDistance, i / maxIterations * 0.2);
			expect(editor.viewport.getRotationAngle()).toBeCloseTo(0);
		}

		// Larger angles should cause rotation
		pinchGesture.update(pinchCenter, pinchDistance, 0.4);
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(0.4);

		// Going back to a smaller angle should still not snap...
		pinchGesture.update(pinchCenter, pinchDistance, 0.2);
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(0.2);

		// ...until we get very close to zero
		pinchGesture.update(pinchCenter, pinchDistance, 0.01);
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(0);

		// Suddenly rotating to another angle should still work
		pinchGesture.update(pinchCenter, pinchDistance, Math.PI / 2);
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(Math.PI / 2);

		// ...and if that angle is a multiple of 90 degrees (= PI/2 radians),
		// we should snap to it.
		pinchGesture.update(pinchCenter, pinchDistance, Math.PI / 2 + 0.04);
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(Math.PI / 2);

		pinchGesture.update(pinchCenter, pinchDistance, -Math.PI / 2 + 0.03);
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(-Math.PI / 2);

		pinchGesture.update(pinchCenter, pinchDistance, Math.PI + 0.02);
		// Inspect the sine and cosine rather than the actual angle -- the rotation angle
		// could be near either +pi or -pi.
		expect(Math.cos(editor.viewport.getRotationAngle())).toBeCloseTo(-1);
		expect(Math.sin(editor.viewport.getRotationAngle())).toBeCloseTo(0);

		pinchGesture.update(pinchCenter, pinchDistance, Math.PI/2 + 0.01);
		pinchGesture.end();
		expect(editor.viewport.getRotationAngle()).toBeCloseTo(Math.PI/2);
	});

	it('"r" and "R" keyboard shortcuts should rotate the viewport in opposite directions', () => {
		const editor = createEditor();
		selectPanZom(editor);
		editor.viewport.resetTransform(Mat33.identity);

		// Returns the transformed version of [vec], treating the vector as
		// starting at the center of the editor's visible region.
		const transformedVec = (vec: Vec2) => {
			const canvasToScreen = editor.viewport.canvasToScreenTransform;
			const center = editor.viewport.visibleRect.center;

			const transformedEnd = canvasToScreen.transformVec2(center.plus(vec));
			const transformedStart = canvasToScreen.transformVec2(center);
			return transformedEnd.minus(transformedStart);
		};

		const tolerableError = 0.001;

		expect(transformedVec(Vec2.unitX).length()).toBeCloseTo(1);

		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'r');
		expect(transformedVec(Vec2.unitX).length()).toBeCloseTo(1);
		expect(transformedVec(Vec2.unitX)).not.objEq(Vec2.unitX, tolerableError);

		editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, 'R');
		expect(transformedVec(Vec2.unitX).length()).toBeCloseTo(1);
		expect(transformedVec(Vec2.unitX)).objEq(Vec2.unitX, tolerableError);
	});
});

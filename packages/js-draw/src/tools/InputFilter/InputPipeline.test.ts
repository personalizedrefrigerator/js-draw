import { CopyEvent, InputEvt, InputEvtType } from '../../inputEvents';
import FunctionMapper from './FunctionMapper';
import InputPipeline from './InputPipeline';

describe('InputPipeline', () => {
	it('empty pipeline should map events to themselves', () => {
		const pipeline = new InputPipeline();

		// Shouldn't crash when no emit listener
		pipeline.onEvent({ kind: InputEvtType.GestureCancelEvt });

		const mockEmitListener = jest.fn();
		pipeline.setEmitListener(mockEmitListener);

		const testCopyEvent: CopyEvent = { kind: InputEvtType.CopyEvent, setData: () => {} };
		pipeline.onEvent(testCopyEvent);
		expect(mockEmitListener).toHaveBeenCalledTimes(1);
		expect(mockEmitListener).toHaveBeenCalledWith(testCopyEvent);
	});

	it('pipeline with a single mapper should filter events through the mapper', () => {
		const pipeline = new InputPipeline();

		const processEvent = jest.fn((event: InputEvt) => event);
		pipeline.addToTail(new FunctionMapper(processEvent));

		expect(processEvent).not.toHaveBeenCalled();
		pipeline.onEvent({ kind: InputEvtType.GestureCancelEvt });
		expect(processEvent).toHaveBeenCalled();

		pipeline.onEvent({ kind: InputEvtType.GestureCancelEvt });
		expect(processEvent).toHaveBeenCalledTimes(2);

		const mockEmitListener = jest.fn();
		pipeline.setEmitListener(mockEmitListener);

		pipeline.onEvent({ kind: InputEvtType.GestureCancelEvt });
		expect(processEvent).toHaveBeenCalledTimes(3);
		expect(mockEmitListener).toHaveBeenCalledTimes(1);
	});
});

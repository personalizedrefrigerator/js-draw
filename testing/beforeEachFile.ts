import loadExpectExtensions from './loadExpectExtensions';
loadExpectExtensions();
jest.useFakeTimers();

// jsdom doesn't support HTMLCanvasElement#getContext — it logs an error
// to the console. Make it return null so we can handle a non-existent Canvas
// at runtime (e.g. use something else, if available).
HTMLCanvasElement.prototype.getContext = () => null;

// jsdom also doesn't support ResizeObserver. Mock it.
window.ResizeObserver ??= class {
	public constructor(_callback: ResizeObserverCallback) { }

	public disconnect() { }

	public observe() { }

	public unobserve() { }
};

// jsdom doesn't support PointerEvent.
// See https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
// and https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/PointerEvent
window.PointerEvent ??= class extends MouseEvent {
	public isPrimary: boolean;
	public pointerId: number;
	public pressure: number;
	public pointerType: string;
	public tiltX: number;
	public tiltY: number;
	public twist: number;

	public constructor(
		type: 'pointerdown'|'pointermove'|'pointerup', initDict: PointerEventInit,
	) {
		super(type, initDict);

		this.isPrimary = initDict.isPrimary ?? false;
		this.pointerId = initDict.pointerId ?? 0;
		this.pressure = initDict.pressure ?? 0;
		this.pointerType = initDict.pointerType ?? '';
		this.tiltX = initDict.tiltX ?? 0;
		this.tiltY = initDict.tiltY ?? 0;
		this.twist = initDict.twist ?? 0;
	}
} as any;

HTMLElement.prototype.setPointerCapture ??= () => {};
HTMLElement.prototype.releasePointerCapture ??= () => {};

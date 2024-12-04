// This file contains polyfills and must assume that built-in types are incorrect.
/* eslint @typescript-eslint/no-unnecessary-condition: "off" */

import loadExpectExtensions from './loadExpectExtensions';
loadExpectExtensions();
jest.useFakeTimers();

// jsdom hides several node APIs that should be present in the browser.
import { TextEncoder, TextDecoder } from 'node:util';
import { Blob as NodeBlob } from 'node:buffer';
window.TextEncoder = TextEncoder;
window.TextDecoder = TextDecoder as typeof window.TextDecoder;
window.Blob = NodeBlob as typeof Blob;

// jsdom doesn't support HTMLCanvasElement#getContext — it logs an error
// to the console. Make it return null so we can handle a non-existent Canvas
// at runtime (e.g. use something else, if available).
HTMLCanvasElement.prototype.getContext = () => null;

// jsdom also doesn't support ResizeObserver. Mock it.
window.ResizeObserver ??= class {
	public disconnect() {}

	public observe() {}

	public unobserve() {}
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
		type: 'pointerdown' | 'pointermove' | 'pointerup',
		initDict: PointerEventInit = {},
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
} as typeof PointerEvent;

// eslint-disable-next-line @typescript-eslint/unbound-method
HTMLElement.prototype.setPointerCapture ??= () => {};
// eslint-disable-next-line @typescript-eslint/unbound-method
HTMLElement.prototype.releasePointerCapture ??= () => {};
// eslint-disable-next-line @typescript-eslint/unbound-method
HTMLElement.prototype.scrollIntoView ??= () => {};

// Mock support for .innerText
// See https://github.com/jsdom/jsdom/issues/1245
Object.defineProperty(HTMLElement.prototype, 'innerText', {
	get(this: HTMLElement) {
		// Not exactly equivalent to .innerText. See
		// https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext
		return this.textContent;
	},
	set(this: HTMLElement, value: string) {
		this.replaceChildren(document.createTextNode(value));
	},
});

// eslint-disable-next-line @typescript-eslint/unbound-method
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
	this.style.display = 'block';
};

// eslint-disable-next-line @typescript-eslint/unbound-method
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
	this.style.display = 'none';
	this.dispatchEvent(new Event('close'));
};

// jsdom doesn't support the clipboard API or ClipboardEvents.
// For now, these are mocked here:

// @ts-expect-error -- assigning to property that is not actually read-only
Navigator.prototype.clipboard ??= {};

let clipboardData: ClipboardItems = [];
Navigator.prototype.clipboard.read = (): Promise<ClipboardItems> => {
	return Promise.resolve([...clipboardData]);
};
Navigator.prototype.clipboard.readText = async (): Promise<string> => {
	for (const item of clipboardData) {
		for (const mime of item.types) {
			if (mime === 'text/plain') {
				return await (await item.getType(mime)).text();
			}
		}
	}

	return '';
};

Navigator.prototype.clipboard.write = (data: ClipboardItems): Promise<void> => {
	clipboardData = [...data];
	return Promise.resolve();
};

window.ClipboardItem ??= class {
	public readonly types: string[];
	public readonly presentationStyle = 'unspecified';

	public constructor(
		public readonly items: Record<string, string | Blob | PromiseLike<string | Blob>>,
		public readonly options?: ClipboardItemOptions,
	) {
		this.types = Object.keys(items).map((key) => key.toLowerCase());
	}

	public async getType(type: string) {
		const value = await this.items[type];
		if (typeof value === 'string') {
			return new Blob([new TextEncoder().encode(value)], { type: type });
		} else {
			return value;
		}
	}

	public static supports(type: string) {
		return type === 'text/plain' || type === 'text/html' || type.startsWith('image/');
	}
};

window.ClipboardEvent ??= class extends Event {
	public clipboardData: DataTransfer | null;

	public constructor(type: string, options?: ClipboardEventInit) {
		super(type, options);
		this.clipboardData = options?.clipboardData ?? null;
	}
};

window.DataTransfer ??= class {
	#data: Map<string, string> = new Map();

	public files: File[] = [];
	public dropEffect = 'none';
	public effectAllowed = 'uninitialized';

	public get types() {
		const types = new Set(this.#data.keys());
		for (const file of this.files) {
			types.add(file.type);
		}
		return [...types.values()];
	}

	public get items() {
		return []; // TODO
	}

	public setData(format: string, value: string) {
		this.#data.set(format, value);
	}

	public getData(format: string) {
		return this.#data.get(format) ?? '';
	}

	public clearData() {
		this.#data.clear();
	}

	public setDragImage() {}
	// This mock doesn't need to completely implement DataTransfer. Cast:
} as unknown as typeof DataTransfer;

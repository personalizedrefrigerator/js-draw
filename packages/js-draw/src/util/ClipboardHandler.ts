
import { Editor } from '../Editor';
import { InputEvtType } from '../inputEvents';
import fileToBase64Url from './fileToBase64Url';

const isTextMimeType = (mime: string) =>
	// +xml: Handles image/svg+xml
	mime.endsWith('+xml') || mime.startsWith('text/');

interface Callbacks {
	onPasteError(error: Error|unknown): void;
	onCopyError(error: Error|unknown): void;
}

/**
 * Handles conversion between the browser clipboard APIs and internal
 * js-draw clipboard events.
 */
export default class ClipboardHandler {
	#preferClipboardEvents = false;

	public constructor(
		private editor: Editor,
		private callbacks?: Callbacks,
	) {
	}


	/**
	 * Pastes data from the clipboard into the editor associated with
	 * this handler.
	 *
	 * @param event Optional -- a clipboard/drag event. If not provided,
	 * 				`navigator.clipboard` will be used instead.
	 * @returns true if the paste event was handled by the editor.
	 */
	public paste(event?: DragEvent|ClipboardEvent) {
		const onError = (error: unknown) => {
			if (this.callbacks?.onPasteError) {
				this.callbacks.onPasteError(error);

				return Promise.resolve(false);
			} else {
				throw error;
			}
		};

		try {
			// Use .catch rather than `async` to prevent future modifications from
			// moving clipboard handling logic out of user event handlers.
			// In the past, `await`s have caused permissions issues in some browsers.
			return this.pasteInternal(event).catch(onError);
		} catch (error) {
			return onError(error);
		}
	}

	private async pasteInternal(event?: DragEvent|ClipboardEvent) {
		const editor = this.editor;

		const clipboardData: DataTransfer|null = (event as any)?.dataTransfer ?? (event as any)?.clipboardData ?? null;
		const hasEvent = !!clipboardData;

		const sendPasteEvent = (mime: string, data: string|null) => {
			return data && editor.toolController.dispatchInputEvent({
				kind: InputEvtType.PasteEvent,
				mime,
				data,
			});
		};

		// Listed in order of precedence
		const supportedMIMEs = [
			'image/svg+xml',
			'text/html',
			'image/png',
			'image/jpeg',
			'text/plain',
		];

		let files: Blob[] = [];
		const textData: Map<string, string> = new Map<string, string>();
		if (hasEvent) {
			// NOTE: On some browsers, .getData and .files must be used before any async operations.
			files = [...clipboardData.files];
			for (const mime of supportedMIMEs) {
				const data = clipboardData.getData(mime);
				if (data) {
					textData.set(mime, data);
				}
			}
		} else {
			const clipboardData = await navigator.clipboard.read();
			for (const item of clipboardData) {
				for (const mime of item.types) {
					if (supportedMIMEs.includes(mime)) {
						files.push(await item.getType(mime));
					}
				}
			}
		}

		// Returns true if handled
		const handleMIME = async (mime: string) => {
			const isTextFormat = isTextMimeType(mime);
			if (isTextFormat) {
				const data = textData.get(mime)!;

				if (sendPasteEvent(mime, data)) {
					event?.preventDefault();
					return true;
				}
			}

			for (const file of files) {
				const fileType = file?.type?.toLowerCase();
				if (fileType !== mime) {
					continue;
				}

				if (isTextFormat) {
					const text = await file.text();
					if (sendPasteEvent(mime, text)) {
						event?.preventDefault();
						return true;
					}
				} else {
					editor.showLoadingWarning(0);
					const onprogress = (evt: ProgressEvent<FileReader>) => {
						editor.showLoadingWarning(evt.loaded / evt.total);
					};

					try {
						const data = await fileToBase64Url(file, { onprogress });

						if (sendPasteEvent(mime, data)) {
							event?.preventDefault();
							editor.hideLoadingWarning();
							return true;
						}
					} catch (e) {
						console.error('Error reading image:', e);
					}
					editor.hideLoadingWarning();
				}
			}
			return false;
		};

		for (const mime of supportedMIMEs) {
			if (await handleMIME(mime)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Copies text from the editor associated with this.
	 *
	 * Even if `event` is provided, the `navigator.clipboard` API may be used if image data
	 * is to be copied. This is done because `ClipboardEvent`s seem to not support attaching
	 * images.
	 */
	public copy(event?: ClipboardEvent|DragEvent) {
		const onError = (error: Error|unknown) => {
			if (this.callbacks?.onCopyError) {
				this.callbacks.onCopyError(error);
				return Promise.resolve();
			} else {
				throw error;
			}
		};

		try {
			// As above, use `.catch` to be certain that certain copyInternal
			// is run now, before returning.
			return this.copyInternal(event).catch(onError);
		} catch (error) {
			return onError(error);
		}
	}

	private copyInternal(event: ClipboardEvent|DragEvent|undefined) {
		const mimeToData: Map<string, Promise<Blob>|string> = new Map();

		if (this.editor.toolController.dispatchInputEvent({
			kind: InputEvtType.CopyEvent,
			setData: (mime, data) => {
				mimeToData.set(mime, data);
			},
		})) {
			event?.preventDefault();
		}

		const mimeTypes = [...mimeToData.keys()];
		const hasNonTextMimeTypes = mimeTypes.some(mime => !isTextMimeType(mime));

		const copyToEvent = (reason?: unknown) => {
			if (!event) {
				throw new Error(`Unable to copy -- no event provided${reason ? `. Original error: ${reason}` : ''}`);
			}

			for (const [key, value] of mimeToData.entries()) {
				if (typeof value === 'string') {
					if ('clipboardData' in event) {
						event.clipboardData?.setData(key, value);
					} else {
						event.dataTransfer?.setData(key, value);
					}
				}
			}
		};

		const copyToClipboardApi = () => {
			type DataType = Blob|Promise<Blob>;

			const mapInternalDataToBrowserData = (originalMimeToData: Map<string, string|Promise<Blob>>) => {
				const mappedMimeToData: Record<string, DataType> = Object.create(null);
				for (const [key, data] of originalMimeToData.entries()) {
					if (typeof data === 'string') {
						const loadedData = new Blob([new TextEncoder().encode(data)], { type: key });
						mappedMimeToData[key] = loadedData;
					} else {
						mappedMimeToData[key] = data;
					}

					// Different platforms have varying support for different clipboard MIME types:
					// - As of September 2024, image/svg+xml is unsupported on iOS
					// - text/html is unsupported on Chrome/Android (and perhaps Chrome on other platforms).
					//    - See https://issues.chromium.org/issues/40851502
					if (key === 'image/svg+xml') {
						mappedMimeToData['text/html'] ??= mappedMimeToData[key];
					}
				}

				return mappedMimeToData;
			};

			const removeUnsupportedMime = (originalMimeToData: Record<string, DataType>) => {
				const filteredMimeToData: Record<string, DataType> = Object.create(null);
				for (const [ key, data ] of Object.entries(originalMimeToData)) {
					// Browser support for ClipboardItem.supports is limited as of mid 2024. However, some browsers
					// that do support `.supports` throw an exception when attempting to copy an unsupported MIME type
					// (e.g. Firefox).
					const unsupported = 'supports' in ClipboardItem && typeof ClipboardItem.supports === 'function' && !ClipboardItem.supports(key);
					if (!unsupported) {
						filteredMimeToData[key] = data;
					}
				}

				return filteredMimeToData;
			};


			const browserMimeToData = removeUnsupportedMime(mapInternalDataToBrowserData(mimeToData));
			return navigator.clipboard.write([ new ClipboardItem(browserMimeToData) ]);
		};

		const supportsClipboardApi = (
			typeof ClipboardItem !== 'undefined'
			&& typeof navigator?.clipboard?.write !== 'undefined'
		);
		if (!this.#preferClipboardEvents && supportsClipboardApi && (hasNonTextMimeTypes || !event)) {
			let clipboardApiPromise: Promise<void>|null = null;

			const fallBackToCopyEvent = (reason: unknown) => {
				console.warn(
					'Unable to copy to the clipboard API. Future calls to .copy will use ClipboardEvents if possible.',
					reason
				);
				this.#preferClipboardEvents = true;

				copyToEvent(reason);
			};

			try {
				clipboardApiPromise = copyToClipboardApi();
			} catch (error) {
				fallBackToCopyEvent(error);
			}

			if (clipboardApiPromise) {
				return clipboardApiPromise.catch(fallBackToCopyEvent);
			}
		} else {
			copyToEvent();
		}

		return Promise.resolve();
	}
}
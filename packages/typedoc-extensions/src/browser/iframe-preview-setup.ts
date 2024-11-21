import * as jsdraw from 'js-draw';
import 'js-draw/styles';
import * as jsdrawMath from '@js-draw/math';
import * as jsdrawMaterialIcons from '@js-draw/material-icons';
import './iframe.scss';

window.addEventListener('load', () => {
	// Update height immediately after loading
	setTimeout(() => {
		const height = (document.scrollingElement ?? document.body).scrollHeight;
		parent.postMessage(
			{
				message: 'updateHeight',
				height,
				frameId: (window as any).frameId,
			},
			'*',
		);
	}, 0);
});

(() => {
	/** Creates an HTML element that contains the content of `message`. */
	const createLogElementFor = (message: any[]) => {
		const container = document.createElement('div');
		container.classList.add('log-item');

		for (const part of message) {
			const wrapper = document.createElement('span');

			if (typeof part === 'string') {
				wrapper.classList.add('text');
				wrapper.innerText = part;
			} else if (typeof part !== 'object' || part === null) {
				wrapper.innerText = JSON.stringify(part);
				wrapper.classList.add(typeof part);
			} else if (part instanceof jsdrawMath.Color4) {
				const colorSquare = document.createElement('span');
				colorSquare.classList.add('color-square');
				colorSquare.style.backgroundColor = part.toHexString();

				wrapper.appendChild(colorSquare);
				wrapper.appendChild(document.createTextNode(part.toString()));
			} else if (part instanceof jsdrawMath.Mat33) {
				wrapper.appendChild(document.createTextNode(part.toString()));
				wrapper.classList.add('matrix-output');
			} else {
				const details = document.createElement('details');
				details.style.display = 'inline-block';

				const summary = document.createElement('summary');
				summary.innerText = `${part}`;
				summary.style.cursor = 'pointer';

				const propertyList = document.createElement('ul');

				const addProperty = (key: string) => {
					const item = document.createElement('li');
					item.innerText = `${JSON.stringify(key)}: ${part[key]}`;
					propertyList.appendChild(item);
				};

				for (const key in part) {
					addProperty(key);
				}

				if (part instanceof Error) {
					try {
						addProperty('stack');
					} catch {
						// May fail
					}
				}

				details.replaceChildren(summary, propertyList);
				container.appendChild(details);
			}

			container.appendChild(wrapper);
		}
		return container;
	};

	const isConsoleMode = (window as any).mode === 'console';

	/** Adds a log element to the body. */
	const addLogElement = (elem: HTMLElement) => {
		if (isConsoleMode) {
			(document.body ?? document.documentElement).appendChild(elem);
		} else {
			(document.body ?? document.documentElement).insertAdjacentElement('afterbegin', elem);
		}
	};

	if (isConsoleMode) {
		document.documentElement.classList.add('console-view');

		// Redirect console. statements to the iframe.
		const origLog = console.log;
		console.log = (...args) => {
			origLog.call(this, args);
			addLogElement(createLogElementFor(args));
		};

		const origWarn = console.warn;
		console.warn = (...args) => {
			origWarn.call(this, args);
			const container = createLogElementFor(args);
			container.classList.add('warning');
			addLogElement(container);
		};

		const origError = console.warn;
		console.error = (...args) => {
			origError.call(this, args);
			const container = createLogElementFor(args);
			container.classList.add('error');
			addLogElement(container);
		};
	} else {
		document.documentElement.classList.add('html-view');
	}

	// Allows libraries included after this to require/include content.
	(window as any).require = (path: string) => {
		if (path === 'js-draw') {
			return jsdraw;
		} else if (path === '@js-draw/math') {
			return jsdrawMath;
		} else if (path === '@js-draw/material-icons') {
			return jsdrawMaterialIcons;
		}

		return {};
	};

	(window as any).module = { exports: {} };
	(window as any).exports = {};

	const onError = (event: Event | Error | string) => {
		const errorElement = createLogElementFor(['Error: ', event]);
		errorElement.classList.add('error');
		addLogElement(errorElement);
	};

	window.addEventListener('error', (event) => {
		onError(event.error ?? event.message);
	});

	window.addEventListener('unhandledrejection', (event) => {
		onError(event.reason ?? event);
	});
})();

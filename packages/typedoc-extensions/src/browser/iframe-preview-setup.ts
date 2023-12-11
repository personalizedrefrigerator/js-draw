
import * as jsdraw from 'js-draw';
import 'js-draw/styles';
import * as jsdrawMath from '@js-draw/math';
import * as jsdrawMaterialIcons from '@js-draw/material-icons';
import './iframe.scss';

window.addEventListener('load', () => {
	// Update height immediately after loading
	setTimeout(() => {
		const height = (document.scrollingElement ?? document.body).scrollHeight;
		parent.postMessage({
			message: 'updateHeight',
			height,
		}, '*');
	}, 0);
});

(() => {
	/** Creates an HTML element that contains the content of `message`. */
	const createLogElementFor = (message: any[]) => {
		const container = document.createElement('div');
		for (const part of message) {
			const wrapper = document.createElement('span');

			if (typeof part === 'string') {
				wrapper.classList.add('text');
				wrapper.innerText = part;
			}
			else if (typeof part !== 'object') {
				wrapper.innerText = JSON.stringify(part);
				wrapper.classList.add(typeof part);
			}
			else if (part instanceof jsdrawMath.Color4) {
				const colorSquare = document.createElement('span');
				colorSquare.classList.add('color-square');
				colorSquare.style.backgroundColor = part.toHexString();

				wrapper.appendChild(colorSquare);
				wrapper.appendChild(document.createTextNode(part.toString()));
			}
			else {
				const details = document.createElement('details');
				const summary = document.createElement('summary');
				summary.innerText = `${part}`;

				const propertyList = document.createElement('ul');

				for (const key in part) {
					const item = document.createElement('li');
					item.innerText = `${JSON.stringify(key)}: ${part[key]}`;
					propertyList.appendChild(item);
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
	}

	// Allows libraries included after this to require/include content.
	(window as any).require = (path: string) => {
		if (path === 'js-draw') {
			return jsdraw;
		}
		else if (path === '@js-draw/math') {
			return jsdrawMath;
		}
		else if (path === '@js-draw/material-icons') {
			return jsdrawMaterialIcons;
		}

		return {};
	};

	(window as any).module = { exports: {} };
	(window as any).exports = { };

	const onError = (event: Event|string) => {
		const errorElement = createLogElementFor(['Error: ', event]);
		errorElement.classList.add('error');
		addLogElement(errorElement);
	};

	window.onerror = (event) => {
		onError(event);
	};

	window.onunhandledrejection = (event) => {
		onError(event.reason ?? event);
	};
})();
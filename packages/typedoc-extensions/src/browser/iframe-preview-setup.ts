
import * as jsdraw from 'js-draw';
import 'js-draw/styles';
import * as jsdrawMath from '@js-draw/math';
import * as jsdrawMaterialIcons from '@js-draw/material-icons';

(() => {
	const logMessage = (message: any[]) => {
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

	const addLogElement = (elem: HTMLElement) => {
		if (isConsoleMode) {
			document.body.appendChild(elem);
		} else {
			document.body.insertAdjacentElement('afterbegin', elem);
		}
	};

	if (isConsoleMode) {
		document.documentElement.classList.add('console-view');

		// Redirect console. statements to the iframe.
		const origLog = console.log;
		console.log = (...args) => {
			origLog.call(this, args);
			addLogElement(logMessage(args));
		};

		const origWarn = console.warn;
		console.warn = (...args) => {
			origWarn.call(this, args);
			const container = logMessage(args);
			container.classList.add('warning');
			addLogElement(container);
		};

		const origError = console.warn;
		console.error = (...args) => {
			origError.call(this, args);
			const container = logMessage(args);
			container.classList.add('error');
			addLogElement(container);
		};
	}

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

	window.onerror = (event) => {
		const errorElement = logMessage(['Error: ', event]);
		errorElement.classList.add('error');
		addLogElement(errorElement);
	};

})();
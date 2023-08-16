
import * as jsdraw from 'js-draw';
import 'js-draw/styles';
import * as jsdrawMath from '@js-draw/math';
import * as jsdrawMaterialIcons from '@js-draw/material-icons';

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
	const errorElement = document.createElement('p');
	errorElement.innerText = 'Error: ' + event.toString();
	document.body.insertAdjacentElement('afterbegin', errorElement);
};

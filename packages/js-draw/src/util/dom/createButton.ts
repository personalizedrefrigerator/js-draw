import createElement from './createElement';

interface Options {
	onClick?: (event: MouseEvent) => void;
	text?: string;
	classList?: string[];
}

const createButton = ({ onClick, text, classList = [] }: Options = {}) => {
	const button = createElement('button', { type: 'button' });

	if (onClick) {
		button.onclick = onClick;
	}
	if (text) {
		button.textContent = text;
	}
	for (const className of classList) {
		button.classList.add(className);
	}

	return button;
};

export default createButton;

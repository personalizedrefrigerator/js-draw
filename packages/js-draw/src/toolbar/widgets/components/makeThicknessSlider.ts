import { toolbarCSSPrefix } from '../../constants';
import { ToolbarContext } from '../../types';

let idCounter = 0;

const makeThicknessSlider = (
	context: ToolbarContext,
	onChange: (value: number)=>void
) => {
	const container = document.createElement('div');

	const thicknessLabel = document.createElement('label');
	const thicknessInput = document.createElement('input');

	container.classList.add(`${toolbarCSSPrefix}thicknessSliderContainer`);

	// Give inputs IDs so we can label them with a <label for=...>Label text</label>
	thicknessInput.id = `${toolbarCSSPrefix}thicknessInput${idCounter++}`;

	thicknessLabel.innerText = context.localization.thicknessLabel;
	thicknessLabel.setAttribute('for', thicknessInput.id);

	// Use a logarithmic scale for thicknessInput (finer control over thinner strokewidths.)
	const inverseThicknessInputFn = (t: number) => Math.log10(t);
	const thicknessInputFn = (t: number) => 10**t;

	thicknessInput.type = 'range';
	thicknessInput.oninput = () => {
		onChange(thicknessInputFn(parseFloat(thicknessInput.value)));
	};
	container.appendChild(thicknessLabel);
	container.appendChild(thicknessInput);

	const setBounds = (min: number, max: number) => {
		const round = (value: number) => Math.round(value * 100) / 100;
		const sliderMin = round(inverseThicknessInputFn(min));
		const sliderMax = round(inverseThicknessInputFn(max));

		thicknessInput.min = `${sliderMin}`;
		thicknessInput.max = `${sliderMax}`;
		thicknessInput.step = `${(sliderMax - sliderMin) / 20}`;
	};

	setBounds(2, 400);

	return {
		container,
		addTo: (parent: HTMLElement) => {
			parent.appendChild(container);
		},
		setBounds,
		setValue: (thickness: number) => {
			thicknessInput.value = inverseThicknessInputFn(thickness).toString();
		},
	};
};

export default makeThicknessSlider;
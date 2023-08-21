import { Application, ParameterType } from 'typedoc';
import CustomTheme from './CustomTheme';

export const load = (app: Application) => {
	app.options.addDeclaration({
		name: 'sidebarReplacements',
		type: ParameterType.Object,
		help: 'maps sidebar link text to replacement text',
		defaultValue: {},
	});

	app.renderer.defineTheme('js-draw-theme', CustomTheme);
};

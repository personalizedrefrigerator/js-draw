import { DefaultTheme, Renderer } from 'typedoc';
import loadRendererHooks from './loadRendererHooks';

// See https://github.com/TypeStrong/typedoc/blob/master/internal-docs/custom-themes.md

class CustomTheme extends DefaultTheme {
	public constructor(renderer: Renderer) {
		super(renderer);

		loadRendererHooks(renderer, this.application.options);
	}
}

export default CustomTheme;

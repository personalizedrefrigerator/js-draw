import { DefaultTheme, NavigationElement, ProjectReflection, Renderer } from 'typedoc';
import loadRendererHooks from './loadRendererHooks';

// See https://github.com/TypeStrong/typedoc/blob/master/internal-docs/custom-themes.md

class CustomTheme extends DefaultTheme {
	public constructor(renderer: Renderer) {
		super(renderer);

		loadRendererHooks(renderer);
	}


	public override buildNavigation(project: ProjectReflection): NavigationElement[] {
		const options = this.application.options;
		const sidebarReplacements = options.getValue('sidebarReplacements') as Record<string, string>;
		const defaultNavigation = super.buildNavigation(project);

		const updateNavigationElement = (element: NavigationElement) => {
			if (element.children) {
				element.children.forEach(updateNavigationElement);
			}

			if (element.text in sidebarReplacements) {
				element.text = sidebarReplacements[element.text];
			}
		};

		for (const elem of defaultNavigation) {
			updateNavigationElement(elem);
		}

		return defaultNavigation;
	}
}

export default CustomTheme;

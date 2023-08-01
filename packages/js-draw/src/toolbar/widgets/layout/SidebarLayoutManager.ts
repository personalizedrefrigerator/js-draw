import { MutableReactiveValue, reactiveValueFromCallback, reactiveValueFromInitialValue } from '../../../util/ReactiveValue';
import { ToolbarLocalization } from '../../localization';
import { ToolMenu, WidgetContentLayoutManager, ToolMenuParent } from './types';

export default class SidebarLayoutManager implements WidgetContentLayoutManager {
	private visibleWidgetContent: MutableReactiveValue<ToolMenu|null> = reactiveValueFromInitialValue(null);


	public constructor(
		private setSidebarContent: (...content: HTMLElement[])=>void,
		private sidebarVisibility: MutableReactiveValue<boolean>,
		private announceForAccessibility: (text: string)=>void,
		private localization: ToolbarLocalization,
	) {

	}

	/** Creates a dropdown within `parent`. */
	public createToolMenu(parent: ToolMenuParent): ToolMenu {
		const contentElem = document.createElement('div');
		let result: ToolMenu|null = null;

		const visible = reactiveValueFromCallback(() => {
			return this.visibleWidgetContent.get() === result && this.sidebarVisibility.get();
		}, [ this.visibleWidgetContent, this.sidebarVisibility ]);

		result = {
			visible,
			requestShow: () => {
				this.sidebarVisibility.set(true);
				this.setSidebarContent(contentElem);
				this.announceForAccessibility(this.localization.dropdownShown(parent.getTitle()));
				this.visibleWidgetContent.set(result);
			},
			onToolActivated: () => {
				result?.requestShow();
			},
			requestHide: () => {
				if (visible.get()) {
					this.sidebarVisibility.set(false);
				}
			},
			appendChild: (item: HTMLElement) => {
				contentElem.appendChild(item);
			},
			clearChildren: () => {
				contentElem.replaceChildren();
			},
			destroy: () => {
				result?.requestHide();

				if (contentElem.parentElement) {
					contentElem.remove();
				}

				if (this.visibleWidgetContent.get() === result) {
					this.visibleWidgetContent.set(null);
				}
			},
		};

		return result;
	}
}
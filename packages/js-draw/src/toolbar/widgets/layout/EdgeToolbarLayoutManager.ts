import { MutableReactiveValue, ReactiveValue } from '../../../util/ReactiveValue';
import { ToolbarLocalization } from '../../localization';
import { ToolMenu, WidgetContentLayoutManager, ToolMenuParent } from './types';

export default class EdgeToolbarLayoutManager implements WidgetContentLayoutManager {
	private visibleWidgetContent: MutableReactiveValue<ToolMenu|null> = ReactiveValue.fromInitialValue(null);

	// @internal
	public constructor(
		private setSidebarContent: (...content: HTMLElement[])=>void,
		private sidebarTitle: MutableReactiveValue<string>,
		private sidebarVisibility: MutableReactiveValue<boolean>,
		private announceForAccessibility: (text: string)=>void,
		private localization: ToolbarLocalization,
	) {

	}

	/** Creates a dropdown within `parent`. */
	public createToolMenu(parent: ToolMenuParent): ToolMenu {
		const contentElem = document.createElement('div');
		let result: ToolMenu|null = null;

		const visible = ReactiveValue.fromCallback(() => {
			return this.visibleWidgetContent.get() === result && this.sidebarVisibility.get();
		}, [ this.visibleWidgetContent, this.sidebarVisibility ]);

		result = {
			visible,
			requestShow: () => {
				this.setSidebarContent(contentElem);
				this.sidebarTitle.set(parent.getTitle());

				// Set visibleWidgetContent first -- this causes the previously visible (if any)
				// item to not be sent a shown event.
				this.visibleWidgetContent.set(result);
				this.sidebarVisibility.set(true);

				this.announceForAccessibility(this.localization.dropdownShown(parent.getTitle()));
			},
			onToolActivated: () => {
				// TODO: Only request show when in sidebar mode
				//result?.requestShow();
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
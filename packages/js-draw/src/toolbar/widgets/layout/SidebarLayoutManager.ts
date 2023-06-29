import { ToolbarLocalization } from '../../localization';
import { WidgetContentDisplay, WidgetContentLayoutManager, WidgetContentParent } from './types';

export default class SidebarLayoutManager implements WidgetContentLayoutManager {
	private visibleWidgetContent: WidgetContentDisplay|null = null;


	public constructor(
		private setSidebarContent: (...content: HTMLElement[])=>void,
		private setSidebarVisible: (visible: boolean)=>void,
		private isSidebarVisible: ()=>boolean,
		private announceForAccessibility: (text: string)=>void,
		private localization: ToolbarLocalization,
	) {

	}

	/** Creates a dropdown within `parent`. */
	public createContentDisplay(parent: WidgetContentParent): WidgetContentDisplay {
		const contentElem = document.createElement('div');

		const result: WidgetContentDisplay = {
			requestShow: () => {
				this.setSidebarVisible(true);
				const header = document.createElement('h2');
				header.innerText = this.localization.toolProperties;
				this.setSidebarContent(header, contentElem);
				this.announceForAccessibility(this.localization.dropdownShown(parent.getTitle()));
				this.visibleWidgetContent = result;
				// this.sidebarContent.focus();
			},
			noteActivated: () => {
				result.requestShow();
			},
			requestHide: () => {
				if (result.isVisible()) {
					this.setSidebarVisible(false);
				}
			},
			isVisible: () => {
				return this.visibleWidgetContent === result && this.isSidebarVisible();
			},
			addItem: (item: HTMLElement) => {
				contentElem.appendChild(item);
			},
			clearChildren: () => {
				contentElem.replaceChildren();
			},
			destroy: () => {
				result.requestHide();

				if (contentElem.parentElement) {
					contentElem.remove();
				}

				if (this.visibleWidgetContent === result) {
					this.visibleWidgetContent = null;
				}
			}
		};

		return result;
	}
}
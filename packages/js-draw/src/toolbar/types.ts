import IconProvider from './IconProvider';
import type { ToolbarLocalization } from './localization';

export interface ActionButtonIcon {
	icon: Element;
	label: string;
}

export interface ToolbarContext {
	announceForAccessibility(text: string): void;
	localization: ToolbarLocalization;
	icons: IconProvider;
}

export interface ToolbarUtilsLocalization {
	help: string;
	helpScreenNavigationHelp: string;
	helpControlsAccessibilityLabel: string;
	helpHidden: string;
	next: string;
	previous: string;
	close: string;
}

export const defaultToolbarUtilsLocalization: ToolbarUtilsLocalization = {
	help: 'Help',
	helpHidden: 'Help hidden',
	next: 'Next',
	previous: 'Previous',
	close: 'Close',
	helpScreenNavigationHelp: 'Click on a control for more information.',
	helpControlsAccessibilityLabel: 'Controls: Activate a control to show help.',
};

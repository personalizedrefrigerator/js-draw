import createEditor from '../testing/createEditor';
import findNodeWithText from '../testing/findNodeWithText';
import { makeDropdownToolbar } from './DropdownToolbar';

describe('DropdownToolbar', () => {
	test('should default to using localizations from the editor', () => {
		const testLocalizationOverride = 'testing-testing-testing';
		const editor = createEditor({
			localization: {
				pen: testLocalizationOverride,
			},
		});
		const toolbar = makeDropdownToolbar(editor);
		toolbar.addDefaults();
		expect(findNodeWithText(testLocalizationOverride, editor.getRootElement()));
	});
});

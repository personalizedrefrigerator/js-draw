import { Mat33 } from '@js-draw/math';
import { ImageComponent } from '../../../components/lib';
import createEditor from '../../../testing/createEditor';
import { SelectionTool } from '../../../tools/lib';
import { makeDropdownToolbar } from '../../DropdownToolbar';
import InsertImageWidget from './InsertImageWidget';

// Exposes additional methods for testing
class TestInsertImageWidget extends InsertImageWidget {
	public getDropdownVisible() {
		return this.isDropdownVisible();
	}
	public toggleDropdownVisible() {
		this.setDropdownVisible(!this.isDropdownVisible());
	}
}

describe('InsertImageWidget/index', () => {
	test('should display the correct ALT text for a selected image', () => {
		const editor = createEditor();

		// Image setup
		const imageElem = new Image(10, 10);
		const testAltText = 'Alt text here';
		imageElem.setAttribute('alt', testAltText);
		const imageComponent = new ImageComponent({
			transform: Mat33.identity,
			image: imageElem,
			base64Url: '',
		});
		editor.dispatch(editor.image.addComponent(imageComponent));

		const selectionTool = editor.toolController.getMatchingTools(SelectionTool)[0];
		selectionTool.setSelection([imageComponent]);

		// Toolbar setup
		const toolbar = makeDropdownToolbar(editor);
		const toolWidget = new TestInsertImageWidget(editor);
		toolbar.addWidget(toolWidget);

		// Open the dropdown
		toolWidget.toggleDropdownVisible();
		expect(toolWidget.getDropdownVisible()).toBe(true);

		const altTextInputs = editor
			.getRootElement()
			.querySelectorAll<HTMLInputElement>('input[placeholder*="Image description"]');
		expect(altTextInputs).toHaveLength(1);

		const altTextInput = altTextInputs[0];
		expect(altTextInput.value).toBe(testAltText);
	});
});

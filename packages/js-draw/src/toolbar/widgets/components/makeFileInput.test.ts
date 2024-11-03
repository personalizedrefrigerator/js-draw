import firstElementAncestorOfNode from '../../../testing/firstElementAncestorOfNode';
import findNodeWithText from '../../../testing/findNodeWithText';
import IconProvider from '../../IconProvider';
import { defaultToolbarLocalization } from '../../localization';
import makeFileInput from './makeFileInput';

const mockContext = {
	announceForAccessibility: jest.fn(),
	localization: defaultToolbarLocalization,
	icons: new IconProvider(),
};

describe('makeFileInput', () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	test('should support custom file pickers', async () => {
		const customPickerAction = jest.fn(async (): Promise<File[] | null> => {
			return [new File(['test'], 'a-test.txt')];
		});
		const input = makeFileInput('FileInputLabel:', mockContext, { customPickerAction });
		input.addTo(document.body);

		expect(input.selectedFiles.get()).toMatchObject([]);

		// Should correctly label the input.
		const labelNode = findNodeWithText('FileInputLabel:', input.container);
		const labelElem = firstElementAncestorOfNode(labelNode);
		if (!labelElem) throw new Error('Could not find label.');
		expect(labelElem?.tagName).toBe('LABEL');

		// Clicking on the label should open the picker
		labelElem.click();
		await input.selectedFiles.waitForNextUpdate();
		expect(input.selectedFiles.get().map((f) => f.name)).toMatchObject(['a-test.txt']);

		// Should show the filename
		expect(findNodeWithText('a-test.txt', input.container)).toBeTruthy();

		// Should support selecting multiple files
		customPickerAction.mockImplementation(async () => [
			new File(['test'], 'a-test-1.txt'),
			new File(['test'], 'a-test-2.txt'),
		]);
		labelElem.click();

		await input.selectedFiles.waitForNextUpdate();
		expect(input.selectedFiles.get().map((f) => f.name)).toMatchObject([
			'a-test-1.txt',
			'a-test-2.txt',
		]);
		expect(findNodeWithText('a-test-1.txt\na-test-2.txt', input.container)).toBeTruthy();
		expect(findNodeWithText('browse', input.container)).toBeFalsy();

		// Clearing files externally should clear in the input
		input.selectedFiles.set([]);
		expect(findNodeWithText('browse', input.container)).toBeTruthy();
	});

	test('should support cancelling custom file picker actions', async () => {
		let cancelCounter = 0;
		const customPickerAction = jest.fn(async ({ setOnCancelCallback }) => {
			return new Promise<File[]>((resolve) => {
				setOnCancelCallback(() => {
					cancelCounter++;
					resolve([new File([''], 'test-file.txt')]);
				});
			});
		});

		const input = makeFileInput('Test input:', mockContext, { customPickerAction });
		input.addTo(document.body);

		const labelElem = firstElementAncestorOfNode(findNodeWithText('Test input:', input.container));
		if (!labelElem) throw new Error('Could not find label.');
		expect(labelElem?.tagName).toBe('LABEL');

		expect(findNodeWithText('browse', labelElem)).toBeTruthy();

		// Starting a long-running task with a cancel action should show a "cancel" button
		labelElem.click();
		expect(findNodeWithText('Loading...', labelElem)).toBeTruthy();
		expect(findNodeWithText('Cancel', labelElem)).toBeTruthy();
		expect(cancelCounter).toBe(0);

		// It should be possible to cancel the task.
		labelElem.click();
		expect(cancelCounter).toBe(1);
		expect(findNodeWithText('Cancel', labelElem)).toBeFalsy();

		// Should still add files if customPickerAction returned a non-null value.
		expect((await input.selectedFiles.waitForNextUpdate()).map((f) => f.name)).toMatchObject([
			'test-file.txt',
		]);

		// Shouldn't allow cancelling multiple times
		labelElem.click();
		expect(cancelCounter).toBe(1);

		// Instead, clicking again should restart the task
		expect(findNodeWithText('Cancel', labelElem)).toBeTruthy();

		// It should be possible to cancel the restarted task.
		labelElem.click();
		expect(cancelCounter).toBe(2);
		expect(findNodeWithText('Cancel', labelElem)).toBeFalsy();
	});
});

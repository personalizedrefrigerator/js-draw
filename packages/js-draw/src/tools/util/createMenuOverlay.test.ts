import { Vec2 } from '@js-draw/math';
import createEditor from '../../testing/createEditor';
import createMenuOverlay from './createMenuOverlay';
import findNodeWithText from '../../testing/findNodeWithText';
import firstElementAncestorOfNode from '../../testing/firstElementAncestorOfNode';

describe('createMenuOverlay', () => {
	test('should return the key for the clicked item', async () => {
		const editor = createEditor();
		const result = createMenuOverlay(editor, Vec2.zero, [
			{
				key: 'test',
				text: 'Item to be selected',
				icon: () => editor.icons.makeCopyIcon(),
			},
			{
				key: 'test2',
				text: 'Some other item',
				icon: () => editor.icons.makePasteIcon(),
			},
		]);

		const target = firstElementAncestorOfNode(
			findNodeWithText('Item to be selected', editor.getRootElement()),
		);
		if (!target) {
			throw new Error('Unable to find target item');
		}

		target.click();
		await jest.runAllTimersAsync();
		await expect(result).resolves.toBe('test');
	});
});

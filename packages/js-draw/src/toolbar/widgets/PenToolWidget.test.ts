import { PenTool } from '../../tools/lib';
import createEditor from '../../testing/createEditor';
import { makeDropdownToolbar } from '../DropdownToolbar';
import PenToolWidget, { PenTypeRecord } from './PenToolWidget';
import getLocalizationTable from '../../localizations/getLocalizationTable';

// Exposes protected methods for testing
class TestPenToolWidget extends PenToolWidget {
	public getDropdownVisible() {
		return this.isDropdownVisible();
	}
	public toggleDropdownVisible() {
		this.setDropdownVisible(!this.getDropdownVisible());
	}
}

describe('PenToolWidget', () => {
	test.each([
		{
			filter: (p: PenTypeRecord) => p.id === 'pressure-sensitive-pen',
			shouldFind: ['Flat'],
			shouldNotFind: ['Line', 'Outlined circle', 'Polyline'],
		},
		{
			filter: (p: PenTypeRecord) => p.id !== 'pressure-sensitive-pen',
			shouldFind: ['Line', 'Outlined circle', 'Polyline'],
			shouldNotFind: ['Flat'],
		},
	])(
		'should support hiding pen types with filterPenTypes (case %#)',
		({ filter, shouldFind, shouldNotFind }) => {
			const editor = createEditor({
				pens: {
					filterPenTypes: filter,
				},
				localization: getLocalizationTable(['en']),
			});
			const toolbar = makeDropdownToolbar(editor);

			const pen = editor.toolController.getMatchingTools(PenTool)[0];
			const toolWidget = new TestPenToolWidget(editor, pen);
			toolbar.addWidget(toolWidget);

			toolWidget.toggleDropdownVisible();
			expect(toolWidget.getDropdownVisible()).toBe(true);

			const opionExists = (name: string) => {
				return !!document.querySelector(`.toolbar-grid-selector *[title=${JSON.stringify(name)}]`);
			};

			for (const expected of shouldFind) {
				expect(opionExists(expected)).toBe(true);
			}
			for (const unexpected of shouldNotFind) {
				expect(opionExists(unexpected)).toBe(false);
			}

			editor.remove();
		},
	);
});

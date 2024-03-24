
import { EditorLocalization } from '../localization';

/**
 * Comments to help translators create translations.
 *
 * The key for each comment should be the same as is used in the
 * translation and original source records.
 */
const comments: Partial<Record<keyof EditorLocalization, string>> = {
	pen: 'Likely unused',
	dragAndDropHereOrBrowse: 'Uses {{curly braces}} to denote bold text',
	closeSidebar: 'Currently used as an accessibilty label',
};

export default comments;

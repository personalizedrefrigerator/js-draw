import AbstractComponent from '../AbstractComponent';
import { ImageComponentLocalization } from '../localization';

// Returns the description of all given elements, if identical, otherwise,
// returns null.
export default (localizationTable: ImageComponentLocalization, elems: AbstractComponent[]) => {
	if (elems.length === 0) {
		return null;
	}

	const description = elems[0].description(localizationTable);
	for (const elem of elems) {
		if (elem.description(localizationTable) !== description) {
			return null;
		}
	}
	return description;
};
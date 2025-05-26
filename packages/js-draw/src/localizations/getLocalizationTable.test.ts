import { defaultEditorLocalization } from '../localization';
import en from './en';
import es from './es';
import getLocalizationTable from './getLocalizationTable';

describe('getLocalizationTable', () => {
	it('should return the en localization for es_TEST', () => {
		expect(getLocalizationTable(['es_TEST']) === es).toBe(true);
	});

	it('should return the default localization for unsupported language', () => {
		expect(getLocalizationTable(['test']) === defaultEditorLocalization).toBe(true);
	});

	it('should return the first localization matching a language in the list of user locales', () => {
		expect(
			getLocalizationTable([
				'test_TEST1',
				'test_TEST2',
				'test_TEST3',
				'en_TEST',
				'notalanguage',
			]) === en,
		).toBe(true);
	});

	it('should return the default localization for unsupported language', () => {
		expect(getLocalizationTable(['test']) === defaultEditorLocalization).toBe(true);
	});

	it("should return first of user's supported languages", () => {
		expect(getLocalizationTable(['es_MX', 'es_ES', 'en_US']) === es).toBe(true);
	});
});

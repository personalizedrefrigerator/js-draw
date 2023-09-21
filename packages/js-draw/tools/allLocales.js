
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allLocales = require('../dist/cjs/localizations/getLocalizationTable').allLocales;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const comments = require('../dist/cjs/localizations/comments').default;


module.exports = {
	locales: allLocales,
	comments,
};

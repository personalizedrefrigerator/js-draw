module.exports = {
	'*.{js,mjs,cjs,ts,tsx}': ['eslint --fix', 'prettier --write --ignore-unknown'],
	'*.{md,json,yml,scss,css}': ['prettier --write --ignore-unknown'],
};

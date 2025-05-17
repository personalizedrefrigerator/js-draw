module.exports = {
	'*.{js,mjs,cjs,ts,tsx}': ['eslint --fix', 'prettier --write --ignore-unknown'],
	'*.{md,json,yml,scss,css,html}': ['prettier --write --ignore-unknown'],
};

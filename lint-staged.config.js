module.exports = {
	'*.{js,ts,tsx}': ['eslint --fix', 'prettier --write --ignore-unknown'],
	'*.{md,json,yml}': ['prettier --write --ignore-unknown'],
};

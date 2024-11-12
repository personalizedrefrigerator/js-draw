module.exports = {
	'*.{js,ts,tsx}': ['eslint --fix', 'prettier --write --ignore-unknown'],
	'*.{md,json}': ['prettier --write --ignore-unknown'],
};

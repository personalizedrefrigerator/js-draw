const htmlEscape = (text: string) => {
	return text
		.replace(/[&]/g, '&amp;')
		.replace(/[<]/g, '&lt;')
		.replace(/[>]/g, '&gt;')
		.replace(/["]/g, '&quot;');
};

export default htmlEscape;

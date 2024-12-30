/**
 * Escapes `text` for use in a regular expression. WARNING: May not escape all control characters.
 *
 * **Note**: When the built-in RegExp.escape works in NodeJS, this should be replaced.
 */
const regexEscape = (text: string) => text.replace(/[$^\\.*+?()[\]{}|/]/g, '\\$&');
export default regexEscape;

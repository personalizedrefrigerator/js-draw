// Main entrypoint for Webpack when building a bundle for release.

import '../styles';
import Editor from '../Editor';
import getLocalizationTable from '../localizations/getLocalizationTable';

export default Editor;
export { Editor, getLocalizationTable };
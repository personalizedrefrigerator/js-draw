import { RenderingMode } from '../rendering/Display';
import Editor from '../Editor';

/** Creates an editor. Should only be used in test files. */
export default () => {
	if (jest === undefined) {
		throw new Error('Files in the testing/ folder should only be used in tests!');
	}

	return new Editor(document.body, { renderingMode: RenderingMode.DummyRenderer });
};

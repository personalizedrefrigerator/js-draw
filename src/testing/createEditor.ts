import { RenderingMode } from '../rendering/Display';
import Editor from '../Editor';

export default () => new Editor(document.body, { renderingMode: RenderingMode.DummyRenderer });

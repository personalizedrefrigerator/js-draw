import loadExpectExtensions from './loadExpectExtensions';
loadExpectExtensions();
jest.useFakeTimers();

// jsdom doesn't support HTMLCanvasElement#getContext — it logs an error
// to the console. Make it return null so we can handle a non-existent Canvas
// at runtime (e.g. use something else, if available).
HTMLCanvasElement.prototype.getContext = () => null;
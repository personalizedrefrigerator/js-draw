// Note: Despite not using imports/exports, this file needs to be .cjs
// to work around a require() issue.

// TODO: This is added to support importing Editor despite its dependency on the
// coloris color picker. Remove these mocks after switching to a different color picker.
global.window = { addEventListener: () => {} };
global.document = { createElement: () => ({ getContext: () => null }) };
global.NodeList = undefined;

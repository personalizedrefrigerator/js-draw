// Yarn patches TypeScript to include a `require("module")`. This breaks bundling with ESBuild.
// To work around this, we remap the import to an empty file.
export default {};


// Compile-time assertion that a branch of code is unreachable.
// See https://stackoverflow.com/a/39419171/17055750
export const assertUnreachable = (key: never): never => {
    throw new Error(`Should be unreachable. Key: ${key}.`);
};
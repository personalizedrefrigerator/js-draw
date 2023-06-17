# Building and testing
`js-draw` uses `npm` as its build system and to manage dependencies. Thus, to install dependencies and build the project for the first time,
```bash
# After cloning the project,
bash$ cd path/to/js-draw

# Install dependencies
bash$ npm install

# Run tests
bash$ npm run test

# Run tests/re-run tests when files change
bash$ npm run test --watch

# Build documentation
bash$ npm run doc
```

## Running/building the example projects
First, switch to the `docs` directory:
```console
bash$ cd path/to/js-draw/
bash$ cd docs/
```

Next, `cd` to one of the example projects.

### Main example project
```bash
bash$ cd docs/demo/

# Install dependencies for the example project
bash$ npm install

# Re-build when files change
bash$ npm run watch

# If you're making changes to packages/js-draw, you may also want to run
# npm run watch in the packages/js-draw directory.
```

In a separate terminal, run a local web-server. Use the web-server to open the `example.html` file.
```bash
bash$ python3 -m http.server
```

### Collaborative editing project
```bash
bash$ cd docs/examples/example-collaborative/

# Re-build when files change
bash$ npm run watch
```

and in a separate terminal,
```bash
# Start the example project's server
bash$ python3 server.py
```

# Notable files and directories
> If this list is outdated, please open an issue.

- [`packages/js-draw/src/localizations`](https://github.com/personalizedrefrigerator/js-draw/tree/main/packages/js-draw/src/localizations) and [`getLocalizationTable.ts`](https://github.com/personalizedrefrigerator/js-draw/blob/main/packages/js-draw/src/localizations/getLocalizationTable.ts).
- [Stroke smoothing and geometric shape builders: `packages/js-draw/src/components/builders`](https://github.com/personalizedrefrigerator/js-draw/tree/main/packages/js-draw/src/components/builders)
- [Main app entrypoint: `packages/js-draw/src/Editor.ts`](https://github.com/personalizedrefrigerator/js-draw/blob/main/packages/js-draw/src/Editor.ts)
- [Default tools and sending events to them: `packages/js-draw/src/tools/ToolController.ts`](https://github.com/personalizedrefrigerator/js-draw/blob/main/packages/js-draw/src/tools/ToolController.ts)

# Code style

The coding style is, for the most part, enforced by a pre-commit hook.

Because `js-draw` was originally created as a part of a pull request for the Joplin note-taking app,
[it mostly follows Joplin's style guide](https://github.com/laurent22/joplin/blob/dev/readme/coding_style.md),
with the exception that TypeDoc-style comments (`/** */`) are permitted for documentation.

Note that `//`-style comments can also be used for documentation.

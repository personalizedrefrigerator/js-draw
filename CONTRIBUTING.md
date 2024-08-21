# Building and testing

`js-draw` uses [`yarn`](https://yarnpkg.com/getting-started/install) as its build system and to manage dependencies. Thus, to install dependencies and build the project for the first time,
```bash
# After cloning the project,
bash$ cd path/to/js-draw

# Install dependencies
bash$ yarn install

# Run tests
bash$ yarn run test

# Run tests/re-run tests when files change
bash$ yarn run test --watch

# Build documentation
bash$ yarn run doc
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
bash$ yarn install

# Re-build when files change
bash$ yarn run watch

# If you're making changes to packages/js-draw, you may also want to run
# yarn run watch in the packages/js-draw directory.
```

In a separate terminal, run a local web-server. Use the web-server to open the `example.html` file.
```bash
bash$ python3 -m http.server
```

### Collaborative editing project

```bash
bash$ cd docs/examples/example-collaborative/

# Re-build when files change
bash$ yarn run watch
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
[it mostly follows Joplin's style guide](https://github.com/laurent22/joplin/blob/dev/readme/dev/coding_style.md),
with the exception that TypeDoc-style comments (`/** */`) are encouraged for documentation.


**Notes**:
- `//`-style comments can also be used for documentation, but should be avoided.
- [Avoid directory imports](https://github.com/personalizedrefrigerator/js-draw/issues/70)
   - Use `import {Something} from './Test/index.ts'` instead of `import {Something} from './Test'`.

# Development FAQ
## How can I test changes to curve fitting for strokes?

As of the time of this writing, curve fitting related code lives in [`StrokeSmoother.ts`](https://github.com/personalizedrefrigerator/js-draw/tree/main/packages/js-draw/src/components/util/).

Here's one possible workflow for making and testing changes:

**Setup**:
1. Run `yarn install` in the project's root directory (if you haven't already)
2. Start the compiler in `watch` mode in both `packages/js-draw/` and `docs/debugging/input-system-tester`:
```bash
# Shell #1
$ cd packages/js-draw
$ yarn run watch

# Shell #2
$ cd docs/debugging/input-system-tester
$ yarn run watch
```
3. Start a development server in the `docs` directory
```bash
$ cd docs
$ python3 -m http.server
# ↑
# Should serve to http://localhost:8000/ by default
```

4. Open http://localhost:8000/debugging/input-system-tester/ in a web browser
5. Open https://js-draw.web.app/debugging/input-system-tester/ in a web browser

Additional notes:
- The `debugging/stroke-logging` utility allows pasting an input log into a textbox and playing back the input events, which may also be helpful here. This can be used to see how changes to `StrokeSmoother.ts` change the rendered output, for the same input.


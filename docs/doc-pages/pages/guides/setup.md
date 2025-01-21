---
title: Getting started
---

# Getting started

There are two main ways of adding `js-draw` to a project:

- With a JavaScript bundler (e.g. [ESBuild](https://esbuild.github.io/) or [Webpack](https://webpack.js.org/)).
- Using a CDN (e.g. jsdelivr).

> [!NOTE]
>
> Similar information can also be found in the [README](../../../../README.md)

## With a bundler

A JavaScript bundlers take the source files of your project (JavaScript, CSS, etc.), and convert them into a form that can be loaded by a browser. When used with a tool like `npm`, bundlers can simplify dependency management.

If you don't plan on adding a bundler to your project, skip to the [pre-bundled version](#using-a-pre-bundled-version) section.

### Adding `js-draw` as a dependency

From the same directory as your project's `package.json`, [npm install] js-draw:

```bash
$ npm install --save-dev js-draw
```

To also add the material icons dependency, also [npm install] `@js-draw/material-icons`:

```bash
$ npm install --save-dev @js-draw/material-icons
```

[npm install]: https://docs.npmjs.com/cli/v11/commands/npm-install

### With a bundler that supports importing `.css` files

To create a new `Editor` and add it as a child of `document.body`, use the [Editor](https://personalizedrefrigerator.github.io/js-draw/typedoc/classes/js-draw.Editor.html#constructor) constructor:

```ts,runnable
import Editor from 'js-draw';
import 'js-draw/styles';

const editor = new Editor(document.body);
editor.addToolbar();
```

The `import js-draw/styles` step requires a bundler that can import `.css` files. For example, [`webpack` with `css-loader`.](https://webpack.js.org/loaders/css-loader/)

### With a bundler that doesn't support importing `.css` files

Import the pre-bundled version of the editor to apply CSS after loading the page.

```ts,runnable
import Editor from 'js-draw';
import 'js-draw/bundledStyles';

const editor = new Editor(document.body);
editor.addToolbar();
```

`js-draw/bundledStyles` is a version of the editor's stylesheets pre-processed by `es-build`. As such, `import`ing or including it with a `<script src="..."></script>` tag applies editor-specific CSS to the document.

## Using a pre-bundled version

### CDN setup

While not recommended for production builds, using a CDN can make it easier to get started with `js-draw`.

```html,runnable
<!--
	Replace 1.27.1 with the latest version of js-draw, which should be {{!VERSION!}}.
-->
<script src="https://cdn.jsdelivr.net/npm/js-draw@1.27.1/dist/bundle.js"></script>
<script>
  const editor = new jsdraw.Editor(document.body);
  editor.addToolbar();
</script>
```

**Note**: To ensure the CDN-hosted version of `js-draw` hasn't been tampered with, consider [including an `integrity="..."` attribute](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity). [Read more about using SRI with JSDelivr](https://www.jsdelivr.com/using-sri-with-dynamic-files).

Of course, you can also self-host `bundle.js`.

## Next steps

See:

- {@link js-draw! | The README} includes an overview of several of the most significant `js-draw` APIs (e.g. loading and saving, adding a toolbar).
- {@link @js-draw/material-icons! | Changing the icon theme}.

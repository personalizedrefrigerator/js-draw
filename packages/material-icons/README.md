# `@js-draw/material-icons`

A material icon pack for `js-draw`.

The icons in this pack are licensed under the Apache 2.0 License. See [the icon pack's GitHub repository](https://github.com/google/material-design-icons).

## Usage

### With a bundler

If using a bundler (e.g. [`webpack`](https://webpack.js.org/)), it should be possible to add `@js-draw/material-icons` as a dependency and import it directly.

For example,

```ts
import Editor from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/bundledStyles';

const editor = new Editor(document.body, {
  iconProvider: new MaterialIconProvider(),
});

// Add a toolbar that uses the icons
editor.addToolbar();
```

### From a CDN

It's also possible to include `js-draw` and `@js-draw/material-icons` from a CDN.

For example, with JSDelivr,

```html
<script src="https://cdn.jsdelivr.net/npm/js-draw@1.23.1/dist/bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@js-draw/material-icons@1.23.1/dist/bundle.js"></script>
```

Then, in a script,

```js
// makeMaterialIconProviderClass provides @js-draw/material-icons with an instance of the js-draw library.
const MaterialIcons = jsdrawMaterialIcons.makeMaterialIconProviderClass(jsdraw);

const editor = new jsdraw.Editor(document.body, {
  iconProvider: new MaterialIcons(),
});
editor.addToolbar();
```

**Notes**:

- Above, `1.23.1` should be replaced with the latest versions of `js-draw` and `@js-draw/material-icons`.
- Consider including an [including an `integrity="..."` attribute](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) on the `<script>` tags. [Read more about using SRI with JSDelivr](https://www.jsdelivr.com/using-sri-with-dynamic-files).

---
title: Getting started
---

# Getting started

There are two main ways of adding `js-draw` to a project:

- With a JavaScript bundler (e.g. [ESBuild](https://esbuild.github.io/) or [Webpack](https://webpack.js.org/)).
- Using a CDN (e.g. jsdelivr).

## CDN setup

```html,runnable
<!-- Replace 1.27.1 with the latest version of js-draw -->
<script src="https://cdn.jsdelivr.net/npm/js-draw@1.27.1/dist/bundle.js"></script>
<script>
  const editor = new jsdraw.Editor(document.body);
  editor.addToolbar();
  editor.getRootElement().style.height = '600px';
</script>
```

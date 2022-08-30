
# 0.0.8
 * Map `ctrl+z` to undo, `ctrl+shift+Z` to redo.

# 0.0.7
 * Preserve SVG global attributes when loading/saving images.
    * This fixes a bug where lost information (e.g. a missing namespace) broke SVGs on export.

# 0.0.6
 * Fixes a bug that caused saved images to grow in size after loading them, then re-saving.
 * Stops the pressure decrease on pen-up events from preventing line/arrow objects from having variable width.

# 0.0.5
 * Configuration options:
   - Ability to disable touch panning
   - The `new Editor(container, ...)` constructor now takes a configuration object as its second argument.
 * A pre-bundled version of `js-draw` is now distributed.

# 0.0.4
 * Preset shapes
   * Arrow
   * Filled rectangle
   * Outlined rectangle
   * Line

# 0.0.2
 * Adjust default editor colors based on system theme.

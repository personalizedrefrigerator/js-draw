# 0.1.4
 * Option to enable pan gestures only if the editor has focus
 * Text tool bug fixes and improvements.
 * Defocus/blur editor when `Esc` key is pressed.

# 0.1.3
 * Very minimalistic text tool.
 * Ability to load and save text.
 * Fix a rounding bug where small strokes could be stretched/moved to the wrong locations.

# 0.1.2
 * Replace 'touch drawing' with a hand tool.
 * Bug fixes related to importing SVGs from other applications.

# 0.1.1
 * Avoid using the cache if working with smaller numbers of strokes.
 * Attempt to prevent stroke width being zero at some locations in thin strokes.

# 0.1.0
 * Zoom to import/export region just after importing.
 * Rendered strokes are cached if possible for better performance.

# 0.0.10
 * Prefer higher quality rendering except during touchscreen gestures and large groups of commands.
 * Add a "delete selection" button.

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

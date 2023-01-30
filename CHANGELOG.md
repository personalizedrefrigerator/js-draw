# 0.14.0
 * Adjust default snap distance.
 * Allow selection tool to mirror objects.
 * Bug fixes
   * Allow the meta key (cmd) to activate keyboard shortcuts. (E.g. cmd+a on MacOS should select all).
   * Fix extra moveTo command being converted to a string with some strokes.
   * Increase size of icons in newer versions of Safari (they had decreased in size).

# 0.13.1
 * Touchscreen panning: Rotation snapping
 * Bug fixes
   * Snap viewport rotation to multiples of 90° when touchscreen panning (and near a multiple of 90°).

# 0.13.0
 * Ctrl key: Snap to grid
 * New pen icons
 * Bug fixes:
   * Styling in output SVG: Prevent other renderers from collapsing multiple
     spaces into a single space.
   * Ends an in-progress stroke and adds it to the redo stack if ctrl+z is pressed while drawing a stroke.


# 0.12.0
 * Make the eraser's size adjustable.
 * Bug fixes:
   * Fixed a regression with the selection tool where pressing `Ctrl+D` while dragging the selection wouldn't duplicate at the selection's current location.
   * Fixed a regression where, in some browsers (Chrome, but not Firefox), editing a text component would duplicate that component.

# 0.11.3
 * Adjust default pen sizes.
 * Fix arrow/line icons being difficult to see with very thin stroke sizes.
 * Potential fix for content of current text input being discarded when clicking "save".
 * Loading images: Minor performance improvement.

# 0.11.2
 * Fix eraser regression: Erasing multiple strokes, one after another, caused strokes to un-erase.

# 0.11.1
 * Performance: Faster eraser and selection tools.
 * Bug fixes
   * Selection tool: Don't allow components to be in the selection multiple times.

# 0.11.0
 * Added a dialog for inserting images and changing existing image alt text.
 * Inertial scrolling: Workaround issue on some devices on touch gesture cancel.

# 0.10.3
 * Inertial scrolling: Don't start inertial scroll if a gesture was, in total, shorter than roughly 30 ms. Such gestures can be caused accidentally. For example, by resting/lifting a hand from a device screen.

# 0.10.2
 * Performance improvements

# 0.10.1
 * Different icons for rounded pens.
 * Bug fixes
   * Different pen types, for the same size, previously had different actual widths.
   * Inertial touchscreen scrolling previously sometimes started even if the initiating gesture was, just before stopping, stationary for several seconds.

# 0.10.0
 * Inertial touchscreen scrolling.
 * Bug fixes
   * Fixed keyboard shortcuts broken when undo/redo buttons are selected.
   * Fixed text objects saving with duplicate properties.
   * Fixed blank lines disappearing from text objects when attempting to edit a loaded-from-file text object.
 * Breaking changes
   * `HTMLToolbar::addActionButton` no longer takes a `parent` argument and returns a `BaseWidget`.

# 0.9.3
 * Decrease amount text shifts by when editing.
 * Text toolbar widget: Added a font size option.

# 0.9.2
 * Added a find dialog that can be opened with `ctrl+f`

# 0.9.1
 * Bug fixes:
  * Fix line tool producing an open shape. This caused issues with erasing and zooming in on these shapes.
  * Export SVG images with `fill='none'` instead of `fill='#00000000'` — some SVG readers ignore the transparency encoded in `#00000000`.

# 0.9.0
 * Allow saving toolbar widget state (see `HTMLToolbar#serializeState` and `HTMLToolbar#deserializeState`).
  * Breaking change: Toolbar widgets now require an `id`. As such, the order and number of parameters to `BaseWidget` has changed.
 * Add rotation lock button to hand toolbar widget.
 * Bug fixes
   * Fixed colors of color picker previews not matching value of the input (and thus not matching the actual color of the tool).
   * Fixed `Path::fromRect` producing an open shape. This caused issues with collision detection (for erasing and determining whether the rectangles should be visible).

# 0.8.0
 * Use non-pressure-sensitive strokes by default for most tools
   * These strokes should be have fewer bugs/issues than the pressure sensitive strokes.

# 0.7.2
 * Bug fixes
   * Fix multi-line text displaying in wrong position in exported SVGs.
   * Fix editing a different text node sometimes changing the color/font of the previous text node.

# 0.7.1
 * Fix scrollbars in text tool appearing when they should not (mostly in Chrome).

# 0.7.0
 * Text tool
   * Edit existing text.
   * Shift+enter to insert a new line.
   * Preserve multi-line text when loading/saving
 * Pen
   * Decrease smoothing amount for thick strokes.

# 0.6.0
 * Selection tool:
   * Shift+click extends a selection
   * `ctrl+d` duplicates selected objects
   * `ctrl+r` resizes the image to the selected region
   * `ctrl+a` selects everything (when the selection tool is enabled)
 * Panning tool: Toggle all device panning by clicking on the hand button.
 * `HandToolWidget` now expects, but does not require, a primary hand tool to work properly. See `ToolController#addPrimaryTool`.
 * **Breaiking changes:**
   * Icons are no longer accessible through `import {makeFooIcon} from '...'`. Use `editor.icons.makeFooIcon` instead.

# 0.5.0
 * Increase contrast between selection box/background
 * Keyboard shortcuts
   * `Ctrl+1` through `Ctrl+9`: Switch pen drawing mode.
     * For this to work, the `ToolbarShortcutHandler` must be loaded (and the toolbar must also be loaded).
 * Bug fixes
   * Fix text shifting away from strokes on paste.

# 0.4.1
 * Bug fixes
   * Fix in-progress strokes occasionally flickering and disappearing.
     * This was caused by a division-by-zero error.
   * Increase contrast between disabled and enabled buttons.
   * Copy selected text objects as text.

# 0.4.0
 * Moved the selection tool rotate handle to the top, added resize horizontally and resize vertically handles.
 * Selection-tool-related bug fixes
   * Reduced increase in file size after rotating/resizing selected objects.
   * Fix "resize to selection" button disabled when working with selections created by pasting.
 * Other bug fixes
   * Fix occasional stroke distortion when saving.

# 0.3.2
 * Embedded PNG/JPEG image loading
 * Copy and paste
 * Open images when dropped into editor
 * Keyboard shortcuts:
   * `Delete`/`Backspace` deletes selected content.
   * `Ctrl+C`, `Ctrl+V` for copy/paste.

# 0.3.1
 * Keyboard shortcuts:
   * Press `Ctrl+1` to select the first pen, `Ctrl+2` to select the second, etc.
   * When a pen is active, press `+` to increase a pen's size, `-` to decrease it.
 * Performance:
   * Cache `Path::toString` results for faster saving to SVG.

# 0.3.0
 * Pen-related bug fixes
 * API: Allow creating custom tools and tool widgets.

# 0.2.3
 * Fix lines with thickness set to small numbers self-intersecting many times.

# 0.2.2
 * Fix custon toolbar action buttons having wrong height.

# 0.2.1
 * German localization.

# 0.2.0
 * Export `Mat33`, `Vec3`, `Vec2`, and `Color4`.
 * [Documentation](https://personalizedrefrigerator.github.io/js-draw/typedoc/index.html)
 * Bug fixes:
   * After using up all blocks in the rendering cache, a single block was repeatedly re-allocated, leading to slow performance.

# 0.1.12
 * Add icons to the selection menu.
 * Screen-reader-related bug fixes.
 * Fix bug where parent cache nodes were not fully re-rendered after erasing a stroke and replacing it with more, larger strokes.
 * Generate strokes with single paths, instead of one path for each segment.
   * This should make new strokes take less space when saving to SVG because we don't need to store the edges for each part of the stroke.

# 0.1.11
 * Fix 'Enter' key not toggling toolbar buttons.
 * Add zoom limits.
 * Add a reset zoom button.

# 0.1.10
 * Keyboard shortcuts for the selection tool.
 * Scroll the selection into view while moving it with the keyboard/mouse.
 * Fix toolbar buttons not activating when focused and enter/space is pressed.
 * Partial Spanish localization.

# 0.1.9
 * Fix regression -- color picker hides just after clicking it.
 * Allow toggling the pipette tool.

# 0.1.8
 * Don't render if the screen has a size of 0x0.
   * This was breaking the cache data structure's invariant -- cache blocks weren't dividing when they had zero size.
 * Fix rectangles drawn with the pen's rectangle mode not having edges parallel to the viewport.

# 0.1.7
 * Show the six most recent color selections in the color palette.
 * Switch from checkboxes to togglebuttons in the dropdown for the hand tool.
 * Adds a "duplicate selection" button.
 * Add a pipette (select color from screen) tool.
 * Make `Erase`, `Duplicate`, `AddElement`, `TransformElement` commands serializable.

# 0.1.6
 * Fix loading text in SVG images in Chrome.

# 0.1.5
 * Add a text-only renderer (only renders text objects at present) that can be activated with a screen reader.
 * Make new text objects parallel to screen's horizontal axis.
 * Fix pinch zoom off center when embedded in larger page.

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

# 1.27.0 and 1.27.1

- Features:
  - Lasso selection ([#96](https://github.com/personalizedrefrigerator/js-draw/pull/96))
- Bug fixes:
  - Fix feature test for `WeakRef` fails within a browser extension ([#97](https://github.com/personalizedrefrigerator/js-draw/issues/97)).
- Stylistic changes:
  - Center box shadows in the default toolbar.
  - Vertically center icons for the right click menu.

# 1.26.0

- Bug fixes and improvements
  - **Selection tool**: Improved keyboard focus behavior when opening and closing the selection menu.
  - **Selection tool**: Increased touch target size for the selection menu button.
  - **Text tool**: Fixed text tool edits existing text in some cases when it shouldn't.
  - **API**: Fixed `EditorImage.getLeavesIntersectingRegion` sometimes included items with bounding boxes that do not intersect the target region.
  - **Collaborative editing**: Selection tool: Fix duplications created with <kbd>ctrl</kbd>+<kbd>d</kbd> while moving the selection failed to properly sync.
- Other changes
  - Updated the selection overflow menu icon to use IconProvider as the icon source.
  - Update license year
  - Migrated from Webpack to ESBuild.

# 1.25.0

- New APIs
  - Allow overriding the default global clipboard API using `EditorSettings`.
- Bug fixes
  - Prevent <kbd>enter</kbd> from finalizing `TextComponent`s if composing.
- Other changes
  - Allow `text/plain` clipboard data to be auto-detected as SVG when pasting.

# 1.24.2

- Bug fixes
  - Fixed: Nested text components were not rendered near the default maximum zoom level.
  - Optimized regular expression in `Mat33`.

# 1.24.0, 1.24.1

- New APIs:
  - Simplified API for positioning HTML elements above a canvas (https://github.com/personalizedrefrigerator/js-draw/commit/6bac2a3e9d5d72d4af92a46ea9dfbc3ef39e36df).
- Bug fixes
  - Optimized regular expressions (https://github.com/personalizedrefrigerator/js-draw/commit/c0d807be8689896bed5a935f780ddaed7885bb97).
  - Fix long lines in text editors can push the cursor out of the editor (https://github.com/personalizedrefrigerator/js-draw/commit/6bac2a3e9d5d72d4af92a46ea9dfbc3ef39e36df).

# 1.23.0, 1.23.1

- Features
  - `@js-draw/math`: Added `Color4.fromRGBArray`.
  - `@js-draw/material-icons`: Added option to create material icons for a specific instance/version of `js-draw`. This should allow including `@js-draw/material-icons` as a bundle directly from a CDN.
- Bug fixes
  - Fix notices specified in editor settings were not shown in the about dialog ([commit](https://github.com/personalizedrefrigerator/js-draw/commit/5a823f00791848a020df941bcbb77c4b43169127))
- Other changes
  - Rename "touchscreen panning" to "scroll with touch" in the default localization ([commit](https://github.com/personalizedrefrigerator/js-draw/commit/ecf23f24ea8b39b9970db87f71b9077e301f337d)).
  - Replace several instances of `.innerHTML` with calls to `.createElement` ([commit](https://github.com/personalizedrefrigerator/js-draw/commit/0970ab8bed05c4996e388b0730619f5053ea552f)).

# 1.22.0

- Features
  - Improved copy/paste error handling. If copy/paste from a UI button with the clipboard API fails, `js-draw` now attempts to use `document.execCommand`. Additionally, if `document.execCommand` fails, a section that allows manually copying images has been added to the error dialog.
  - Make rectangle, line, and arrow shape builders public. This allows selecting all built-in pen styles programmaticly.
  - Increased selection popover menu button size.
- Bug fixes
  - Pen tool menu: Hide "shape" or "pen type" selectors when they lack content.
  - Fix error when calling .flatten on a canvas-backed Display immediately after creating an editor.
- Other changes
  - Formatted the `js-draw` codebase with `prettier`.

# 1.21.3

- Bug fixes
  - Fix `tools/` directory incorrectly in `.npmignore`.

# 1.21.2

- Bug fixes
  - Fix copy icon is small when the selection context menu is opened near the screen edge.
  - Prevent selection from flashing when opening the context menu by long-pressing outside the selection box.
  - Remove from-root imports (`import ... from 'js-draw/...`).

# 1.21.0, 1.21.1

- Features
  - Selection popover menu with copy/paste/duplicate/delete.
  - Make selection keyboard shortcuts configurable.
  - Add keyboard shortcuts to scale the selection in both X and Y.
- Changes
  - Hide selection handles while creating selections.
- Bug fixes
  - Fix drawing strokes with stylus devices not marked as primary (#71).
  - Fix `<image>`s with an empty `href` cause rendering errors.

# 1.20.3

- Bug fixes
  - Fix importing `js-draw`, `js-draw/Editor`, etc. as an ES module.
  - Fix importing `js-draw/Editor` as a CommonJS module.
  - Fix rounding size was too large at some zoom levels with the polyline pen.

# 1.20.1 and 1.20.2

- Bug fixes
  - Image tool: Fix ALT text input applies ALT text to wrong images when multiple images are selected.

# 1.20.0

- Features
  - Added an additional scroll indicator when the image tool displays multiple images.
    - This works around [a lack of scrollbars in Android WebViews](https://issues.chromium.org/issues/40226034).
- Improvements
  - Improve performance when loading large images.

# 1.19.0, 1.19.1

- Features
  - Support adding multiple images at once from the image tool.
  - API to support customizing the default selectable fonts.
  - (Beta) Image tool: Support specifying a custom file picker.
- Bug fixes
  - Possible fix for eraser button not switching to the eraser tool on some devices.
  - Fix unable to render text with a multi-word font.
- Improvements
  - Decrease size of `Vec2`s in memory.

# 1.18.0

- Features
  - Partial stroke eraser.
  - Improve on and make the polyline pen one of the defaults.
  - Add an API to allow removing pen types from the toolbar.
- Bug fixes
  - Fix LineSegment2.intersects can return an incorrect value for very-near vertical lines
  - Fix `Vec3.eq` always returned `true` when comparing with `NaN` (e.g. `Vec3(NaN, NaN, NaN).eq(Vec3(1, 2, 3))` was `true`).
  - Fix autoresized images could incorrectly calculate the top-left corner of the full image in some cases.
- Improvements
  - Fix highlighter pen could include near-duplicate, overlapping copies of curves in its output.

# 1.17.0

- Features
  - Attach rendered versions of the selection to the clipboard on copy: Support pasting into more applications.
- Bug fixes
  - Deleting the first character in the background size dialog no longer resets the background size to 100.
  - Fix stroke width not set correctly by `SVGRenderer` when export zoom is not 100%.
  - Fixed copy/paste between Chrome and Firefox
- API
  - Simplify API for finding distance between points. (Add `.distanceTo` method).
  - Simplify API for changing the background of an image (`Editor.setBackgroundStyle`).

# 1.16.1

- Bug fixes
  - Fixes accessibility text possible to accidentally drag and drop into the editor. (https://github.com/personalizedrefrigerator/joplin-plugin-freehand-drawing/issues/8)

# 1.16.0

- Features
  - Snap zoom to powers of 10 when zooming with touch. This should make it easier to maintain a consistent zoom in some cases.
- Bug fixes
  - Collaborative editing: Fix exception thrown when undoing selection transforms that have been partially erased by another user.
  - Selection: Prevent the selection handles from being briefly visible at the top left corner of the screen when starting a new selection.
  - Viewing: Fix large strokes flicker while rotating the screen.

# 1.15.0

- Features
  - Added a "help" feature to the pen, select, and page tools.
  - Find tool: Search in image alt text, in addition to text boxes.
- Changes
  - Re-enable changes to stroke smoothing, with some adjustements to improve drawing many fast, small lines.
- Bug fixes
  - Fix animation for showing the help dialog has motion even when [`reduce-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) is enabled.

# 1.14.0

- Changes
  - Reverts recent changes to stroke smoothing. (Caused possible regressions while drawing fast, small lines.)

# 1.13.2

- Bug fixes
  - Fix "insert image" tool doesn't work in iOS lockdown mode.

# 1.13.1

- Changes
  - Slight stroke smoothing adjustment

# 1.13.0

- Bug fixes
  - Fix keyboard shortcuts don't work after closing tool menus by clicking away.
  - Fix tooltips don't disappear when triggered by touchscreens on some devices.
  - Fix main window scrolls when opening the toolbar (editor embedded in a page).
- Other changes & improvements
  - Further adjustments to stroke smoothing (fix regression: strokes not smoothed when input rate is very low).
  - Include device-pixel-ratio in debug information screen.

# 1.12.0

- Improvements
  - Stroke smoothing/curve fitting: Make it less likely for strokes to have large spikes when drawing very fast.
  - About dialog: Include full text of the MIT license for dependencies bundled with the app.

# 1.11.2

- Bug fixes
  - Fix drawing circles when a menu is open. Drawing while a menu is open should close the menu and allow the user to continue drawing. In this case, circles (and other shapes with start points roughly equivalent to their end points) were recognized as clicks.

# 1.11.1

- Bug fixes and improvements
  - Fix pressing <kbd>shift</kbd> not immediately allowing selections to snap to the x/y axes on drag.
  - Decrease blurriness on high resolution displays at some zoom levels.
  - Slightly increase the maximum motion required to trigger autocorrect. It was previously difficult to trigger autocorrect on some devices.
  - Fix color picker toggle button's clickable region was smaller than the visible button.
  - Update Coloris.
  - Fix icons not fading correctly when disabled on some devices.

# 1.11.0

- Features
  - Associate a keyboard shortcut with "Exit" (<kbd>Alt</kbd>-<kbd>Q</kbd>) and allow re-assigning it.
  - Adds a keyboard shortcut for "send selection to back"
- Changes
  - Fixed `AbstractToolbar.addDefaultToolWidgets` not always adding tool widgets in the correct order.
    - To be consistent with keyboard shortcuts, tools should be added in the same order that they appear in the
      list of primary tools.
- Bug fixes
  - Fixed selection z-index not reset when undoing a deserialized selection transform command.

# 1.10.0

- Features
  - Added autocorrect for strokes &mdash; holding the pen stationary after drawing replaces near-rectangles and lines with lines and rectangles.
  - Added a "decrease image size" button to the image dialog to decrease the size of large images.
- Bug fixes
  - Fixed: some tools unusable were unusable in right-to-left layout mode

# 1.9.1

- Bug fixes
  - Fix color selector tool broken on displays with `window.devicePixelRatio` not equal to 1.
- Improvements
  - Work around possible division-by-zero errors in setting transforms by resetting the transform and logging a warning. Previously, this was unrecoverable.

# 1.9.0

- Performance improvements
  - Don't render components that will be completely covered by other (opaque) components in more cases.
  - Fix some browsers unable to garbage collect the SVG DOM element that an `EditorImage` was loaded from (when garbage collection should be okay).
- Improvements
  - Support high resolution displays

# 1.8.0

- Features and improvements
  - Increased the minimum pinch rotation required to start rotation.
  - Performance improvement when zooming in to large strokes (particularly when these strokes are opaque).
- Bug fixes
  - Fixed some rendering-cache-related display issues.

# 1.7.2

- Changes
  - Hide `(js-draw v{{version}})` in about dialog if the application provides a custom description.

# 1.7.1

- Bug fixes
  - Selection: Make it more difficult to accidentally trigger the "rotate 90 degrees counter-clockwise feature" when dragging the rotate handle.

# 1.7.0

- Features and improvements
  - Selection tool
    - Improved autoscroll while dragging/transforming large selections
    - Decreased visible size of most selection handles ([see discussion](https://github.com/personalizedrefrigerator/js-draw/discussions/38))
    - Mapped clicking the rotate handle to a counter-clockwise rotation of 90 degrees (matching the icon).
  - Show more information in the about dialog.
  - Performance improvement when zooming in near the endpoints of a large, stroked (and not filled) stroke.
- Bug fixes
  - Fix inability to select immediately after touchscreen pinch zooming with an existing selection.
  - Fix selection boundary visible outside of the editor on pages where the editor isn't fullscreen.
  - Fix close/exit icon in the material icon pack's size in the dropdown toolbar.
  - Fix modifier keys (`shift`, `ctrl`, etc.) not registered as pressed if first pressed before focusing the editor.

# 1.6.1

- Bug fixes
  - Fix selected items not moved to the top of an image on click.
- Changes
  - Dependency upgrades ([929349a9cde63a8d286bd3a3467cce9a8ba5476e](https://github.com/personalizedrefrigerator/js-draw/commit/929349a9cde63a8d286bd3a3467cce9a8ba5476e) and [ae6b04f53dcddce86fce6c1554f35f3eaa99899f](https://github.com/personalizedrefrigerator/js-draw/commit/ae6b04f53dcddce86fce6c1554f35f3eaa99899f))

# 1.6.0

- Features
  - Allow specifying a custom app name and version in `EditorSettings` for the about dialog.
  - Improve the `ToolController` API for adding/removing tools
- Bug fixes
  - Keyboard shortcut handling: Fix keyup events potentially triggered more times each time the editor loses focus.
  - Toolbar: Fix pressing space not toggling dropdowns after switching toolbars.
  - Toolbar: Fix tool widgets not set to selected when first added to the toolbar when enabled.
  - Toolbar: Fix small (1px) space between the toolbar and rendered content
  - Material icon integration: Fix rounded pen icon has flat stroke edges.
  - SVGLoader: Support loading SVGs within sandboxed `iframes`.
  - Collaborative editing: Fix inverted `Erase` commands having no effect after serialized then deserialized.

# 1.5.0

- Bug fixes
  - Make tooltips less likely to appear when scrolling the toolbar with touch.
  - Fix empty selection transformations added to the undo stack.
  - Fix diagonal resize cursors appearing as "shrink diagonally" on MacOS and possibly other systems.
- Other improvements
  - Allow changing the icon/label of "Save" and "Exit" buttons
  - Move "Exit" to the left of "Save" by default
  - Make the "Save"/"Exit" icons closer to the text size

# 1.4.1

- Bug fixes
  - Fix `minDimension` argument not resizing the background when `toSVG` was called on an empty, auto-resizing image.

# 1.4.0

- Featrues
  - `Editor::toSVG` now allows specifying a minimum output dimension.
  - Added `Editor::toSVGAsync`.
  - Added support for read-only editors (see `Editor::setReadOnly`). Note that this feature only attempts to prevent a user from editing the image (and doesn't protect from edits via the API).
  - Change the cursor to a resize icon when hovering over selection resize boxes.
- Localization
  - Improved Spanish localization.
- Bug fixes
  - Navigation: Prevent app from entering an invalid state (and thus breaking navigation) when scrolling very far away from (0,0) then zooming in.
  - Edge toolbar
    - Fix: Save/close buttons were extra wide on some screen sizes in Safari.
    - Fix: Padding not adjusted for scroll when icons are all on one line. When working properly, the rightmost icon should be roughly half visible to indicate scroll.

# 1.3.1

- Bug fixes
  - Fix grid lines disappearing when zooming and autoresize enabled
  - Fix very small image/text elements moving on save/reload

# 1.3.0

- Features
  - Adds support for images with full-screen backgrounds and no border (see `EditorImage.setAutoresizeEnabled`). These drawings automatically resize to fit what has been drawn when saved.
  - Scrollbars within the editor. These scrollbars are currently read-only.
- Bug fixes
  - Fix ctrl+scroll zoom rate is significantly faster than pinch zooming.
  - Fix zoom level jumping when attempting to zoom outside of zoom limits with a touchscreen.
  - Fix elements intersecting the selection rectangle not recognized as selected in some cases.
  - Fix context menu sometimes shown when long-pressing toplevel buttons in the sidebar toolbar (rather than showing the button's tooltip).
- Other changes
  - Slightly faster loading of large SVGs.

# 1.2.2

- API fixes
  - Exports `pathToRenderable`, `pathFromRenderable`, and `pathVisualEquivalent`. These functions were renamed in version 1.0.0 and the new versions were not exported.
- Bug fixes
  - Updates the grid selector widget to use the correct icon foreground for selected items.

# 1.2.1

- Bug fixes
  - Fix `adjustEditorThemeForContrast` not ensuring that the selection and the main toolbar background have sufficient contrast.

# 1.2.0

- Features
  - Added additional `Color4` utility functions ([`fromHSV`](https://personalizedrefrigerator.github.io/js-draw/typedoc/classes/_js-draw_math.Color4.html#fromHSV), [`fromRGBVector`](https://personalizedrefrigerator.github.io/js-draw/typedoc/classes/_js-draw_math.Color4.html#fromRGBVector), [`contrastRatio`](https://personalizedrefrigerator.github.io/js-draw/typedoc/classes/_js-draw_math.Color4.html#contrastRatio), and [`.rgb`](https://personalizedrefrigerator.github.io/js-draw/typedoc/classes/_js-draw_math.Color4.html#rgb)).
  - Added [`adjustEditorThemeForContrast`](https://personalizedrefrigerator.github.io/js-draw/typedoc/functions/js-draw.adjustEditorThemeForContrast.html) function.
- Other changes
  - Prefers `transform` to `translation` when setting the position of the edge toolbar for compatibility with older browsers.

# 1.1.0

- Features
  - Bind `ctrl+s` (or `meta+s`) to the save action, if added with [`AbstractToolbar.addSaveButton`](https://personalizedrefrigerator.github.io/js-draw/typedoc/classes/js-draw.AbstractToolbar.html#addSaveButton).
- Bug fixes
  - Edge toolbar: Fix edge menu text using incorrect CSS variable (it should use `--foreground-color-2` to match `--background-color-2`).

# 1.0.2

- Fix `.npmignore` allowing some unnecessary files.

# 1.0.1

- Removes default link from the about screen.
  - `js-draw` can run in contexts where links are not expected.
- Fixes peer dependency version for `@js-draw/material-icons`

# 1.0.0

Special thanks to:

- [Joplin SAS](https://joplinapp.org/) for supporting the development of this release
- Marta Le Colloec (@MartaLC) for [designing the new toolbar!](https://www.figma.com/file/NA5F2AMWO3wUuaoDfUaAb8/Material-3-wireframes?type=design&node-id=54490%3A1103&mode=design&t=Ee0UwnPnQ2bNC2uM-1)

Breaking changes (see [the migration guide](https://js-draw.web.app/typedoc/modules/Additional_Documentation.MigratingToVersion1__.html))

- The `--secondary-foreground-color` and `--secondary-background-color` are no longer used for selected items. Use `--selection-foreground-color` and `--selection-background-color` instead.
- The `Pen` constructor now accepts parameters in a different format — the `PenStyle` should contain the pen factory.
- Timestamps in `Pointer`s and `StrokeDataPoint`s use `performance.now` instead of `Date.now`.
- A more specific selector than `.imageEditorContainer` is now required to override the `width` and `height` of an editor. Use `.js-draw.imageEditorContainer` or `body .imageEditorContainer`.

Other changes

- New default toolbar (see [makeEdgeToolbar](https://personalizedrefrigerator.github.io/js-draw/typedoc/functions/js-draw.makeEdgeToolbar.html)).
- New material icon pack
- Preserve `<g>` element parents when writing SVGs.
- Fix: Editor thinks control key is still pressed after shortcuts like `ctrl+Tab` that defocus the editor before a keyup event is sent for `ctrl`.

# 0.25.1

- Bug fixes
  - Fixes a bug in old versions of Chromium-based browsers: Strokes disappear on left mouse button up.

# 0.25.0

- Bug fixes
  - Fix strokes sometimes not scaling correctly when zooming.
  - _Possible_ fix for pen strokes being canceled on some devices (#23).
- Other changes
  - New UI for pen subtypes.

# 0.24.1

- Bug fixes
  - Fixed a regression from v0.24.0: Some key combinations were recognized incorrectly. For example, `r` and `R` both, by default, caused the screen to rotate in the same direction (rather than opposite directions).

# 0.24.0

- Bug fixes
  - Fix italic `<text ...></text>` objects not supported.
- Features
  - Support rendering relatively positioned text loaded from SVGs.
  - New drawable shape: circle. (Note, however, that SVG ellipses/elliptical arcs are **not** yet suppported.)
  - Exposes an API that allows configuration of _some_ keyboard shortcuts.

# 0.23.1

- Bug fixes
  - Fix regression: overflow menu in toolbar could be pushed off screen on window resize.
  - Fix animations running despite `prefers-reduced-motion` being set to `reduce`.
  - Fix `TextWidget` content duplicating when added to/removed from overflow widget.

# 0.23.0

- Bug fixes
  - Fix background disappearing when near maximum zoom in certain images.
  - Fix default pen size not matching zoom when repeatedly drawing dots.
- Features/enhancements
  - Animations for showing/hiding dropdowns in the toolbar.
  - Lock drawing/selection transformation to the x or y axis when holding `shift`

# 0.22.1

- Bug fixes
  - Fix color picker not having keyboard focus on open.
  - Fix screen readers not reading whether a toggle button was enabled/disabled.
  - Work around a command serialization/deserialization issue by caching the serialized form of commands in some instances.

# 0.22.0

- Improved German localization (thanks to @Mr-Kanister)
- Behavior changes
  - Closing the color picker:
    - Don't draw when the user **clicks** on the canvas to close the color picker. Drawing is still done if the user clicks and drags.
- Bug fixes
  - Fix eraser flickering while erasing strokes.
  - Fix in-progress strokes flickering during collaborative editing when incoming strokes are added to the editor.

# 0.21.0

- Color picker (adjustments to integration of the [Coloris library](https://github.com/melloware/coloris-npm))
  - Allow the user to start drawing without an extra click when closing the color picker.
  - Increase the size of sliders' touch targets for easier selection.
- Adjust stroke smoothing: Strokes should now be closer to user input.
- Erasing and selecting: Use the edge rather than the center of strokes to determine eraser/selection intersection.
  - This was previously only the case for filled strokes (as produced by the flat-tip pen).

# 0.20.0

- Added option for grid-patterned background.

# 0.19.0

- (Experimental) Sound-based image browsing.
  - Pressing tab repeatedly shows an "Enable sound-based exploration" button. Clicking this button plays a sound when a user subsequently clicks on the canvas. The sound is based on the color under the cursor.
- Fixed
  - Pinch-zooming on a trackpad would zoom in to a point roughly 50px below the cursor.
  - Buttons accessible only by pressing "tab" repeatedly were hidden behind the editor's canvas in some browsers.

# 0.18.2

- Fix essential files missing from NPM.

# 0.18.1

- Fix CommonJS module imports for some usecases.
  - Adds `@babel/runtime` as a dependency, which seems to be required to process some `require` calls.

# 0.18.0

- Publish both CommonJS and ES Modules
- Fix ES module imports.

# 0.17.4

- Fix `CanvasRenderer` and `SVGRenderer` not exported.
- Fix pasting images copied from js-draw into some external apps.
  - Pasting selected items from `js-draw` still doesn't work for many apps.

# 0.17.3

- Fix `isRestylableComponent` not exported.
- Add a method to get the `Editor`'s average background color.

# 0.17.2

- Bug fixes
  - TextComponent: Fix sub-components not cloning when cloning a parent `TextComponent`
    - This was causing duplicated `TextComponent`s to have, in part, the same styles as the original, even after attempting to restyle them with the restyle tool.
  - Find tool: Don't add viewport transformations to the undo stack.
  - Collaborative editing: Fix changing background size/location not synced between editors.
  - Upgrades dependencies to latest versions ([see commit for details](https://github.com/personalizedrefrigerator/js-draw/commit/427a64037320ca96232d47f268258206398f3796))

# 0.17.1

- Bug fixes
  - [Only partially fixed] Fix restyling duplicated TextComponents also restyling the original.
  - Fix contents of overflow menu not changing on screen resize if the overflow menu was open.

# 0.17.0

- Breaking changes
  - `SerializableCommand::serialize` may no longer serialize accurately when the command to serialize is not on top of the undo/redo stack. (This change was made to improve performance.)
- Toolbar overflow menu:
  - Prefer horizontal menu to veritcal for only 1-2 overflow items.
  - Prefer wrapping to scrolling.
- Bug fixes
  - Undo/redo events are now consistently fired after the command is initially applied.

# 0.16.1

- Bug fixes
  - Fix editor not shrinking vertically in Chromium-based browsers with its container.
  - Fixes an issue where (on some devices), `tspan`s could grow in font-size when loading from an SVG.
  - Fix spacers not added in the correct locations in the toolbar.

# 0.16.0

- Configurable background color.
- Toolbar buttons are moved to an overflow menu instead of creating a second (or third) line of buttons.
  - Buttons are still moved to a second row on tall screens.

# 0.15.2

- Bug fixes
  - Don't select/erase objects that have `isSelectable` set to `false`.
    - Previously, some objects used to store information about the image (e.g. attributes on the root `svg` object) could be selected and erased.
  - Round points created by rectangle, arrow, and line tools to prevent unnecessary decimal places in the output.
  - Performance improvement while zooming in on strokes.
  - Fix view jumping while zooming in/rotating with touchscreen pan tool.

# 0.15.1

- Bug fixes
  - Correctly restore the z-index of components on undo.
  - Fix selection collapsing to a point on two-finger pan gesture.
  - Move buttons into view when they don't fit on the screen

# 0.15.0

- Adds a "reformat selection" button that allows changing the color of the selection.
- Bug fixes:
  - Fix ctrl+A not selecting when the selection tool isn't active.
  - Fix ctrl+A selecting text when a toolbar button has focus.
  - Fix incorrect z-order on undo of many-object transform (e.g. dragging objects on top of a background, then undoing, could leave the objects below the background).

# 0.14.0

- Adjust default snap distance.
- Allow selection tool to mirror objects.
- Bug fixes
  - Allow the meta key (cmd) to activate keyboard shortcuts. (E.g. cmd+a on MacOS should select all).
  - Fix extra moveTo command being converted to a string with some strokes.
  - Increase size of icons in newer versions of Safari (they had decreased in size).

# 0.13.1

- Touchscreen panning: Rotation snapping
- Bug fixes
  - Snap viewport rotation to multiples of 90° when touchscreen panning (and near a multiple of 90°).

# 0.13.0

- Ctrl key: Snap to grid
- New pen icons
- Bug fixes:
  - Styling in output SVG: Prevent other renderers from collapsing multiple
    spaces into a single space.
  - Ends an in-progress stroke and adds it to the redo stack if ctrl+z is pressed while drawing a stroke.

# 0.12.0

- Make the eraser's size adjustable.
- Bug fixes:
  - Fixed a regression with the selection tool where pressing `Ctrl+D` while dragging the selection wouldn't duplicate at the selection's current location.
  - Fixed a regression where, in some browsers (Chrome, but not Firefox), editing a text component would duplicate that component.

# 0.11.3

- Adjust default pen sizes.
- Fix arrow/line icons being difficult to see with very thin stroke sizes.
- Potential fix for content of current text input being discarded when clicking "save".
- Loading images: Minor performance improvement.

# 0.11.2

- Fix eraser regression: Erasing multiple strokes, one after another, caused strokes to un-erase.

# 0.11.1

- Performance: Faster eraser and selection tools.
- Bug fixes
  - Selection tool: Don't allow components to be in the selection multiple times.

# 0.11.0

- Added a dialog for inserting images and changing existing image alt text.
- Inertial scrolling: Workaround issue on some devices on touch gesture cancel.

# 0.10.3

- Inertial scrolling: Don't start inertial scroll if a gesture was, in total, shorter than roughly 30 ms. Such gestures can be caused accidentally. For example, by resting/lifting a hand from a device screen.

# 0.10.2

- Performance improvements

# 0.10.1

- Different icons for rounded pens.
- Bug fixes
  - Different pen types, for the same size, previously had different actual widths.
  - Inertial touchscreen scrolling previously sometimes started even if the initiating gesture was, just before stopping, stationary for several seconds.

# 0.10.0

- Inertial touchscreen scrolling.
- Bug fixes
  - Fixed keyboard shortcuts broken when undo/redo buttons are selected.
  - Fixed text objects saving with duplicate properties.
  - Fixed blank lines disappearing from text objects when attempting to edit a loaded-from-file text object.
- Breaking changes
  - `HTMLToolbar::addActionButton` no longer takes a `parent` argument and returns a `BaseWidget`.

# 0.9.3

- Decrease amount text shifts by when editing.
- Text toolbar widget: Added a font size option.

# 0.9.2

- Added a find dialog that can be opened with `ctrl+f`

# 0.9.1

- Bug fixes:
- Fix line tool producing an open shape. This caused issues with erasing and zooming in on these shapes.
- Export SVG images with `fill='none'` instead of `fill='#00000000'` — some SVG readers ignore the transparency encoded in `#00000000`.

# 0.9.0

- Allow saving toolbar widget state (see `HTMLToolbar#serializeState` and `HTMLToolbar#deserializeState`).
- Breaking change: Toolbar widgets now require an `id`. As such, the order and number of parameters to `BaseWidget` has changed.
- Add rotation lock button to hand toolbar widget.
- Bug fixes
  - Fixed colors of color picker previews not matching value of the input (and thus not matching the actual color of the tool).
  - Fixed `Path::fromRect` producing an open shape. This caused issues with collision detection (for erasing and determining whether the rectangles should be visible).

# 0.8.0

- Use non-pressure-sensitive strokes by default for most tools
  - These strokes should be have fewer bugs/issues than the pressure sensitive strokes.

# 0.7.2

- Bug fixes
  - Fix multi-line text displaying in wrong position in exported SVGs.
  - Fix editing a different text node sometimes changing the color/font of the previous text node.

# 0.7.1

- Fix scrollbars in text tool appearing when they should not (mostly in Chrome).

# 0.7.0

- Text tool
  - Edit existing text.
  - Shift+enter to insert a new line.
  - Preserve multi-line text when loading/saving
- Pen
  - Decrease smoothing amount for thick strokes.

# 0.6.0

- Selection tool:
  - Shift+click extends a selection
  - `ctrl+d` duplicates selected objects
  - `ctrl+r` resizes the image to the selected region
  - `ctrl+a` selects everything (when the selection tool is enabled)
- Panning tool: Toggle all device panning by clicking on the hand button.
- `HandToolWidget` now expects, but does not require, a primary hand tool to work properly. See `ToolController#addPrimaryTool`.
- **Breaiking changes:**
  - Icons are no longer accessible through `import {makeFooIcon} from '...'`. Use `editor.icons.makeFooIcon` instead.

# 0.5.0

- Increase contrast between selection box/background
- Keyboard shortcuts
  - `Ctrl+1` through `Ctrl+9`: Switch pen drawing mode.
    - For this to work, the `ToolbarShortcutHandler` must be loaded (and the toolbar must also be loaded).
- Bug fixes
  - Fix text shifting away from strokes on paste.

# 0.4.1

- Bug fixes
  - Fix in-progress strokes occasionally flickering and disappearing.
    - This was caused by a division-by-zero error.
  - Increase contrast between disabled and enabled buttons.
  - Copy selected text objects as text.

# 0.4.0

- Moved the selection tool rotate handle to the top, added resize horizontally and resize vertically handles.
- Selection-tool-related bug fixes
  - Reduced increase in file size after rotating/resizing selected objects.
  - Fix "resize to selection" button disabled when working with selections created by pasting.
- Other bug fixes
  - Fix occasional stroke distortion when saving.

# 0.3.2

- Embedded PNG/JPEG image loading
- Copy and paste
- Open images when dropped into editor
- Keyboard shortcuts:
  - `Delete`/`Backspace` deletes selected content.
  - `Ctrl+C`, `Ctrl+V` for copy/paste.

# 0.3.1

- Keyboard shortcuts:
  - Press `Ctrl+1` to select the first pen, `Ctrl+2` to select the second, etc.
  - When a pen is active, press `+` to increase a pen's size, `-` to decrease it.
- Performance:
  - Cache `Path::toString` results for faster saving to SVG.

# 0.3.0

- Pen-related bug fixes
- API: Allow creating custom tools and tool widgets.

# 0.2.3

- Fix lines with thickness set to small numbers self-intersecting many times.

# 0.2.2

- Fix custon toolbar action buttons having wrong height.

# 0.2.1

- German localization.

# 0.2.0

- Export `Mat33`, `Vec3`, `Vec2`, and `Color4`.
- [Documentation](https://personalizedrefrigerator.github.io/js-draw/typedoc/index.html)
- Bug fixes:
  - After using up all blocks in the rendering cache, a single block was repeatedly re-allocated, leading to slow performance.

# 0.1.12

- Add icons to the selection menu.
- Screen-reader-related bug fixes.
- Fix bug where parent cache nodes were not fully re-rendered after erasing a stroke and replacing it with more, larger strokes.
- Generate strokes with single paths, instead of one path for each segment.
  - This should make new strokes take less space when saving to SVG because we don't need to store the edges for each part of the stroke.

# 0.1.11

- Fix 'Enter' key not toggling toolbar buttons.
- Add zoom limits.
- Add a reset zoom button.

# 0.1.10

- Keyboard shortcuts for the selection tool.
- Scroll the selection into view while moving it with the keyboard/mouse.
- Fix toolbar buttons not activating when focused and enter/space is pressed.
- Partial Spanish localization.

# 0.1.9

- Fix regression -- color picker hides just after clicking it.
- Allow toggling the pipette tool.

# 0.1.8

- Don't render if the screen has a size of 0x0.
  - This was breaking the cache data structure's invariant -- cache blocks weren't dividing when they had zero size.
- Fix rectangles drawn with the pen's rectangle mode not having edges parallel to the viewport.

# 0.1.7

- Show the six most recent color selections in the color palette.
- Switch from checkboxes to togglebuttons in the dropdown for the hand tool.
- Adds a "duplicate selection" button.
- Add a pipette (select color from screen) tool.
- Make `Erase`, `Duplicate`, `AddElement`, `TransformElement` commands serializable.

# 0.1.6

- Fix loading text in SVG images in Chrome.

# 0.1.5

- Add a text-only renderer (only renders text objects at present) that can be activated with a screen reader.
- Make new text objects parallel to screen's horizontal axis.
- Fix pinch zoom off center when embedded in larger page.

# 0.1.4

- Option to enable pan gestures only if the editor has focus
- Text tool bug fixes and improvements.
- Defocus/blur editor when `Esc` key is pressed.

# 0.1.3

- Very minimalistic text tool.
- Ability to load and save text.
- Fix a rounding bug where small strokes could be stretched/moved to the wrong locations.

# 0.1.2

- Replace 'touch drawing' with a hand tool.
- Bug fixes related to importing SVGs from other applications.

# 0.1.1

- Avoid using the cache if working with smaller numbers of strokes.
- Attempt to prevent stroke width being zero at some locations in thin strokes.

# 0.1.0

- Zoom to import/export region just after importing.
- Rendered strokes are cached if possible for better performance.

# 0.0.10

- Prefer higher quality rendering except during touchscreen gestures and large groups of commands.
- Add a "delete selection" button.

# 0.0.8

- Map `ctrl+z` to undo, `ctrl+shift+Z` to redo.

# 0.0.7

- Preserve SVG global attributes when loading/saving images.
  - This fixes a bug where lost information (e.g. a missing namespace) broke SVGs on export.

# 0.0.6

- Fixes a bug that caused saved images to grow in size after loading them, then re-saving.
- Stops the pressure decrease on pen-up events from preventing line/arrow objects from having variable width.

# 0.0.5

- Configuration options:
  - Ability to disable touch panning
  - The `new Editor(container, ...)` constructor now takes a configuration object as its second argument.
- A pre-bundled version of `js-draw` is now distributed.

# 0.0.4

- Preset shapes
  - Arrow
  - Filled rectangle
  - Outlined rectangle
  - Line

# 0.0.2

- Adjust default editor colors based on system theme.

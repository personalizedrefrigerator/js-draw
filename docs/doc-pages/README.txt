This directory contains `.md` files that are converted into TypeDoc pages.

This folder uses the following very hacky method of adding custom .md files: https://github.com/TypeStrong/typedoc/issues/247#issuecomment-229897044

UPDATE: With the upgrade to TypeDoc v0.26, [external documents](https://typedoc.org/tags/document/) are now
supported. To avoid breaking links, this folder still uses the legacy [[include:]] method of importing documentation.
New documentation pages should use the `projectDocuments` config option.

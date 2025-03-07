#!/bin/bash
# Checks formatting in CI and, if different, prints a diff.

if ! yarn check-formatting-ci ; then
	echo "Stashing changes..."

	# Ensure at least one file is present to stash
	touch checking-formatting.status
	git stash push --include-untracked --quiet

	echo "Running the formatter..."
	yarn format . >/dev/null
	
	echo "Difference after running the formatter:"
	echo "<diff>"
	git diff HEAD
	echo "</diff>"

	echo "Restoring changes..."
	git restore .
	git stash pop --quiet
	rm checking-formatting.status

	echo "[❗] Formatting errors detected. It should be possible to fix them by running 'yarn format .' [❗]"
	exit 1
fi
#!/bin/bash

# Builds and runs for GitHub pages/firebase
# Should only be run by continuous integration and called
# AFTER installing dependencies and running tests.

# Ref: https://stackoverflow.com/a/1482133
script_dir=$(dirname -- "$0")
root_dir=$(dirname -- "$script_dir")

cd "$root_dir"

# Build all TypeDoc documentation
echo 'Building documentation'
npm run doc

# Build the main example app
echo 'Build demo app'
cd docs/demo
npm run build

# Create symlinks between files/directories that have moved
echo 'Symlink old paths'
cd "$root_dir"
cd docs/
ln -s demo example



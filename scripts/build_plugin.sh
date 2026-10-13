#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
plugin_dir="$repo_dir/zotero-plugin"
dist_dir="$repo_dir/dist"
version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$plugin_dir/manifest.json" | head -n 1)
output="$dist_dir/zotero-venue-tagger-$version.xpi"

mkdir -p "$dist_dir"
(cd "$plugin_dir" && zip -q -FS "$output" manifest.json bootstrap.js)
printf '%s\n' "$output"

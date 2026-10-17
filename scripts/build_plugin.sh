#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
plugin_dir="$repo_dir/zotero-plugin"
dist_dir="$repo_dir/dist"
version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$plugin_dir/manifest.json" | head -n 1)
output="$dist_dir/zotero-venue-tagger-$version.xpi"
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT

mkdir -p "$dist_dir"
cp "$plugin_dir/manifest.json" "$plugin_dir/bootstrap.js" "$build_dir/"
cp -R "$plugin_dir/locale" "$build_dir/"
cp -R "$plugin_dir/icons" "$build_dir/"
node "$repo_dir/scripts/generate_plugin_rules.js" \
  "$repo_dir/references/venue_rules.json" \
  "$repo_dir/references/track_overrides.json" \
  "$build_dir/rules.js"
(cd "$build_dir" && zip -q -FS -r "$output" manifest.json bootstrap.js rules.js locale icons)
printf '%s\n' "$output"

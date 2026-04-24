#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
source_readme="$repo_root/README.md"

if [[ ! -f "$source_readme" ]]; then
  echo "source README not found: $source_readme" >&2
  exit 1
fi

count=0
while IFS= read -r package_json; do
  package_dir="$(dirname "$package_json")"
  cp "$source_readme" "$package_dir/README.md"
  count=$((count + 1))
done < <(
  find "$repo_root/packages" \
    -path '*/node_modules/*' -prune -o \
    -type f -name 'jsr.json' -print | sort
)

echo "Copied $source_readme to $count package README file(s)."

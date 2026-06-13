# Clone Babylon.js Editor for local fork assessment (optional).
# Runtime uses npm babylonjs-editor-tools; this clone is for diffing upstream.

$ErrorActionPreference = "Stop"
$target = Join-Path $PSScriptRoot "..\vendor\babylon-editor"
$repo = "https://github.com/BabylonJS/Editor.git"

if (Test-Path (Join-Path $target ".git")) {
    Write-Host "Editor fork already cloned at $target"
    exit 0
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
git clone --depth 1 --branch master $repo $target
Write-Host "Cloned Babylon.js Editor to $target"
Write-Host "See vendor/babylon-editor/EDITOR_AUDIT.md for keep/remove map."

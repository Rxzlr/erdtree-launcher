$ErrorActionPreference = 'Stop'
$desktop = [Environment]::GetFolderPath('Desktop')
$target = 'C:\Users\abdul\Documents\Qoder\2026-11-12\917555b3\release-2026-11-12T10-30-44\win-unpacked\Erdtree Launcher.exe'
if (-not (Test-Path $target)) { throw "Target not found: $target" }
$shell = New-Object -ComObject WScript.Shell
$candidates = @()
Get-ChildItem $desktop -Filter *.lnk | ForEach-Object {
  $shortcut = $shell.CreateShortcut($_.FullName)
  $candidates += [pscustomobject]@{ File = $_.FullName; Target = $shortcut.TargetPath }
}
$launcher = $candidates | Where-Object { $_.Target -eq '' -or $_.Target -like '*Erdtree*' } | Select-Object -First 1
if (-not $launcher) { throw 'Launcher shortcut not found' }
$sc = $shell.CreateShortcut($launcher.File)
$old = $sc.TargetPath
$sc.TargetPath = $target
$sc.WorkingDirectory = Split-Path $target -Parent
$sc.IconLocation = "$target,0"
$sc.Description = 'Erdtree Launcher - Elden Ring'
$sc.Save()
Write-Output "UPDATED $($launcher.File)"
Write-Output "OLD $old"
Write-Output "NEW $target"

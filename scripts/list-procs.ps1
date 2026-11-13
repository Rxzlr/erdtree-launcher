$ErrorActionPreference = 'SilentlyContinue'
Get-Process | Where-Object {
  $_.ProcessName -eq 'Erdtree Launcher' -or $_.ProcessName -eq 'electron' -or $_.ProcessName -eq 'eldenring'
} | ForEach-Object {
  "{0}`t{1}`t{2}" -f $_.Id, $_.ProcessName, $_.MainWindowTitle
}

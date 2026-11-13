param([switch]$List)
$procs = Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -notmatch '--type=' }
if ($List) {
  foreach ($p in $procs) {
    Write-Output ("PID=" + $p.ProcessId + " START=" + $p.CreationDate + " CMD=" + $p.CommandLine)
  }
  exit 0
}
foreach ($p in $procs) {
  Write-Output ("STOP PID=" + $p.ProcessId)
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 1200
$left = Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
  Where-Object { $_.CommandLine -and $_.CommandLine -notmatch '--type=' }
Write-Output ("REMAINING=" + @($left).Count)

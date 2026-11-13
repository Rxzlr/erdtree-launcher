$games = Get-Process eldenring -ErrorAction SilentlyContinue
foreach ($g in $games) {
  $isElevated = $null
  try {
    $isElevated = $g.StartInfo.Verb
  } catch {}
  $owner = (Get-CimInstance Win32_Process -Filter "ProcessId = $($g.Id)").GetOwner()
  $info = Get-CimInstance Win32_Process -Filter "ProcessId = $($g.Id)"
  $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($info.ParentProcessId)" -ErrorAction SilentlyContinue
  Write-Output ("PID=" + $g.Id + " OWNER=" + $owner.Domain + "\" + $owner.User + " PARENT=" + $info.ParentProcessId + " (" + $parent.Name + ") CMD=" + $info.CommandLine)
}
$current = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
Write-Output ("CURRENT_ELEVATED=" + $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))

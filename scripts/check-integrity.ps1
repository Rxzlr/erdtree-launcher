Add-Type @'
using System; using System.Runtime.InteropServices;
public class TOK {
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool OpenProcessToken(IntPtr p, uint acc, out IntPtr tok);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern bool GetTokenInformation(IntPtr tok, int cls, out int info, int len, out int ret);
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint acc, bool inh, int pid);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
'@
function Get-IL($pid) {
  $h = [TOK]::OpenProcess(0x0400, $false, $pid)
  if ($h -eq [IntPtr]::Zero) { return "CannotOpenProcess err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
  $tok = [IntPtr]::Zero
  if (-not [TOK]::OpenProcessToken($h, 0x0008, [ref]$tok)) { [TOK]::CloseHandle($h) | Out-Null; return "NoToken err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
  $info = 0; $ret = 0
  # TokenIntegrityLevel = 25, query size first
  $buf = New-Object byte[] 1024
  $len = 0
  $ok = [TOK]::GetTokenInformation($tok, 25, [ref]$info, 0, [ref]$len)
  $bytes = New-Object byte[] $len
  # use Ptr overload via Marshal for proper struct
  $ptr = [Runtime.InteropServices.Marshal]::AllocHGlobal($len)
  $ok2 = [TOK]::GetTokenInformationPtr($tok, 25, $ptr, $len, [ref]$len)
  $sid = [Runtime.InteropServices.Marshal]::ReadIntPtr($ptr)
  [TOK]::CloseHandle($tok) | Out-Null
  [TOK]::CloseHandle($h) | Out-Null
  [Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
  return "SID_PTR=$sid"
}
# fallback: use whoami /groups approach per-process is not possible; report open process result only
$gamePid = (Get-Process eldenring).Id
$h = [TOK]::OpenProcess(0x0410, $false, $gamePid)  # QUERY_INFORMATION|VM_READ
Write-Output ("GameOpenForRead=" + ($h -ne [IntPtr]::Zero))
if ($h -ne [IntPtr]::Zero) { [TOK]::CloseHandle($h) | Out-Null }
$self = [System.Diagnostics.Process]::GetCurrentProcess().Id
$h2 = [TOK]::OpenProcess(0x0400, $false, $self)
Write-Output ("SelfOpen=" + ($h2 -ne [IntPtr]::Zero))
if ($h2 -ne [IntPtr]::Zero) { [TOK]::CloseHandle($h2) | Out-Null }

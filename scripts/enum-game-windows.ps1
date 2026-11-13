Add-Type @'
using System; using System.Runtime.InteropServices; using System.Text;
public class W {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hWnd);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
$gamePid = (Get-Process eldenring -ErrorAction SilentlyContinue | Select-Object -First 1).Id
if (-not $gamePid) { Write-Output 'NO_GAME'; exit }
$script:gp = $gamePid
$script:lines = New-Object System.Collections.ArrayList
$cb = [W+EnumWindowsProc]{
  param($h, $l)
  $p = [uint32]0
  [void][W]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $script:gp) {
    $t = New-Object System.Text.StringBuilder 256
    $c = New-Object System.Text.StringBuilder 256
    [void][W]::GetWindowText($h, $t, 256)
    [void][W]::GetClassName($h, $c, 256)
    $r = New-Object W+RECT
    [void][W]::GetWindowRect($h, [ref]$r)
    $cr = New-Object W+RECT
    [void][W]::GetClientRect($h, [ref]$cr)
    [void]$script:lines.Add("HWND=" + $h + " VIS=" + [W]::IsWindowVisible($h) + " EN=" + [W]::IsWindowEnabled($h) + " RECT=" + $r.Left + "," + $r.Top + "," + $r.Right + "," + $r.Bottom + " CLIENT=" + $cr.Right + "x" + $cr.Bottom + " CLASS=" + $c.ToString() + " TITLE=" + $t.ToString())
  }
  return $true
}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
$script:lines | ForEach-Object { Write-Output $_ }

param()
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WRect {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
}
"@
$target = (Get-Process eldenring -ErrorAction SilentlyContinue | Select-Object -First 1).Id
$script:rows = @()
$cb = [WRect+EnumProc]{
  param($h, $l)
  $p = [uint32]0
  [void][WRect]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $target -and [WRect]::IsWindowVisible($h)) {
    $r = New-Object WRect+RECT
    [void][WRect]::GetWindowRect($h, [ref]$r)
    if (($r.Right - $r.Left) -gt 400) {
      $script:rows += "HWND=$h RECT=$($r.Left),$($r.Top) SIZE=$($r.Right-$r.Left)x$($r.Bottom-$r.Top)"
    }
  }
  return $true
}
[void][WRect]::EnumWindows($cb, [IntPtr]::Zero)
$script:rows
$p = New-Object WRect+POINT
[void][WRect]::GetCursorPos([ref]$p)
"Cursor=$($p.X),$($p.Y)"

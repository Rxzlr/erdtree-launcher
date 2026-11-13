param()
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CW {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
}
"@
$target = (Get-Process eldenring -ErrorAction SilentlyContinue | Select-Object -First 1).Id
$script:found = @()
$cb = [CW+EnumProc]{
  param($h, $l)
  $p = [uint32]0
  [void][CW]::GetWindowThreadProcessId($h, [ref]$p)
  if ($p -eq $target -and [CW]::IsWindowVisible($h)) {
    $wr = New-Object CW+RECT
    [void][CW]::GetWindowRect($h, [ref]$wr)
    if (($wr.Right - $wr.Left) -gt 400) {
      $cr = New-Object CW+RECT
      [void][CW]::GetClientRect($h, [ref]$cr)
      $pt = New-Object CW+POINT
      $pt.X = 0; $pt.Y = 0
      [void][CW]::ClientToScreen($h, [ref]$pt)
      $script:found += "HWND=$h WIN=$($wr.Left),$($wr.Top) $($wr.Right-$wr.Left)x$($wr.Bottom-$wr.Top) CLIENT=$($cr.Right)x$($cr.Bottom) ORIGIN=$($pt.X),$($pt.Y) ICONIC=$([CW]::IsIconic($h))"
    }
  }
  return $true
}
[void][CW]::EnumWindows($cb, [IntPtr]::Zero)
$script:found

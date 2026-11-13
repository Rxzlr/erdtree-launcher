Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class FG {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  public struct POINT { public int X; public int Y; }
  public struct RECT { public int L, T, R, B; }
}
'@
[void][FG]::SetProcessDPIAware()
$fg = [FG]::GetForegroundWindow()
$pid2 = [uint32]0
[void][FG]::GetWindowThreadProcessId($fg, [ref]$pid2)
$t = New-Object System.Text.StringBuilder 256
[void][FG]::GetWindowText($fg, $t, 256)
$p = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
Write-Output ("FOREGROUND=" + $fg + " PID=" + $pid2 + " PROC=" + $p.ProcessName + " TITLE=" + $t.ToString())
$cp = New-Object FG+POINT
[void][FG]::GetCursorPos([ref]$cp)
Write-Output ("CURSOR=" + $cp.X + "," + $cp.Y)
$pt = New-Object FG+POINT
$pt.X = 585; $pt.Y = 645
$h = [FG]::WindowFromPoint($pt)
$root = [FG]::GetAncestor($h, 2)
foreach ($w in @($h, $root)) {
  $pp = [uint32]0
  [void][FG]::GetWindowThreadProcessId($w, [ref]$pp)
  $tt = New-Object System.Text.StringBuilder 256
  [void][FG]::GetWindowText($w, $tt, 256)
  $r = New-Object FG+RECT
  [void][FG]::GetWindowRect($w, [ref]$r)
  $proc = Get-Process -Id $pp -ErrorAction SilentlyContinue
  Write-Output ("AT585,645 HWND=" + $w + " PID=" + $pp + " PROC=" + $proc.ProcessName + " TITLE=" + $tt.ToString() + " RECT=" + $r.L + "," + $r.T + "," + $r.R + "," + $r.B)
}

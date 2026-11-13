param(
  [int]$X = 97,
  [int]$Y = 210,
  [int]$WaitMs = 1200,
  [string]$OutFile = ''
)
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CLK {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
[void][CLK]::SetProcessDPIAware()
$p = Get-Process | Where-Object { ($_.ProcessName -eq 'Erdtree Launcher' -or $_.ProcessName -eq 'electron') -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output 'NO_WINDOW'; exit 1 }
$h = $p.MainWindowHandle
[void][CLK]::ShowWindowAsync($h, 9)
Start-Sleep -Milliseconds 400
[void][CLK]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 400
$r = New-Object CLK+RECT
[void][CLK]::GetWindowRect($h, [ref]$r)
$cx = $r.Left + $X
$cy = $r.Top + $Y
[void][CLK]::SetCursorPos($cx, $cy)
Start-Sleep -Milliseconds 200
[CLK]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 90
[CLK]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
Write-Output ("CLICK " + $cx + "," + $cy + " rect=" + $r.Left + "," + $r.Top + "," + $r.Right + "," + $r.Bottom)
Start-Sleep -Milliseconds $WaitMs

if ($OutFile) {
  $cr = New-Object CLK+RECT
  [void][CLK]::GetClientRect($h, [ref]$cr)
  $w = $cr.Right; $ht = $cr.Bottom
  $bmp = New-Object System.Drawing.Bitmap($w, $ht)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  $ok = [CLK]::PrintWindow($h, $hdc, 2)
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("SAVED " + $OutFile + " " + $w + "x" + $ht + " ok=" + $ok)
}

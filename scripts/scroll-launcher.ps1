param(
  [int]$X = 700,
  [int]$Y = 600,
  [int]$Clicks = -3,
  [int]$WaitMs = 900,
  [string]$OutFile = ''
)
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class SCR {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
[void][SCR]::SetProcessDPIAware()
$p = Get-Process | Where-Object { ($_.ProcessName -eq 'Erdtree Launcher' -or $_.ProcessName -eq 'electron') -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output 'NO_WINDOW'; exit 1 }
$h = $p.MainWindowHandle
[void][SCR]::ShowWindowAsync($h, 9)
Start-Sleep -Milliseconds 300
[void][SCR]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 300
$r = New-Object SCR+RECT
[void][SCR]::GetWindowRect($h, [ref]$r)
[void][SCR]::SetCursorPos(($r.Left + $X), ($r.Top + $Y))
Start-Sleep -Milliseconds 150
$notches = [Math]::Abs($Clicks)
$dir = if ($Clicks -ge 0) { 1 } else { -1 }
for ($i = 0; $i -lt $notches; $i++) {
  $delta = [uint32](([int64](120 * $dir)) -band 0xFFFFFFFFL)
  [SCR]::mouse_event(0x0800, 0, 0, $delta, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 120
}
Write-Output ("SCROLL dir=" + $dir + " notches=" + $notches)
Start-Sleep -Milliseconds $WaitMs

if ($OutFile) {
  $cr = New-Object SCR+RECT
  [void][SCR]::GetClientRect($h, [ref]$cr)
  $w = $cr.Right; $ht = $cr.Bottom
  if ($w -lt 100 -or $ht -lt 100) { $w = 1584; $ht = 892 }
  $bmp = New-Object System.Drawing.Bitmap($w, $ht)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  $ok = [SCR]::PrintWindow($h, $hdc, 2)
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("SAVED " + $OutFile + " " + $w + "x" + $ht + " ok=" + $ok)
}

param([string]$OutFile = 'C:\Users\abdul\Documents\Qoder\2026-11-12\917555b3\test\real-shots\game-print.png')

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class PG {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$gamePid = (Get-Process | Where-Object { ($_.ProcessName -eq 'Erdtree Launcher' -or $_.ProcessName -eq 'electron') -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1).Id
if (-not $gamePid) { Write-Output 'NO_GAME_PROCESS'; exit 1 }

$script:handles = New-Object System.Collections.ArrayList
$cb = [PG+EnumWindowsProc]{
  param($h, $l)
  $procId = [uint32]0
  [void][PG]::GetWindowThreadProcessId($h, [ref]$procId)
  if ($procId -eq $script:gamePid -and [PG]::IsWindowVisible($h)) {
    [void]$script:handles.Add($h)
  }
  return $true
}
[void][PG]::EnumWindows($cb, [IntPtr]::Zero)

$best = [IntPtr]::Zero
$bestArea = 0
foreach ($h in $script:handles) {
  $r = New-Object PG+RECT
  [void][PG]::GetWindowRect($h, [ref]$r)
  $w = $r.Right - $r.Left
  $hh = $r.Bottom - $r.Top
  if ($w -gt 0 -and $hh -gt 0) {
    $area = $w * $hh
    $sb = New-Object System.Text.StringBuilder 512
    [void][PG]::GetWindowText($h, $sb, 512)
    Write-Output "WINDOW $h '$($sb.ToString())' ${w}x${hh}"
    if ($area -gt $bestArea) { $bestArea = $area; $best = $h }
  }
}
if ($best -eq [IntPtr]::Zero) { Write-Output 'NO_BEST_WINDOW'; exit 2 }

[void][PG]::ShowWindowAsync($best, 9)
Start-Sleep -Milliseconds 700
[void][PG]::SetWindowPos($best, [IntPtr]0, 0, 0, 1600, 900, 0x0040)
Start-Sleep -Seconds 2

$cr = New-Object PG+RECT
[void][PG]::GetClientRect($best, [ref]$cr)
$w2 = $cr.Right - $cr.Left
$h2 = $cr.Bottom - $cr.Top
if ($w2 -lt 100 -or $h2 -lt 100) { $w2 = 1600; $h2 = 900 }
Write-Output "CLIENT ${w2}x${h2}"
$bmp = New-Object System.Drawing.Bitmap($w2, $h2)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [PG]::PrintWindow($best, $hdc, 2)
$g.ReleaseHdc($hdc)
$g.Dispose()
$bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "PRINTWINDOW $ok SAVED $OutFile"

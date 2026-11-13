param([string]$OutFile = 'C:\Users\abdul\Documents\Qoder\2026-11-12\917555b3\test\real-shots\game-window.png')

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$gamePid = (Get-Process eldenring -ErrorAction SilentlyContinue | Select-Object -First 1).Id
if (-not $gamePid) { Write-Output 'NO_GAME_PROCESS'; exit 1 }

$found = New-Object System.Collections.ArrayList
$callback = [Win32+EnumWindowsProc]{
  param($h, $l)
  $procId = [uint32]0
  [void][Win32]::GetWindowThreadProcessId($h, [ref]$procId)
  if ($procId -eq $script:gamePid) {
    $sb = New-Object System.Text.StringBuilder 512
    [void][Win32]::GetWindowText($h, $sb, 512)
    $r = New-Object Win32+RECT
    [void][Win32]::GetWindowRect($h, [ref]$r)
    [void]$script:found.Add([pscustomobject]@{
      Handle = $h
      Title = $sb.ToString()
      Visible = [Win32]::IsWindowVisible($h)
      Width = $r.Right - $r.Left
      Height = $r.Bottom - $r.Top
      Left = $r.Left
      Top = $r.Top
    })
  }
  return $true
}
[void][Win32]::EnumWindows($callback, [IntPtr]::Zero)

$found | Format-Table -AutoSize | Out-String -Width 300 | Write-Output

$target = $found | Where-Object { $_.Title -like '*ELDEN RING*' } | Select-Object -First 1
if (-not $target) { Write-Output 'NO_GAME_WINDOW'; exit 2 }

[void][Win32]::ShowWindow($target.Handle, 9)
Start-Sleep -Milliseconds 1500
[void][Win32]::ShowWindow($target.Handle, 3)
Start-Sleep -Milliseconds 1500
Start-Sleep -Milliseconds 700
[void][Win32]::BringWindowToTop($target.Handle)
[void][Win32]::SetForegroundWindow($target.Handle)
Start-Sleep -Milliseconds 1200

$rect = New-Object Win32+RECT
[void][Win32]::GetWindowRect($target.Handle, [ref]$rect)
$w = $rect.Right - $rect.Left
$h2 = $rect.Bottom - $rect.Top
Write-Output "CAPTURE ${w}x${h2} at $($rect.Left),$($rect.Top)"
$bmp = New-Object System.Drawing.Bitmap($w, $h2)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bmp.Size)
$bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "SAVED $OutFile"

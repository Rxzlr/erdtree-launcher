param([string]$OutFile = 'C:\Users\abdul\Documents\Qoder\2026-11-12\917555b3\test\real-shots\game-click.png', [int]$X = 943, [int]$Y = 655, [int]$WaitSeconds = 8)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class FG {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SwitchToThisWindow(IntPtr hWnd, bool alt);
  [DllImport("user32.dll")] public static extern bool SetFocus(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$gamePid = (Get-Process eldenring -ErrorAction SilentlyContinue | Select-Object -First 1).Id
if (-not $gamePid) { Write-Output 'NO_GAME_PROCESS'; exit 1 }

$script:best = [IntPtr]::Zero
$script:bestArea = 0
$cb = [FG+EnumWindowsProc]{
  param($h, $l)
  $procId = [uint32]0
  $procId = [uint32]0
  [void][FG]::GetWindowThreadProcessId($h, [ref]$procId)
  if ($procId -eq $script:gamePid -and [FG]::IsWindowVisible($h)) {
    $r = New-Object FG+RECT
    [void][FG]::GetWindowRect($h, [ref]$r)
    $area = [Math]::Abs(($r.Right - $r.Left) * ($r.Bottom - $r.Top))
    if ($area -ge $script:bestArea) { $script:bestArea = $area; $script:best = $h }
  }
  return $true
}
[void][FG]::EnumWindows($cb, [IntPtr]::Zero)
if ($script:best -eq [IntPtr]::Zero) { Write-Output 'NO_WINDOW'; exit 2 }
$h = $script:best

$fg = [FG]::GetForegroundWindow()
$fgProc = [uint32]0
$fgThread = [FG]::GetWindowThreadProcessId($fg, [ref]$fgProc)
$myThread = [FG]::GetCurrentThreadId()
[void][FG]::AttachThreadInput($myThread, $fgThread, $true)
[void][FG]::ShowWindowAsync($h, 9)
Start-Sleep -Milliseconds 600
[void][FG]::BringWindowToTop($h)
[void][FG]::SwitchToThisWindow($h, $true)
[void][FG]::SetForegroundWindow($h)
[void][FG]::SetFocus($h)
[void][FG]::AttachThreadInput($myThread, $fgThread, $false)
Start-Sleep -Seconds 2
if ($X -ge 0 -and $Y -ge 0) {
  [void][FG]::SetCursorPos($X, $Y)
  Start-Sleep -Milliseconds 400
  [FG]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 120
  [FG]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Seconds $WaitSeconds
}

$nowFg = [FG]::GetForegroundWindow()
Write-Output "target=$h foreground=$nowFg match=$($nowFg -eq $h)"
$scr = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap($scr.Width, $scr.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($scr.Left, $scr.Top, 0, 0, $bmp.Size)
$bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "SAVED $OutFile $($scr.Width)x$($scr.Height)"

param(
  [string]$Mode = 'enter',
  [string]$OutFile = 'C:\Users\abdul\Documents\Qoder\2026-11-12\917555b3\test\real-shots\input-test.png',
  [int]$X = 1055,
  [int]$Y = 333,
  [int]$WaitSeconds = 3
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class INP {
  [StructLayout(LayoutKind.Sequential)]
  public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)]
  public struct HARDWAREINPUT { public uint uMsg; public ushort wParamL; public ushort wParamH; }
  [StructLayout(LayoutKind.Explicit)]
  public struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; [FieldOffset(0)] public HARDWAREINPUT hi; }
  [StructLayout(LayoutKind.Sequential)]
  public struct INPUT { public uint type; public INPUTUNION u; }
  [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetFocus(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  public struct RECT { public int Left, Top, Right, Bottom; }

  public static uint Key(ushort vk, ushort scan, bool up) {
    INPUT[] arr = new INPUT[1];
    arr[0].type = 1;
    arr[0].u.ki.wVk = vk;
    arr[0].u.ki.wScan = scan;
    arr[0].u.ki.dwFlags = (uint)(8 | (up ? 2 : 0));
    return SendInput(1, arr, Marshal.SizeOf(typeof(INPUT)));
  }
  public static uint MouseAbs(int x, int y, bool up) {
    int sw = GetSystemMetrics(0), sh = GetSystemMetrics(1);
    long nx = (long)x * 65535 / Math.Max(1, sw - 1);
    long ny = (long)y * 65535 / Math.Max(1, sh - 1);
    INPUT[] arr = new INPUT[1];
    arr[0].type = 0;
    arr[0].u.mi.dx = (int)nx;
    arr[0].u.mi.dy = (int)ny;
    arr[0].u.mi.dwFlags = (uint)(0x8000 | 0x0001 | (up ? 0x0004 : 0x0002));
    return SendInput(1, arr, Marshal.SizeOf(typeof(INPUT)));
  }
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
}
'@

$h = [IntPtr]44893400
$fg = [INP]::GetForegroundWindow()
$fgp = [uint32]0
$fgT = [INP]::GetWindowThreadProcessId($fg, [ref]$fgp)
$my = [INP]::GetCurrentThreadId()
[void][INP]::AttachThreadInput($my, $fgT, $true)
[void][INP]::ShowWindowAsync($h, 9)
[void][INP]::BringWindowToTop($h)
[void][INP]::SetForegroundWindow($h)
[void][INP]::SetFocus($h)
[void][INP]::AttachThreadInput($my, $fgT, $false)
Start-Sleep -Milliseconds 700

if ($Mode -eq 'enter') {
  for ($i = 0; $i -lt 2; $i++) {
    $r1 = [INP]::Key(0x0D, 0x1C, $false)
    Start-Sleep -Milliseconds 80
    $r2 = [INP]::Key(0x0D, 0x1C, $true)
    Start-Sleep -Milliseconds 350
    Write-Output "ENTER attempt $i down=$r1 up=$r2"
  }
} elseif ($Mode -eq 'space') {
  $r1 = [INP]::Key(0x20, 0x39, $false)
  Start-Sleep -Milliseconds 80
  $r2 = [INP]::Key(0x20, 0x39, $true)
  Write-Output "SPACE down=$r1 up=$r2"
} elseif ($Mode -eq 'click') {
  [void][INP]::SetCursorPos($X, $Y)
  Start-Sleep -Milliseconds 300
  $r1 = [INP]::MouseAbs($X, $Y, $false)
  Start-Sleep -Milliseconds 120
  $r2 = [INP]::MouseAbs($X, $Y, $true)
  Write-Output "CLICK at $X,$Y down=$r1 up=$r2 cursor=$([System.Windows.Forms.Cursor]::Position)"
} elseif ($Mode -eq 'hover') {
  [void][INP]::SetCursorPos($X, $Y)
  Start-Sleep -Milliseconds 100
  [void][INP]::MouseAbs($X, $Y, $false)
  [void][INP]::MouseAbs($X, $Y, $true)
  Write-Output "HOVER at $X,$Y"
}

Start-Sleep -Seconds $WaitSeconds
$nowFg = [INP]::GetForegroundWindow()
Write-Output "target=$h foreground=$nowFg match=$($nowFg -eq $h)"

$scr = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap($scr.Width, $scr.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($scr.Left, $scr.Top, 0, 0, $bmp.Size)
$bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "SAVED $OutFile"

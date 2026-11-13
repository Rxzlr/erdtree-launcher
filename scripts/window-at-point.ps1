Add-Type @'
using System; using System.Runtime.InteropServices; using System.Text;
public class PT {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint flags);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();
  public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
$pt = New-Object PT+POINT
$pt.X = 1055; $pt.Y = 333
$h = [PT]::WindowFromPoint($pt)
$root = [PT]::GetAncestor($h, 2)
"AT_POINT:"
foreach ($w in @($h, $root)) {
  $p = [uint32]0
  [void][PT]::GetWindowThreadProcessId($w, [ref]$p)
  $t = New-Object System.Text.StringBuilder 256
  $c = New-Object System.Text.StringBuilder 256
  [void][PT]::GetWindowText($w, $t, 256)
  [void][PT]::GetClassName($w, $c, 256)
  $r = New-Object PT+RECT
  [void][PT]::GetWindowRect($w, [ref]$r)
  $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
  Write-Output ("HWND=" + $w + " PID=" + $p + " PROC=" + $proc.ProcessName + " CLASS=" + $c.ToString() + " TITLE=" + $t.ToString() + " RECT=" + $r.Left + "," + $r.Top + "," + $r.Right + "," + $r.Bottom)
}
$desk = [PT]::GetDesktopWindow()
$g = [PT]::GetAncestor([PT]::WindowFromPoint((New-Object PT+POINT)), 0)  # warm
"TOP_WINDOWS:"

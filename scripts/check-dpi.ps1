Add-Type @'
using System; using System.Runtime.InteropServices;
public class DPI {
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetThreadDpiAwarenessContext();
  [DllImport("user32.dll")] public static extern int GetAwarenessFromDpiAwarenessContext(IntPtr c);
}
'@
$h = [IntPtr]44893400
Write-Output ("GameDPI=" + [DPI]::GetDpiForWindow($h))
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::new(1,1)
$g = [System.Drawing.Graphics]::FromImage($bmp)
Write-Output ("ScreenDPI=" + $g.DpiX)
$g.Dispose(); $bmp.Dispose()

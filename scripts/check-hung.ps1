Add-Type @'
using System; using System.Runtime.InteropServices; using System.Text;
public class GUI {
  [StructLayout(LayoutKind.Sequential)] public struct GUITHREADINFO {
    public int cbSize; public int flags; public IntPtr hwndActive; public IntPtr hwndFocus; public IntPtr hwndCapture;
    public IntPtr hwndMenuOwner; public IntPtr hwndMoveSize; public IntPtr hwndCaret;
    public int left, top, right, bottom;
  }
  [DllImport("user32.dll")] public static extern bool GetGUIThreadInfo(uint tid, ref GUITHREADINFO info);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll")] public static extern bool IsHungAppWindow(IntPtr h);
}
'@
$h = [IntPtr]44893400
$procId = [uint32]0
$tid = [GUI]::GetWindowThreadProcessId($h, [ref]$procId)
Write-Output "TID=$tid"
$gi = New-Object GUI+GUITHREADINFO
$gi.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($gi)
$ok = [GUI]::GetGUIThreadInfo($tid, [ref]$gi)
Write-Output "GetGUIThreadInfo=$ok FLAGS=$($gi.flags) ACTIVE=$($gi.hwndActive) FOCUS=$($gi.hwndFocus) CAPTURE=$($gi.hwndCapture)"
$res = [IntPtr]::Zero
$r = [GUI]::SendMessageTimeout($h, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero, 2, 3000, [ref]$res)
Write-Output "SendMessageTimeout(WM_NULL)=$r err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
Write-Output "IsHung=$([GUI]::IsHungAppWindow($h))"

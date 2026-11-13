Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$scr = [System.Windows.Forms.SystemInformation]::VirtualScreen
function Grab {
  $bmp = [System.Drawing.Bitmap]::new($scr.Width, $scr.Height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($scr.Left, $scr.Top, 0, 0, $bmp.Size)
  $g.Dispose()
  return $bmp
}
$b1 = Grab
Start-Sleep -Seconds 2
$b2 = Grab
$diff = 0
$step = 8
for ($y = 0; $y -lt $b1.Height; $y += $step) {
  for ($x = 1920; $x -lt $b1.Width; $x += $step) {
    $c1 = $b1.GetPixel($x, $y)
    $c2 = $b2.GetPixel($x, $y)
    if ([Math]::Abs($c1.R - $c2.R) -gt 3 -or [Math]::Abs($c1.G - $c2.G) -gt 3 -or [Math]::Abs($c1.B - $c2.B) -gt 3) { $diff++ }
  }
}
Write-Output "DIFF_SAMPLES=$diff"
$b1.Dispose(); $b2.Dispose()

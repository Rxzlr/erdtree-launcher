$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Convert-Art($src, $dst, $w, $h, $quality) {
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $src))
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()
  $img.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $bmp.Save($dst, $codec, $params)
  $bmp.Dispose()
  $size = (Get-Item $dst).Length
  Write-Output ("{0} -> {1}x{2} {3} KB" -f (Split-Path $dst -Leaf), $w, $h, [math]::Round($size / 1kb))
}

$root = Split-Path -Parent $PSScriptRoot
Convert-Art (Join-Path $root 'assets/workshop/erdtree-bg.png') (Join-Path $root 'assets/workshop/erdtree-bg.jpg') 1600 1000 88
foreach ($name in @('combat', 'world', 'character', 'tools')) {
  Convert-Art (Join-Path $root "assets/workshop/cover-$name.png") (Join-Path $root "assets/workshop/cover-$name.jpg") 560 560 84
}

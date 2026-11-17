# Resizes downloaded icons to small PNGs (Windows System.Drawing). Run after fetch-assets.mjs.
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
function Resize($src, $dst, $size) {
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $src))
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, 0, 0, $size, $size)
  $img.Dispose(); $g.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
}
New-Item -ItemType Directory -Force assets\img | Out-Null
Get-ChildItem assets\icons -File | ForEach-Object { Resize $_.FullName ("assets\img\" + $_.BaseName + ".png") 128 }
Resize assets\logo.png assets\img\logo-64.png 64
Resize assets\logo.png assets\img\logo-512.png 512
Resize assets\logo.png assets\img\favicon-32.png 32
Resize assets\logo.png assets\img\apple-touch-icon.png 180
Remove-Item -Recurse assets\icons
Get-ChildItem assets\img | Measure-Object Length -Sum | ForEach-Object { 'total {0}KB, {1} files' -f [int]($_.Sum / 1KB), $_.Count }

# Makes videos/<actor>-play.jpg: the video poster with a play button, for Apify READMEs
# (Apify's image proxy shows only the first frame of a GIF, so READMEs link a still image to the tool page).
# Usage: powershell -File scripts\play-thumb.ps1 amazon-product-scraper
param([Parameter(Mandatory)][string]$Actor)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$src = [Drawing.Image]::FromFile("$root\videos\$Actor.jpg")
$w = 1280; $h = 720
$bmp = New-Object Drawing.Bitmap $w, $h
$g = [Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($src, 0, 0, $w, $h)
$g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(120, 0, 0, 0))), 0, 0, $w, $h)
$r = 66; $cx = $w / 2; $cy = $h / 2
$g.FillEllipse((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(245, 34, 211, 238))), $cx - $r, $cy - $r, 2 * $r, 2 * $r)
$pts = [Drawing.PointF[]]@((New-Object Drawing.PointF ($cx - 20), ($cy - 32)), (New-Object Drawing.PointF ($cx - 20), ($cy + 32)), (New-Object Drawing.PointF ($cx + 36), $cy))
$g.FillPolygon([Drawing.Brushes]::Black, $pts)
$f = New-Object Drawing.Font 'Segoe UI Semibold', 20
$t = 'Watch the 30-second demo'
$sz = $g.MeasureString($t, $f)
$by = $cy + $r + 18
$g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(235, 10, 10, 10))), ($cx - $sz.Width / 2 - 18), $by, ($sz.Width + 36), ($sz.Height + 14))
$g.DrawString($t, $f, [Drawing.Brushes]::White, ($cx - $sz.Width / 2), ($by + 7))
$g.Dispose(); $src.Dispose()
$bmp.Save("$root\videos\$Actor-play.jpg", [Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
Write-Output "wrote videos\$Actor-play.jpg"

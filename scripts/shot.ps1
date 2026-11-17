# One headless Edge screenshot. Usage: shot.ps1 <name> <url> [width,height] [light|dark] [virtualTimeMs]
param([string]$Name, [string]$Url, [string]$Size = '1440,1100', [string]$Theme = 'light', [int]$Time = 4000)
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$out = Join-Path $env:TEMP 'panix-shots'; New-Item -ItemType Directory -Force $out | Out-Null
$file = Join-Path $out "$Name.png"
$pref = if ($Theme -eq 'dark') { 0 } else { 1 }
$p = Start-Process -FilePath $edge -ArgumentList @('--headless=new', '--disable-gpu', '--hide-scrollbars', "--window-size=$Size", "--screenshot=$file", "--timeout=$Time", "--blink-settings=preferredColorScheme=$pref", "--user-data-dir=$out\profile-$Name", $Url) -PassThru -WindowStyle Hidden
if (-not $p.WaitForExit(60000)) { $p.Kill() }
Write-Output $file

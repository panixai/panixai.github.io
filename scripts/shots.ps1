# Takes headless Edge screenshots of the local site (python -m http.server 8787 must be running).
param([string]$Out = "$env:TEMP\panix-shots")
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
New-Item -ItemType Directory -Force $Out | Out-Null
$shots = @(
  @('home-light', 'http://127.0.0.1:8787/', '1440,2600', 'light'),
  @('home-dark', 'http://127.0.0.1:8787/', '1440,2600', 'dark'),
  @('tool-dark', 'http://127.0.0.1:8787/tools/google-news-scraper.html', '1440,1800', 'dark'),
  @('tool-light', 'http://127.0.0.1:8787/tools/google-news-scraper.html', '1440,1800', 'light'),
  @('home-mobile', 'http://127.0.0.1:8787/', '390,2400', 'dark')
)
foreach ($s in $shots) {
  $file = Join-Path $Out ($s[0] + '.png')
  $args = @('--headless=new', '--disable-gpu', '--hide-scrollbars', "--window-size=$($s[2])", "--screenshot=$file", '--virtual-time-budget=4000')
  if ($s[3] -eq 'dark') { $args += '--force-dark-mode'; $args += '--blink-settings=preferredColorScheme=0' } else { $args += '--blink-settings=preferredColorScheme=1' }
  $args += $s[1]
  & $edge @args 2>$null | Out-Null
  Write-Host $file
}

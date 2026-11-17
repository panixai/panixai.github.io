# panixai.github.io

Static site for Panix AI Labs' Apify Actors. Live at https://panixai.github.io

## Update the site

```powershell
node scripts/fetch-assets.mjs                                   # Store data, prices, icons, logo
powershell -ExecutionPolicy Bypass -File scripts\resize.ps1     # shrink icons to 128px PNGs
node build.mjs                                                  # regenerate index.html, tools/*.html, sitemap
git add -A; git commit -m "Update site"; git push
```

`build.mjs` reads input and dataset schemas from `d:/PANIX/actors` (override with `ACTORS_DIR`).
Category grouping is the `CATS` list at the top of `build.mjs`; add new Actors there.

Demo videos: put `videos/<actor-name>.mp4` (and an optional `videos/<actor-name>.jpg` poster) and rebuild.

Screenshots for review: start `python -m http.server 8787`, then run `scripts\shots.ps1`.

# Brand assets

Generated, not hand-made — re-run the build after any copy or colour change:

```bash
node brand/src/build.mjs
```

Point the post footers at your live domain:

```bash
SITE_URL=your-domain.com node brand/src/build.mjs
```

Everything renders through headless Chrome at 2× device scale, so each PNG is
twice its nominal size and stays sharp on retina displays and after X's
recompression.

| File | Nominal | Actual | Use |
| --- | --- | --- | --- |
| `logo-dark.png` | 400×400 | 800×800 | X profile picture (dark) |
| `logo-green.png` | 400×400 | 800×800 | X profile picture (green) |
| `banner.png` | 1500×500 | 3000×1000 | X header |
| `post-01-idle.png` | 1600×900 | 3200×1800 | Launch / hook post |
| `post-02-steps.png` | 1600×900 | 3200×1800 | How it works |
| `post-03-unchanged.png` | 1600×900 | 3200×1800 | "Deposit YES, get YES back" |
| `post-04-live.png` | 1600×900 | 3200×1800 | Launch announcement |

## Notes

- The banner's bottom-left corner is deliberately empty — X overlays the profile
  picture there, and mobile crops the left and right edges. Keep new content
  centred.
- Profile pictures are displayed as circles. The mark is inset well within the
  safe radius.
- No yield figures appear on any asset. Rates move with the vault, and a stale
  number on a screenshot that circulates for months is worse than no number.

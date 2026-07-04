# Michi Binder Creator

Michi Binder Creator is a browser-based planner for trading-card binder layouts, image inserts, and TCGdex card art.

## Live App

Use the published app on GitHub Pages:

https://ben900256-source.github.io/michi-binder-creator/

## What It Does

- Build binder pages with realistic pocket dimensions.
- Use standard binder or top-loader binder presets.
- Search TCGdex card art or import your own images.
- Arrange cards, inserts, multi-slot artwork, and intentional empty space for Michi Method-style binder spreads.
- Export layouts as PNG, cut-sheet PDF, or project JSON.

## Privacy

The app is local-only. Projects are saved in your browser with IndexedDB unless you export and share a JSON file yourself.

## Run Locally

This is a static site. Serve the folder with any local static server:

```bash
python -m http.server 3000
```

Then open:

```text
http://localhost:3000/
```

Opening `index.html` directly is not recommended because browser storage APIs behave more reliably from `localhost`.

## License

GPL-3.0. See [LICENSE](LICENSE).

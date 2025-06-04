# earcut-tests

A simple Node.js utility for triangulating a single‐feature Polygon GeoJSON, using either [earcut](https://github.com/mapbox/earcut) or Cesium’s built-in triangulation (which also uses earcut, but with additional processing).

## Requirements

- Node.js (v14+)
- npm

Install dependencies in this project folder:

```bash
npm install
```

## Usage

```bash
node earcut-test.js [method] [input.geojson]
```

- `method`: `earcut` or `cesium` (default: `cesium`)
- `input.geojson`: path to a FeatureCollection containing a single Polygon (default: `polyerr-good.geojson`)

Examples:

```bash
# run Earcut triangulation
node earcut-test.js earcut polyerr-good.geojson

# run Cesium triangulation (default)
node earcut-test.js cesium polyerr-good.geojson
```

Triangulated output is written to `tris.geojson` in this folder and automatically opened in [geojson.io](https://geojson.io/) for visualization.

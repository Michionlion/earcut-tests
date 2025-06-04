const fs = require('fs');
const path = require('path');

if (require.main === module) {
  (async () => {
    // choose triangulation method: 'earcut' or 'cesium'
    const method = process.argv[2] || 'cesium';
    const infile = process.argv[3] || 'polyerr-good.geojson';
    // load raw GeoJSON object
    const filepath = path.resolve(__dirname, infile);
    const raw = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    let triFeatures = [];
    if (method === 'earcut') {
      // use Earcut directly
      const { default: earcut } = await import('earcut');
      const feat = raw.features[0];
      const ring = feat.geometry.coordinates[0];
      const vertices = ring.reduce((arr, pt) => (arr.push(pt[0], pt[1]), arr), []);
      const indices = earcut(vertices, [], 2);
      for (let i = 0; i < indices.length; i += 3) {
        const [i0, i1, i2] = indices.slice(i, i + 3);
        const p0 = [vertices[2 * i0], vertices[2 * i0 + 1]];
        const p1 = [vertices[2 * i1], vertices[2 * i1 + 1]];
        const p2 = [vertices[2 * i2], vertices[2 * i2 + 1]];
        // enforce CCW
        let coords = [p0, p1, p2, p0];
        const area2 = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
        if (area2 < 0) coords = [p0, p2, p1, p0];
        triFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } });
      }
    } else if (method === 'cesium') {
      // load Cesium and use its triangulation
      const { GeoJsonDataSource, PolygonGeometry, VertexFormat, Cartesian3, Math: CesiumMath, Ellipsoid } = await import('cesium');
      const dataSource = await GeoJsonDataSource.load(raw);
      const entity = dataSource.entities.values.find(e => e.polygon);
      const hierarchy = entity.polygon.hierarchy.getValue();
      const polygonGeometry = new PolygonGeometry({ polygonHierarchy: hierarchy, vertexFormat: VertexFormat.POSITION_ONLY, perPositionHeight: true });
      const geometry = PolygonGeometry.createGeometry(polygonGeometry);
      const { indices, attributes } = geometry;
      const values = attributes.position.values;
      for (let i = 0; i < indices.length; i += 3) {
        const [i0, i1, i2] = indices.slice(i, i + 3);
        const c0 = Ellipsoid.WGS84.cartesianToCartographic(new Cartesian3(values[3 * i0], values[3 * i0 + 1], values[3 * i0 + 2]));
        const c1 = Ellipsoid.WGS84.cartesianToCartographic(new Cartesian3(values[3 * i1], values[3 * i1 + 1], values[3 * i1 + 2]));
        const c2 = Ellipsoid.WGS84.cartesianToCartographic(new Cartesian3(values[3 * i2], values[3 * i2 + 1], values[3 * i2 + 2]));
        const p0 = [CesiumMath.toDegrees(c0.longitude), CesiumMath.toDegrees(c0.latitude)];
        const p1 = [CesiumMath.toDegrees(c1.longitude), CesiumMath.toDegrees(c1.latitude)];
        const p2 = [CesiumMath.toDegrees(c2.longitude), CesiumMath.toDegrees(c2.latitude)];
        let coords = [p0, p1, p2, p0];
        const area2 = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
        if (area2 < 0) coords = [p0, p2, p1, p0];
        triFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } });
      }
    } else {
      console.error('Unknown method:', method);
      process.exit(1);
    }
    const out = { type: 'FeatureCollection', features: triFeatures };

    // write out GeoJSON to file for visualization
    const indentJson = JSON.stringify(out, null, 2);
    const outfile = 'tris.geojson';
    fs.writeFileSync(path.resolve(__dirname, outfile), indentJson, 'utf8');
    console.log(`> wrote ${outfile}`);

    // open in geojson.io using compact JSON (no newlines) to avoid parse issues
    const compactJson = JSON.stringify(out);
    const { exec } = require('child_process');
    const url = 'https://geojson.io/#data=data:application/json,' + encodeURIComponent(compactJson);
    exec(`open "${url}"`, err => {
      if (err) console.error('Failed to launch browser:', err);
    });
  })().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

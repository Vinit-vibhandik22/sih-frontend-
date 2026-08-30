#!/usr/bin/env node
/**
 * Minify Natural Earth GeoJSON files
 * Rounds coordinates to 4 decimal places, removes properties
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'data');

function minifyGeoJSON(inputPath, outputPath) {
  const raw = readFileSync(inputPath, 'utf-8');
  const geo = JSON.parse(raw);

  // Round coordinates to 4 decimal places (~11m precision)
  function roundCoord(c) {
    return Math.round(c * 10000) / 10000;
  }

  function processGeometry(geom) {
    if (!geom) return geom;
    if (geom.type === 'Point') {
      geom.coordinates = geom.coordinates.map(roundCoord);
    } else if (geom.type === 'MultiPoint' || geom.type === 'LineString') {
      geom.coordinates = geom.coordinates.map(p => p.map(roundCoord));
    } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
      geom.coordinates = geom.coordinates.map(ring => ring.map(p => p.map(roundCoord)));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates = geom.coordinates.map(poly => poly.map(ring => ring.map(p => p.map(roundCoord))));
    } else if (geom.type === 'GeometryCollection') {
      geom.geometries = geom.geometries.map(processGeometry);
    }
    return geom;
  }

  // Process features - strip all properties except name for ports
  if (geo.features) {
    geo.features = geo.features.map(f => {
      const minProps = {};
      // Keep name for ports, nothing for land
      if (f.properties && (f.properties.name || f.properties.NAME)) {
        minProps.name = f.properties.name || f.properties.NAME;
      }
      return {
        type: 'Feature',
        properties: minProps,
        geometry: processGeometry(f.geometry)
      };
    });
  }

  const out = JSON.stringify(geo);
  writeFileSync(outputPath, out);

  const before = raw.length;
  const after = out.length;
  const savings = ((before - after) / before * 100).toFixed(1);
  console.log(`${inputPath}: ${before} → ${after} bytes (${savings}% savings)`);
  return { before, after, savings };
}

console.log('Minifying GeoJSON files...\n');

const results = [
  minifyGeoJSON(join(DATA_DIR, 'land-110m.geojson'), join(DATA_DIR, 'land-110m.min.json')),
  minifyGeoJSON(join(DATA_DIR, 'land-50m.geojson'), join(DATA_DIR, 'land-50m.min.json')),
  minifyGeoJSON(join(DATA_DIR, 'ports-ne.geojson'), join(DATA_DIR, 'ports-ne.min.json')),
];

const totalBefore = results.reduce((a, r) => a + r.before, 0);
const totalAfter = results.reduce((a, r) => a + r.after, 0);
const totalSavings = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(1);

console.log(`\nTotal: ${totalBefore} → ${totalAfter} bytes (${totalSavings}% savings)`);

const radians = Math.PI / 180;

/** Convert WGS84-style longitude/latitude degrees to VoyageGo's Three.js sphere. */
export function geographicToCartesian(longitude, latitude, radius = 1) {
  const longitudeRadians = longitude * radians;
  const latitudeRadians = latitude * radians;
  const latitudeRadius = Math.cos(latitudeRadians) * radius;
  return {
    x: latitudeRadius * Math.sin(longitudeRadians),
    y: radius * Math.sin(latitudeRadians),
    z: latitudeRadius * Math.cos(longitudeRadians),
  };
}

/** Convert a local sphere vector back to longitude/latitude degrees. */
export function cartesianToGeographic(x, y, z) {
  const radius = Math.hypot(x, y, z) || 1;
  return {
    longitude: Math.atan2(x, z) / radians,
    latitude: Math.asin(Math.max(-1, Math.min(1, y / radius))) / radians,
  };
}

export function ringsIn(feature) {
  const geometry = feature?.geometry;
  if (geometry?.type === 'Polygon') return geometry.coordinates;
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

/** Point-in-polygon with inner-ring and antimeridian handling. */
export function featureAtGeographicPoint(features, longitude, latitude) {
  const withinRing = (ring) => {
    if (!ring.length) return false;
    const unwrapped = [];
    let previousLongitude = ring[0][0];
    unwrapped.push([previousLongitude, ring[0][1]]);
    for (let index = 1; index < ring.length; index += 1) {
      let currentLongitude = ring[index][0];
      while (currentLongitude - previousLongitude > 180) currentLongitude -= 360;
      while (currentLongitude - previousLongitude < -180) currentLongitude += 360;
      unwrapped.push([currentLongitude, ring[index][1]]);
      previousLongitude = currentLongitude;
    }
    let testLongitude = longitude;
    while (testLongitude - unwrapped[0][0] > 180) testLongitude -= 360;
    while (testLongitude - unwrapped[0][0] < -180) testLongitude += 360;
    const longitudes = unwrapped.map(([value]) => value);
    const latitudes = unwrapped.map(([, value]) => value);
    if (testLongitude < Math.min(...longitudes) || testLongitude > Math.max(...longitudes)
      || latitude < Math.min(...latitudes) || latitude > Math.max(...latitudes)) return false;
    let inside = false;
    for (let index = 0, previousIndex = unwrapped.length - 1; index < unwrapped.length; previousIndex = index, index += 1) {
      const [currentLongitude, currentLatitude] = unwrapped[index];
      const [priorLongitude, previousLatitude] = unwrapped[previousIndex];
      if ((currentLatitude > latitude) !== (previousLatitude > latitude)
        && testLongitude < ((priorLongitude - currentLongitude) * (latitude - currentLatitude)) / (previousLatitude - currentLatitude || Number.EPSILON) + currentLongitude) inside = !inside;
    }
    return inside;
  };

  return features.find((feature) => {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    return polygons.some((polygon) => withinRing(polygon[0]) && !polygon.slice(1).some(withinRing));
  });
}

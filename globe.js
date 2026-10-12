import * as THREE from './vendor/three.module.js';
import { destinations, reliefTextureUrl, worldDataUrl } from './data/countries.js';

const localeProperty = { fr: 'nameFr', en: 'nameEn', ar: 'nameAr', es: 'nameEs', pt: 'namePt' };
const destinationByIso = new Map(destinations.map((destination) => [destination.iso3, destination]));
const radians = Math.PI / 180;

function coordinate(longitude, latitude, radius = 1) {
  const phi = longitude * radians;
  const theta = (90 - latitude) * radians;
  return new THREE.Vector3(
    -radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.cos(phi),
  );
}

function translatedName(feature, locale) {
  const property = localeProperty[locale];
  const localized = feature.properties[property];
  if (localized) return localized;
  const iso2 = feature.properties.iso2;
  try { return iso2 && iso2 !== '-99' ? new Intl.DisplayNames([locale], { type: 'region' }).of(iso2) : feature.properties.name; }
  catch { return feature.properties.name; }
}

function flagFor(iso2) {
  if (!/^[A-Z]{2}$/.test(iso2 || '')) return '🌐';
  return String.fromCodePoint(...[...iso2].map((letter) => 127397 + letter.charCodeAt(0)));
}

function ringsIn(feature) {
  const geometry = feature.geometry;
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function featureAtPoint(features, longitude, latitude) {
  const withinRing = (ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[j];
      const dx1 = ((x1 - longitude + 540) % 360) - 180;
      const dx2 = ((x2 - longitude + 540) % 360) - 180;
      if ((y1 > latitude) !== (y2 > latitude) && 0 < ((dx2 - dx1) * (latitude - y1)) / (y2 - y1 || Number.EPSILON) + dx1) inside = !inside;
    }
    return inside;
  };

  return features.find((feature) => {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    return polygons.some((polygon) => withinRing(polygon[0]) && !polygon.slice(1).some(withinRing));
  });
}

function drawSvgFallback(container, features, locale, onSelect) {
  const project = ([longitude, latitude]) => [((longitude + 180) / 360) * 1200, ((90 - latitude) / 180) * 600];
  const pathFor = (feature) => ringsIn(feature).map((ring) => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + 'Z').join(' ');
  const map = features.map((feature) => {
    const iso = feature.properties.iso3;
    const name = translatedName(feature, locale);
    const selectable = iso && iso !== '-99';
    return `<path d="${pathFor(feature)}" aria-label="${name}" ${selectable ? `role="button" tabindex="0" data-country="${iso}"` : 'aria-hidden="true"'}/>`;
  }).join('');
  container.innerHTML = `<svg class="atlas-fallback" viewBox="0 0 1200 600" role="group" aria-label="${container.dataset.mapLabel}"><rect width="1200" height="600" rx="280"/><g>${map}</g></svg>`;
  container.querySelectorAll('[data-country]').forEach((path) => {
    const select = () => onSelect(features.find((feature) => feature.properties.iso3 === path.dataset.country));
    path.addEventListener('click', select);
    path.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
  });
}

export async function mountGlobe(copy) {
  const canvasHost = document.querySelector('#globe-host');
  const interaction = document.querySelector('#globe-interaction');
  const picker = document.querySelector('#country-picker');
  const popup = document.querySelector('#country-popup');
  const mapSection = document.querySelector('#map-section');
  if (!canvasHost || !interaction || !picker || !popup || !mapSection) return () => {};

  const response = await fetch(new URL(worldDataUrl.replace(/^\.\.\//, './'), import.meta.url));
  if (!response.ok) throw new Error(`World boundaries could not load (${response.status})`);
  const worldData = await response.json();
  const features = worldData.features.filter((feature) => ringsIn(feature).length);
  let globe = null;
  let selectedOutline = null;
  const countries = features
    .filter((feature) => feature.properties.iso2 && feature.properties.iso2 !== '-99')
    .map((feature) => ({ feature, name: translatedName(feature, copy.lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, copy.lang));
  picker.dataset.worldLoaded = 'true';
  picker.innerHTML = `<option value="">${copy.countryPrompt}</option>${countries.map(({ feature, name }) => `<option value="${feature.properties.iso3}">${flagFor(feature.properties.iso2)} ${name}</option>`).join('')}`;

  const setCountry = (feature, { position = null, announce = true } = {}) => {
    if (!feature) return;
    const properties = feature.properties;
    const iso3 = properties.iso3;
    const destination = destinationByIso.get(iso3);
    const name = translatedName(feature, copy.lang);
    const available = destination?.status === 'available' && destination.url;
    const flag = flagFor(properties.iso2);
    const status = available ? copy.available : copy.comingSoon;
    const action = available
      ? `<a class="country-action" href="${destination.url}">${copy.discover}</a>`
      : `<button class="country-action" type="button" disabled>${copy.comingSoon}</button>`;
    popup.innerHTML = `<button class="popup-close" type="button" aria-label="${copy.close}">×</button><div class="popup-country"><span class="country-flag" aria-hidden="true">${flag}</span><div><strong lang="${copy.lang}" dir="auto">${name}</strong><span class="popup-status">${status}</span></div></div>${action}`;
    popup.hidden = false;
    popup.classList.toggle('is-available', Boolean(available));
    if (position) placePopup(popup, position.x, position.y);
    popup.querySelector('.popup-close')?.addEventListener('click', () => { popup.hidden = true; });
    picker.value = iso3 || '';
    if (announce) document.querySelector('#country-announcement').textContent = `${flag} ${name} — ${status}`;
    if (globe && feature) showCountryOutline(feature);
  };

  const showCountryOutline = (feature) => {
    if (!globe) return;
    if (selectedOutline) { globe.remove(selectedOutline); selectedOutline.geometry.dispose(); selectedOutline.material.dispose(); selectedOutline = null; }
    const vertices = [];
    for (const ring of ringsIn(feature)) {
      for (let index = 1; index < ring.length; index += 1) {
        const previous = ring[index - 1];
        const current = ring[index];
        if (Math.abs(previous[0] - current[0]) > 180) continue;
        vertices.push(...coordinate(previous[0], previous[1], 1.008).toArray(), ...coordinate(current[0], current[1], 1.008).toArray());
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    selectedOutline = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: destinationByIso.has(feature.properties.iso3) ? 0xf3bd72 : 0x86c5d8, transparent: true, opacity: 0.95 }));
    globe.add(selectedOutline);
  };

  picker.addEventListener('change', () => {
    const feature = features.find((candidate) => candidate.properties.iso3 === picker.value);
    if (feature) setCountry(feature, { announce: true });
  });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
  } catch {
    const fallback = document.querySelector('#map-fallback');
    fallback.hidden = false;
    drawSvgFallback(fallback, features, copy.lang, (feature) => setCountry(feature));
    document.querySelector('#globe-status').textContent = copy.fallbackMessage;
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.15 : 1.35));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'globe-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  canvasHost.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, window.innerWidth / window.innerHeight, 0.1, 30);
  camera.position.set(0, 0, window.innerWidth < 700 ? 5.4 : 5.1);
  scene.add(new THREE.AmbientLight(0xa8c6c1, 2.0));
  const sun = new THREE.DirectionalLight(0xffe5ad, 3.0);
  sun.position.set(-3.5, 4.2, 4.5);
  scene.add(sun);
  const coolFill = new THREE.DirectionalLight(0x75c4d5, 1.1);
  coolFill.position.set(4, -1, -3);
  scene.add(coolFill);

  globe = new THREE.Group();
  scene.add(globe);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1, 160, 112),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0.02, bumpScale: 0.018 }),
  );
  globe.add(planet);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vNormal; void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 vNormal; void main(){float glow=pow(0.72-max(dot(normalize(vNormal),vec3(0.0,0.0,1.0)),0.0),3.0);gl_FragColor=vec4(0.20,0.72,0.68,glow*0.22);}',
      depthWrite: false,
    }),
  );
  globe.add(halo);

  const orbit = new THREE.Group();
  orbit.rotation.set(1.05, 0.12, -0.22);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.006, 6, 220), new THREE.MeshBasicMaterial({ color: 0x86c5d8, transparent: true, opacity: 0.72 }));
  orbit.add(ring);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.14, 3), new THREE.MeshBasicMaterial({ color: 0xf3bd72 }));
  const arrowAngle = -0.45;
  arrow.position.set(1.13 * Math.cos(arrowAngle), 1.13 * Math.sin(arrowAngle), 0);
  const tangent = new THREE.Vector3(-Math.sin(arrowAngle), Math.cos(arrowAngle), 0);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  orbit.add(arrow);
  globe.add(orbit);

  const borderVertices = [];
  for (const feature of features) {
    if (!feature.properties.iso3 || feature.properties.iso3 === '-99') continue;
    for (const ringCoordinates of ringsIn(feature)) {
      for (let index = 1; index < ringCoordinates.length; index += 1) {
        const a = ringCoordinates[index - 1];
        const b = ringCoordinates[index];
        if (Math.abs(a[0] - b[0]) > 180) continue;
        borderVertices.push(...coordinate(a[0], a[1], 1.003).toArray(), ...coordinate(b[0], b[1], 1.003).toArray());
      }
    }
  }
  const borderGeometry = new THREE.BufferGeometry();
  borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(borderVertices, 3));
  globe.add(new THREE.LineSegments(borderGeometry, new THREE.LineBasicMaterial({ color: 0xf2e8c8, transparent: true, opacity: 0.37 })));

  const loader = new THREE.TextureLoader();
  let reliefTexture = null;
  let disposed = false;
  reliefTexture = loader.load(new URL(reliefTextureUrl.replace(/^\.\.\//, './'), import.meta.url).href, (texture) => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.offset.x = 0.25;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    planet.material.map = texture;
    planet.material.bumpMap = texture;
    planet.material.needsUpdate = true;
    document.querySelector('#globe-status').textContent = copy.globeReady;
  }, undefined, () => {
    document.querySelector('#globe-status').textContent = copy.reliefError;
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const popupPlace = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.48 };
  let pointerDown = null;
  let dragged = false;
  let hoveredIso = '';
  let lastFrame = 0;
  let active = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const baseRotation = { y: 0, x: -0.04 };
  globe.rotation.set(baseRotation.x, baseRotation.y, 0);

  const pickFeature = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(planet, false)[0];
    if (!hit) return null;
    const local = globe.worldToLocal(hit.point.clone()).normalize();
    const longitude = Math.atan2(-local.x, local.z) / radians;
    const latitude = Math.asin(local.y) / radians;
    return featureAtPoint(features, longitude, latitude);
  };

  interaction.addEventListener('pointerdown', (event) => {
    pointerDown = { x: event.clientX, y: event.clientY, rotationY: globe.rotation.y, rotationX: globe.rotation.x };
    dragged = false;
    interaction.setPointerCapture(event.pointerId);
  });
  interaction.addEventListener('pointermove', (event) => {
    if (pointerDown && event.buttons) {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
      globe.rotation.y = pointerDown.rotationY + dx * 0.005;
      globe.rotation.x = THREE.MathUtils.clamp(pointerDown.rotationX + dy * 0.003, -1.1, 1.1);
      return;
    }
    if (event.pointerType === 'mouse') {
      const feature = pickFeature(event);
      const iso = feature?.properties.iso3 || '';
      interaction.classList.toggle('is-pointing-at-country', Boolean(iso));
      if (iso && iso !== hoveredIso) {
        hoveredIso = iso;
        const rect = renderer.domElement.getBoundingClientRect();
        setCountry(feature, { position: { x: event.clientX, y: event.clientY }, announce: false });
      }
    }
  });
  interaction.addEventListener('pointerup', (event) => {
    if (!dragged && pointerDown) {
      const feature = pickFeature(event);
      if (feature) setCountry(feature, { position: { x: event.clientX, y: event.clientY } });
    }
    pointerDown = null;
  });
  interaction.addEventListener('pointercancel', () => { pointerDown = null; });

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.15 : 1.35));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 700 ? 5.4 : 5.1;
    camera.updateProjectionMatrix();
    updateScrollTarget();
  };
  const setTarget = { x: 0, y: 0, scale: 1 };
  const sceneMarks = [
    { element: document.querySelector('#hero'), x: window.innerWidth < 700 ? 0 : 1.0, y: 0, scale: window.innerWidth < 700 ? 0.83 : 1.0 },
    { element: document.querySelector('#story'), x: window.innerWidth < 700 ? 0 : 1.65, y: 0, scale: window.innerWidth < 700 ? 0.62 : 0.76 },
    { element: mapSection, x: window.innerWidth < 700 ? 0 : 1.05, y: 0, scale: window.innerWidth < 700 ? 0.98 : 1.12 },
    { element: document.querySelector('#site-footer'), x: window.innerWidth < 700 ? 0 : 1.6, y: 0, scale: window.innerWidth < 700 ? 0.54 : 0.68 },
  ].filter((mark) => mark.element);
  function updateScrollTarget() {
    const center = window.scrollY + window.innerHeight * 0.48;
    const points = sceneMarks.map((mark) => ({ ...mark, center: mark.element.offsetTop + mark.element.offsetHeight * 0.5 }));
    let left = points[0];
    let right = points.at(-1);
    for (let index = 1; index < points.length; index += 1) {
      if (center <= points[index].center) { left = points[index - 1]; right = points[index]; break; }
    }
    const span = Math.max(1, right.center - left.center);
    const progress = THREE.MathUtils.clamp((center - left.center) / span, 0, 1);
    setTarget.x = THREE.MathUtils.lerp(left.x, right.x, progress);
    setTarget.y = THREE.MathUtils.lerp(left.y, right.y, progress);
    setTarget.scale = THREE.MathUtils.lerp(left.scale, right.scale, progress);
  }
  let scrollScheduled = false;
  const onScroll = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => { updateScrollTarget(); scrollScheduled = false; });
  };
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  resize();

  const activeObserver = new IntersectionObserver(([entry]) => {
    mapSection.classList.toggle('is-globe-active', entry.isIntersecting);
    document.body.classList.toggle('map-active', entry.isIntersecting);
    if (entry.isIntersecting) popup.hidden = true;
  }, { threshold: 0.12 });
  activeObserver.observe(mapSection);

  const visibilityObserver = new IntersectionObserver((entries) => { active = entries.some((entry) => entry.isIntersecting); }, { threshold: 0.01 });
  visibilityObserver.observe(document.querySelector('#hero'));
  visibilityObserver.observe(document.querySelector('#story'));
  visibilityObserver.observe(mapSection);
  const onVisibilityChange = () => { active = !document.hidden; };
  document.addEventListener('visibilitychange', onVisibilityChange);

  renderer.setAnimationLoop((time) => {
    if (!active || time - lastFrame < 32) return;
    lastFrame = time;
    if (!reducedMotion.matches) globe.rotation.y += 0.00045;
    globe.position.x += (setTarget.x - globe.position.x) * 0.045;
    globe.position.y += (setTarget.y - globe.position.y) * 0.045;
    const targetScale = setTarget.scale;
    globe.scale.setScalar(globe.scale.x + (targetScale - globe.scale.x) * 0.045);
    renderer.render(scene, camera);
  });

  const contextLost = (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    const fallback = document.querySelector('#map-fallback');
    fallback.hidden = false;
    drawSvgFallback(fallback, features, copy.lang, (feature) => setCountry(feature));
    document.querySelector('#globe-status').textContent = copy.fallbackMessage;
  };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);

  document.querySelector('#globe-status').textContent = copy.globeLoading;
  return () => {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    const geometries = new Set();
    const materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
    reliefTexture?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    window.removeEventListener('resize', resize);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    activeObserver.disconnect();
    visibilityObserver.disconnect();
  };
}

function placePopup(popup, x, y) {
  const margin = 14;
  const width = Math.min(310, window.innerWidth - margin * 2);
  const left = Math.max(margin, Math.min(x + 18, window.innerWidth - width - margin));
  const top = Math.max(margin + 50, Math.min(y + 18, window.innerHeight - 185));
  popup.style.setProperty('--popup-x', `${left}px`);
  popup.style.setProperty('--popup-y', `${top}px`);
}

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
    const destination = destinationByIso.get(feature.properties.iso3);
    selectedOutline = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: destination?.status === 'available' ? 0xf3bd72 : 0x86c5d8, transparent: true, opacity: 0.95 }));
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
  const track = document.querySelector('#journey-track');
  const stage = document.querySelector('#journey-stage');
  let pointerDown = null;
  let dragged = false;
  let lastFrame = 0;
  let active = true;
  let progress = 0;
  let dragX = 0;
  let dragY = 0;
  let zoom = 1;
  const activePointers = new Map();
  let pinchDistance = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  globe.rotation.set(-0.04, 0, 0);

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

  const pose = (x, y, diameter) => ({
    x: (x - .5) * camera.position.z * 2 * Math.tan(37 * radians / 2) * window.innerWidth / window.innerHeight,
    y: (.5 - y) * camera.position.z * 2 * Math.tan(37 * radians / 2),
    scale: diameter * .5 * Math.tan(37 * radians / 2) * camera.position.z,
  });
  const scenePoses = () => {
    const small = window.innerWidth < 700;
    const logoWidth = Math.min(window.innerWidth * (small ? .9 : .86), small ? 520 : 860, window.innerHeight * (small ? 1.05 : 1.5));
    const logoGlobeX = .5 + (.186 - .5) * logoWidth / window.innerWidth;
    return {
      logo: pose(logoGlobeX, .5, logoWidth * .233 / window.innerHeight),
      story: pose(.5, small ? .39 : .43, small ? .56 : .64),
      map: pose(small ? .5 : (document.documentElement.dir === 'rtl' ? .32 : .68), small ? .29 : .49, small ? .58 : .69),
    };
  };
  const updateScrollTarget = () => {
    const range = Math.max(1, track.offsetHeight - window.innerHeight);
    progress = THREE.MathUtils.clamp((window.scrollY - track.offsetTop) / range, 0, 1);
    stage.dataset.progress = progress.toFixed(3);
    stage.dataset.zoom = zoom.toFixed(2);
    stage.style.setProperty('--journey-progress', progress.toFixed(4));
    stage.style.setProperty('--step-one', THREE.MathUtils.clamp((progress - .16) / .12, 0, 1).toFixed(3));
    stage.style.setProperty('--step-two', THREE.MathUtils.clamp((progress - .28) / .12, 0, 1).toFixed(3));
    stage.style.setProperty('--step-three', THREE.MathUtils.clamp((progress - .40) / .12, 0, 1).toFixed(3));
    const selecting = progress >= .76;
    document.body.classList.toggle('map-active', selecting);
    mapSection.setAttribute('aria-hidden', String(!selecting));
    if (selecting) mapSection.removeAttribute('inert'); else mapSection.setAttribute('inert', '');
    if (!selecting) interaction.classList.remove('is-pointing-at-country');
  };
  const placeInteraction = () => {
    const projected = globe.position.clone().project(camera);
    const cx = (projected.x * .5 + .5) * window.innerWidth;
    const cy = (-projected.y * .5 + .5) * window.innerHeight;
    const edge = new THREE.Vector3(globe.position.x + globe.scale.x, globe.position.y, globe.position.z).project(camera);
    const ex = (edge.x * .5 + .5) * window.innerWidth;
    const diameter = Math.max(12, Math.hypot(ex - cx, (edge.y - projected.y) * window.innerHeight * .5) * 2);
    interaction.style.left = `${cx}px`;
    interaction.style.top = `${cy}px`;
    interaction.style.width = `${diameter}px`;
    interaction.style.height = `${diameter}px`;
  };
  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1 : 1.25));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 700 ? 5.4 : 5.1;
    camera.updateProjectionMatrix();
    updateScrollTarget();
  };
  let scrollScheduled = false;
  const onScroll = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => { updateScrollTarget(); scrollScheduled = false; });
  };
  const onPointerDown = (event) => {
    if (progress < .76) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerDown = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
    dragged = false;
    interaction.setPointerCapture(event.pointerId);
    if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (event) => {
    if (!pointerDown || (event.pointerType === 'mouse' && !event.buttons)) {
      if (event.pointerType === 'mouse' && progress >= .76 && progress < .995) interaction.classList.toggle('is-pointing-at-country', Boolean(pickFeature(event)));
      return;
    }
    if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance) zoom = THREE.MathUtils.clamp(zoom * distance / pinchDistance, .72, 1.45);
      pinchDistance = distance;
      stage.dataset.zoom = zoom.toFixed(2);
      dragged = true;
      return;
    }
    const dx = event.clientX - pointerDown.lastX;
    const dy = event.clientY - pointerDown.lastY;
    if (Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y) > 7) dragged = true;
    if (Math.abs(dx) > Math.abs(dy)) { dragX += dx * .004; dragY = THREE.MathUtils.clamp(dragY + dy * .002, -.7, .7); }
    pointerDown.lastX = event.clientX;
    pointerDown.lastY = event.clientY;
  };
  const onPointerUp = (event) => {
    if (pointerDown && !dragged) {
      const feature = pickFeature(event);
      if (feature) setCountry(feature);
    }
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2) pinchDistance = null;
    pointerDown = null;
  };
  const onPointerCancel = (event) => { activePointers.delete(event.pointerId); pinchDistance = null; pointerDown = null; };
  const onWheel = (event) => {
    if (progress < .76) return;
    event.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(-event.deltaY * .0012), .72, 1.45);
    stage.dataset.zoom = zoom.toFixed(2);
  };
  interaction.addEventListener('pointerdown', onPointerDown);
  interaction.addEventListener('pointermove', onPointerMove);
  interaction.addEventListener('pointerup', onPointerUp);
  interaction.addEventListener('pointercancel', onPointerCancel);
  interaction.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  resize();
  const visibilityObserver = new IntersectionObserver((entries) => { active = entries.some((entry) => entry.isIntersecting); }, { threshold: 0.01 });
  visibilityObserver.observe(stage);
  const onVisibilityChange = () => { active = !document.hidden; };
  document.addEventListener('visibilitychange', onVisibilityChange);
  const initialPose = scenePoses().logo;
  globe.position.set(initialPose.x, initialPose.y, 0);
  globe.scale.setScalar(initialPose.scale);

  renderer.setAnimationLoop((time) => {
    if (!active || time - lastFrame < 32) return;
    const elapsed = lastFrame ? Math.min((time - lastFrame) / 1000, .08) : 1 / 30;
    lastFrame = time;
    const { logo: p0, story: p1, map: p2 } = scenePoses();
    const blend = (a, b, t) => ({ x: THREE.MathUtils.lerp(a.x, b.x, t), y: THREE.MathUtils.lerp(a.y, b.y, t), scale: THREE.MathUtils.lerp(a.scale, b.scale, t) });
    const t1 = THREE.MathUtils.clamp(progress / .25, 0, 1);
    const t2 = THREE.MathUtils.clamp((progress - .58) / .23, 0, 1);
    const target = blend(blend(p0, p1, t1), p2, t2);
    const easing = reducedMotion.matches ? 1 : 1 - Math.exp(-12 * elapsed);
    globe.position.x += (target.x - globe.position.x) * easing;
    globe.position.y += (target.y - globe.position.y) * easing;
    const zoomedScale = target.scale * (progress >= .76 ? zoom : 1);
    globe.scale.setScalar(globe.scale.x + (zoomedScale - globe.scale.x) * easing);
    globe.rotation.y += (progress * 1.15 + dragX - globe.rotation.y) * (pointerDown ? 1 : easing);
    globe.rotation.x += ((-.04 + dragY - globe.rotation.x) * (pointerDown ? 1 : easing));
    placeInteraction();
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
    visibilityObserver.disconnect();
    interaction.removeEventListener('pointerdown', onPointerDown);
    interaction.removeEventListener('pointermove', onPointerMove);
    interaction.removeEventListener('pointerup', onPointerUp);
    interaction.removeEventListener('pointercancel', onPointerCancel);
    interaction.removeEventListener('wheel', onWheel);
    document.body.classList.remove('map-active');
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

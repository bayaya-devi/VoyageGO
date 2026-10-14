import { horizons } from './data/horizons.js';

const previousHorizonKey = 'voyagego-previous-horizon';

function storedPreviousId() {
  try { return localStorage.getItem(previousHorizonKey); }
  catch { return null; }
}

function remember(id) {
  try { localStorage.setItem(previousHorizonKey, id); }
  catch { /* The visual works even when browser storage is unavailable. */ }
}

export function chooseHorizon(previousId = storedPreviousId(), random = Math.random) {
  const candidates = horizons.length > 1 ? horizons.filter(({ id }) => id !== previousId) : horizons;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[Math.max(0, index)];
}

export function mountHorizon(copy) {
  const scene = document.querySelector('#universal-horizon');
  const image = document.querySelector('#universal-horizon-image');
  const credit = document.querySelector('#universal-horizon-credit');
  if (!scene || !image || !credit || !horizons.length) return () => {};

  const selected = chooseHorizon();
  scene.dataset.horizonId = selected.id;
  scene.dataset.horizonCategory = selected.category;
  image.style.objectPosition = selected.position;
  image.onload = () => scene.classList.add('is-ready');
  image.onerror = () => {
    scene.classList.add('has-error');
    image.removeAttribute('src');
    credit.hidden = true;
  };
  credit.textContent = `${copy.photoCredit}: ${selected.credit}`;
  credit.href = selected.source;
  image.src = selected.src;
  remember(selected.id);

  return () => {
    image.onload = null;
    image.onerror = null;
    image.removeAttribute('src');
  };
}


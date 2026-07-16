
function parseRows(block) {
  const data = {};
  [...block.children].forEach((row) => {
    const cell = row.querySelector('div');
    if (!cell) return;

    const strong = cell.querySelector('strong');
    if (!strong) return;

    const key = strong.textContent.trim().toLowerCase().replace(/\s+/g, '');
    const picture = cell.querySelector('picture');

    if (picture instanceof HTMLPictureElement) {
      data[key] = picture;
      return;
    }

    const p = cell.querySelector('p') || cell;
    const clone = p.cloneNode(true);
    clone.querySelector('strong')?.remove();

    const html = clone.innerHTML.trim().replace(/^(<br\s*\/?>)+/i, '').trim();
    const text = clone.textContent.trim();

    data[key] = { html, text };
  });
  return data;
}

function buildMeta(metaText) {
  const p = document.createElement('p');
  p.className = 'hero-meta';

  const fragment = document.createDocumentFragment();

  const icon = document.createElement('span');
  icon.className = 'hero-meta-icon';
  icon.setAttribute('aria-hidden', 'true');
  fragment.append(icon);

  metaText.split('|').map((s) => s.trim()).filter(Boolean).forEach((text) => {
    const item = document.createElement('span');
    item.className = 'hero-meta-item';
    item.textContent = text;
    fragment.append(item);
  });

  p.append(fragment);
  return p;
}

function buildHero(data, isDynamic) {
  const content = document.createElement('div');
  content.className = 'hero-content';

  const bg = document.createElement('div');
  bg.className = 'hero-background';
  if (data.backgroundimage instanceof HTMLPictureElement) {
    bg.append(data.backgroundimage);
  }

  const text = document.createElement('div');
  text.className = 'hero-text';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'hero-eyebrow';
  if (data.eyebrow) eyebrow.textContent = data.eyebrow.text;
  else if (isDynamic) eyebrow.classList.add('is-loading');

  const title = document.createElement('h1');
  title.className = 'hero-title';
  if (data.title) title.textContent = data.title.text;
  else if (isDynamic) title.classList.add('is-loading');

  let meta = null;
  if (data.meta) {
    meta = buildMeta(data.meta.text);
  } else if (isDynamic) {
    meta = document.createElement('p');
    meta.className = 'hero-meta is-loading';
  }

  
  const description = document.createElement('p');
  description.className = 'hero-description';
  if (data.description) description.innerHTML = data.description.html;
  else if (isDynamic) description.classList.add('is-loading');

  const textFragment = document.createDocumentFragment();
  textFragment.append(eyebrow, title);
  if (meta) textFragment.append(meta);
  textFragment.append(description);
  text.append(textFragment);

  const contentFragment = document.createDocumentFragment();
  contentFragment.append(bg, text);
  content.append(contentFragment);

  if (data.badge || isDynamic) {
    const badge = document.createElement('span');
    badge.className = 'hero-badge';
    if (data.badge) badge.textContent = data.badge.text;
    else badge.classList.add('is-loading');
    content.append(badge);
  }

  return content;
}

async function fetchHeroData(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Hero data fetch failed: ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error('[hero] Unable to load dynamic content', err);
    return null;
  }
}

function applyRemoteData(block, remote) {
  const setText = (selector, value) => {
    if (value == null) return;
    const el = block.querySelector(selector);
    if (!el) return;
    el.textContent = value;
    el.classList.remove('is-loading');
    el.removeAttribute('aria-hidden');
  };

  setText('.hero-eyebrow', remote.eyebrow);
  setText('.hero-title', remote.title);
  setText('.hero-description', remote.description);
  setText('.hero-badge', remote.badge);

  if (remote.meta) {
    const oldMeta = block.querySelector('.hero-meta');
    const newMeta = buildMeta(remote.meta);
    if (oldMeta) oldMeta.replaceWith(newMeta);
  }
}

export default async function decorate(block) {
  const isDynamic = block.classList.contains('dynamic');
  const rowData = parseRows(block);

  block.replaceChildren(buildHero(rowData, isDynamic));

  if (!isDynamic) return;

  const dataSource = rowData.datasource?.text;
  if (!dataSource) return;

  const remote = await fetchHeroData(dataSource);
  if (!remote) return;

  applyRemoteData(block, remote);
}
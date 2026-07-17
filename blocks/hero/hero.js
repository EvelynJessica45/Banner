import { createOptimizedPicture } from '../../scripts/aem.js';

const TEXT_FIELDS = [
  { key: 'eyebrow', tag: 'p', cls: 'hero-eyebrow' },
  { key: 'title', tag: 'h1', cls: 'hero-title' },
  { key: 'description', tag: 'p', cls: 'hero-description', html: true },
];

function toKey(label) {
  return label.trim().toLowerCase().replace(/\s+/g, '');
}

function parseRows(block) {
  const data = {};
  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    const strong = cell.querySelector('strong');
    if (!strong) return;

    const picture = cell.querySelector('picture');
    if (picture instanceof HTMLPictureElement) {
      data[toKey(strong.textContent)] = picture;
      return;
    }

    const clone = cell.cloneNode(true);
    clone.querySelector('strong')?.remove();
    data[toKey(strong.textContent)] = {
      html: clone.innerHTML.trim().replace(/^(<br\s*\/?>)+/, '').trim(),
      text: clone.textContent.trim(),
    };
  });
  return data;
}

function optimizeBackgroundImage(picture, eager) {
  const img = picture?.querySelector('img');
  if (!img) return picture;
  return createOptimizedPicture(img.src, img.alt || '', eager, [{ width: '2000' }, { width: '750' }]);
}

function buildMeta(metaText) {
  const p = document.createElement('p');
  p.className = 'hero-meta';
  const icon = document.createElement('span');
  icon.className = 'hero-meta-icon';
  icon.setAttribute('aria-hidden', 'true');
  const items = metaText.split('|').map((s) => s.trim()).filter(Boolean).map((label) => {
    const item = document.createElement('span');
    item.className = 'hero-meta-item';
    item.textContent = label;
    return item;
  });
  p.append(icon, ...items);
  return p;
}

function buildField({ tag, cls, html }, fieldData, isDynamic) {
  const el = document.createElement(tag);
  el.className = cls;
  if (fieldData) el[html ? 'innerHTML' : 'textContent'] = fieldData[html ? 'html' : 'text'];
  else if (isDynamic) el.classList.add('is-loading');
  return el;
}

function buildHero(data, { isDynamic, eager }) {
  const content = document.createElement('div');
  content.className = 'hero-content';

  const bg = document.createElement('div');
  bg.className = 'hero-background';
  if (data.backgroundimage instanceof HTMLPictureElement) {
    bg.append(optimizeBackgroundImage(data.backgroundimage, eager));
  }

  const text = document.createElement('div');
  text.className = 'hero-text';
  const [eyebrow, title] = TEXT_FIELDS.slice(0, 2).map((f) => buildField(f, data[f.key], isDynamic));
  const description = buildField(TEXT_FIELDS[2], data.description, isDynamic);
  const meta = data.meta
    ? buildMeta(data.meta.text)
    : isDynamic ? Object.assign(document.createElement('p'), { className: 'hero-meta is-loading' }) : null;

  text.append(eyebrow, title, ...(meta ? [meta] : []), description);
  content.append(bg, text);

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
    console.error(' Unable to load dynamic content', err);
    return null;
  }
}

function applyRemoteData(block, remote) {
  TEXT_FIELDS.forEach(({ key, cls }) => {
    if (remote[key] == null) return;
    const el = block.querySelector(`.${cls}`);
    if (!el) return;
    el.textContent = remote[key];
    el.classList.remove('is-loading');
  });

  if (remote.badge != null) {
    const el = block.querySelector('.hero-badge');
    if (el) {
      el.textContent = remote.badge;
      el.classList.remove('is-loading');
    }
  }

  if (remote.meta) {
    block.querySelector('.hero-meta')?.replaceWith(buildMeta(remote.meta));
  }
}

export default async function decorate(block) {
  const isDynamic = block.classList.contains('dynamic');
  const eager = document.querySelector('.hero') === block;
  const rowData = parseRows(block);

  block.replaceChildren(buildHero(rowData, { isDynamic, eager }));

  const dataSource = isDynamic && rowData.datasource?.text;
  if (!dataSource) return;

  const remote = await fetchHeroData(dataSource);
  if (remote) applyRemoteData(block, remote);
}
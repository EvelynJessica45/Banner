// Fields that are just plain text/html, built the same way
const FIELDS = [
  { key: 'eyebrow', tag: 'p', cls: 'hero-eyebrow' },
  { key: 'title', tag: 'h1', cls: 'hero-title' },
  { key: 'description', tag: 'p', cls: 'hero-description', html: true },
];

// This is a function because we need it twice: on first render, and again if dynamic data arrives
function createMeta(metaText) {
  const p = document.createElement('p');
  p.className = 'hero-meta';

  const items = [];
  const parts = metaText.split('|');
  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (trimmed) items.push(trimmed);
  }
  if (items.length === 0) return p;

  // first item can start with ":" to show an icon
  const first = document.createElement('span');
  first.className = 'hero-meta-item hero-meta-first';
  if (items[0].startsWith(':')) {
    const icon = document.createElement('span');
    icon.className = 'hero-meta-icon';
    icon.setAttribute('aria-hidden', 'true');
    first.append(icon, document.createTextNode(items[0].slice(1).trim()));
  } else {
    first.textContent = items[0];
  }
  p.append(first);

  for (let i = 1; i < items.length; i++) {
    const item = document.createElement('span');
    item.className = 'hero-meta-item';
    item.textContent = items[i];
    p.append(item);
  }
  return p;
}

export default async function decorate(block) {
  const isDynamic = block.classList.contains('dynamic');

  // read authored rows into a simple { key: value } object
  const data = {};
  const cells = block.querySelectorAll(':scope > div > div');
  for (let i = 0; i < cells.length; i++) {
    const strong = cells[i].querySelector('strong');
    if (!strong) continue;

    const key = strong.textContent.trim().toLowerCase();
    const picture = cells[i].querySelector('picture');

    if (picture) {
      data[key] = picture;
    } else {
      const clone = cells[i].cloneNode(true);
      clone.querySelector('strong').remove();
      data[key] = { html: clone.innerHTML.trim(), text: clone.textContent.trim() };
    }
  }

  // background image - using it as authored
  const bg = document.createElement('div');
  bg.className = 'hero-background';
  if (data['background image']) {
    bg.append(data['background image']);
  }

  // eyebrow, title, description - built the same way, keep the elements to update later
  const els = {};
  const text = document.createElement('div');
  text.className = 'hero-text';
  for (let i = 0; i < FIELDS.length; i++) {
    const { key, tag, cls, html } = FIELDS[i];
    const el = document.createElement(tag);
    el.className = cls;
    if (data[key]) {
      el[html ? 'innerHTML' : 'textContent'] = data[key][html ? 'html' : 'text'];
    } else if (isDynamic) {
      el.classList.add('is-loading');
    }
    els[key] = el;
  }

  // meta line goes between title and description
  let meta = null;
  if (data.meta) {
    meta = createMeta(data.meta.text);
  } else if (isDynamic) {
    meta = document.createElement('p');
    meta.className = 'hero-meta is-loading';
  }

  text.append(els.eyebrow, els.title);
  if (meta) text.append(meta);
  text.append(els.description);

  const content = document.createElement('div');
  content.className = 'hero-content';
  content.append(bg, text);

  // badge
  if (data.badge || isDynamic) {
    const badge = document.createElement('span');
    badge.className = 'hero-badge';
    if (data.badge) {
      badge.textContent = data.badge.text;
    } else {
      badge.classList.add('is-loading');
    }
    content.append(badge);
  }

  block.replaceChildren(content);

  // dynamic hero: fetch remote data and swap it in once loaded
  if (isDynamic && data['data source'] && data['data source'].text) {
    let remote = null;
    try {
      const resp = await fetch(data['data source'].text);
      if (resp.ok) remote = await resp.json();
    } catch {
      // ignore, just leave the loading skeletons in place
    }

    if (remote) {
      for (let i = 0; i < FIELDS.length; i++) {
        const { key } = FIELDS[i];
        if (remote[key] != null) {
          els[key].textContent = remote[key];
          els[key].classList.remove('is-loading');
        }
      }

      if (remote.badge != null) {
        const badgeEl = block.querySelector('.hero-badge');
        badgeEl.textContent = remote.badge;
        badgeEl.classList.remove('is-loading');
      }

      if (remote.meta) {
        block.querySelector('.hero-meta').replaceWith(createMeta(remote.meta));
      }
    }
  }
}
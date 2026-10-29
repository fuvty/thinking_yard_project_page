import {parseFragment, serialize} from 'parse5';

// Named emphasis can move with sentence order, but cannot silently disappear.
function emphasis(nodes, name) {
  const marked = new Map();
  function visit(node) {
    const id = node.attrs?.find(attr=>attr.name === 'data-emphasis')?.value;
    if (id) {
      if (marked.has(id)) throw new Error(`${name}: duplicate emphasis ${id}`);
      marked.set(id,node.tagName);
    }
    (node.childNodes || []).forEach(visit);
  }
  nodes.forEach(visit);
  return JSON.stringify([...marked].sort(([a],[b])=>a.localeCompare(b)));
}

/** Translate explicit copy blocks, retaining one structural/interactive template. */
export function translateContent(source, translation, name = 'project') {
  const tree = parseFragment(source);
  const used = {html: new Set(), attributes: new Set()};
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
    for (const [attribute, group] of [['data-i18n', 'html'], ['data-i18n-attrs', 'attributes']]) {
      const key = attrs[attribute];
      if (!key) continue;
      if (!(key in (translation[group] || {}))) throw new Error(`${name}: missing ${group} translation ${key}`);
      used[group].add(key);
      if (group === 'html') {
        const translated = parseFragment(node, translation.html[key]).childNodes;
        if (emphasis(node.childNodes || [],name) !== emphasis(translated,name)) {
          throw new Error(`${name}: emphasis markers differ in ${key}`);
        }
        node.childNodes = translated;
        node.childNodes.forEach(child => { child.parentNode = node; });
      } else {
        for (const [attributeName, value] of Object.entries(translation.attributes[key])) {
          if (!['alt', 'title', 'aria-label', 'placeholder'].includes(attributeName)) throw new Error(`${name}: unsupported translated attribute ${attributeName}`);
          const attr = node.attrs.find(attr => attr.name === attributeName);
          if (attr) attr.value = value;
          else node.attrs.push({name: attributeName, value});
        }
      }
    }
    (node.childNodes || []).forEach(visit);
  }
  visit(tree);
  for (const group of ['html', 'attributes']) {
    for (const key of Object.keys(translation[group] || {})) {
      if (!used[group].has(key)) throw new Error(`${name}: unused ${group} translation ${key}`);
    }
  }
  return serialize(tree);
}

export function translateMetadata(meta, translation) {
  const {title, description, sections = {}} = translation.page;
  if (!title?.trim() || !description?.trim()) throw new Error('Translated page title and description are required');
  if (Object.keys(sections).length !== meta.sections.length || meta.sections.some(section => !sections[section.id]?.label?.trim() || !sections[section.id]?.description?.trim())) {
    throw new Error('Translated sections must match the page section IDs and include labels and descriptions');
  }
  return {...meta, title, description, sections: meta.sections.map(section => ({
    ...section, label: sections[section.id].label, description: sections[section.id].description,
  }))};
}

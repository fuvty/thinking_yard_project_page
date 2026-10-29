// Project scripts share the site's locale dictionary and interpolation rules.
export const t=(text,values={})=>globalThis.SiteI18n?.t(text,values)??String(text).replace(/\{(\w+)\}/g,(match,key)=>values[key]??match);

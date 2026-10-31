/*
 * Minimal CSS custom-property compatibility shim for older Samsung TVs.
 * The 2017 MU-series uses a Tizen 3 web engine that does not understand
 * var(--name) in CSS. Newer engines return immediately and use style.css
 * normally. On legacy engines we synchronously read the packaged stylesheet,
 * resolve :root variables and var() fallbacks, then inject ordinary CSS.
 *
 * This intentionally provides the default/static theme on Tizen 3. Runtime
 * theme variables set by main.js remain progressive enhancement for newer TVs.
 */
(function () {
  'use strict';

  try {
    if (window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--cleanframe-test)')) return;
  } catch (ignore) {}

  function readLocal(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) return xhr.responseText || '';
    } catch (ignore) {}
    return '';
  }

  function rootVariables(css) {
    var vars = {};
    var root = /:root\s*\{([\s\S]*?)\}/g;
    var match;
    while ((match = root.exec(css))) {
      var declaration = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+)\s*;/g;
      var item;
      while ((item = declaration.exec(match[1]))) vars[item[1]] = item[2].replace(/^\s+|\s+$/g, '');
    }
    return vars;
  }

  function resolveValue(value, vars, depth) {
    if (!value || depth > 12) return value;
    var changed = false;
    var out = value.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g, function (all, name, fallback) {
      var replacement = vars[name];
      if (replacement === undefined || replacement === null || replacement === '') replacement = fallback;
      if (replacement === undefined || replacement === null) return all;
      changed = true;
      return replacement;
    });
    return changed ? resolveValue(out, vars, depth + 1) : out;
  }

  var css = readLocal('style.css');
  if (!css) return;

  var vars = rootVariables(css);
  var name;
  for (name in vars) {
    if (Object.prototype.hasOwnProperty.call(vars, name)) vars[name] = resolveValue(vars[name], vars, 0);
  }

  css = css.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g, function (all, variable, fallback) {
    var value = vars[variable];
    if (value === undefined || value === null || value === '') value = fallback;
    return value === undefined || value === null ? all : resolveValue(value, vars, 0);
  });

  /* Custom-property declarations themselves are invalid on the old engine. */
  css = css.replace(/--[A-Za-z0-9_-]+\s*:\s*[^;{}]+\s*;/g, '');

  var style = document.createElement('style');
  style.type = 'text/css';
  style.setAttribute('data-cleanframe-legacy-css', 'tizen3');
  if (style.styleSheet) style.styleSheet.cssText = css;
  else style.appendChild(document.createTextNode(css));
  (document.head || document.getElementsByTagName('head')[0]).appendChild(style);

  var rootEl = document.documentElement;
  rootEl.className = (rootEl.className ? rootEl.className + ' ' : '') + 'legacy-tizen3';
}());

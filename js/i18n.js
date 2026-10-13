/**
 * i18n.js - Locale helper (vanilla, no deps)
 * Machinations Web Simulator
 */

(function (root) {
    'use strict';

    var M = root.Machinations = root.Machinations || {};
    var STORAGE_KEY = 'machinations.locale';
    var DEFAULT_LOCALE = 'ja';
    var _locale = DEFAULT_LOCALE;
    var _listeners = [];

    function getCatalog(code) {
        var locales = M.locales || {};
        return locales[code] || null;
    }

    function t(key, vars) {
        var catalog = getCatalog(_locale) || {};
        var str = catalog[key];
        if (str === undefined) {
            var fallback = getCatalog(DEFAULT_LOCALE) || {};
            str = fallback[key];
        }
        if (str === undefined) {
            return key;
        }
        if (vars) {
            str = String(str).replace(/\{\{(\w+)\}\}/g, function (_, name) {
                return vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : '';
            });
        }
        return str;
    }

    function getLocale() {
        return _locale;
    }

    function setLocale(code) {
        if (!getCatalog(code)) {
            return;
        }
        _locale = code;
        try {
            localStorage.setItem(STORAGE_KEY, code);
        } catch (e) {
            // ignore
        }
        if (typeof document !== 'undefined') {
            document.documentElement.lang = code;
            applyDom(document);
            var sel = document.getElementById('locale-select');
            if (sel && sel.value !== code) {
                sel.value = code;
            }
        }
        if (typeof M.refreshTypeLabels === 'function') {
            M.refreshTypeLabels();
        }
        for (var i = 0; i < _listeners.length; i++) {
            _listeners[i](code);
        }
    }

    function onLocaleChange(fn) {
        _listeners.push(fn);
    }

    function applyDom(rootEl) {
        if (typeof document === 'undefined') {
            return;
        }
        var rootNode = rootEl || document;
        var els = rootNode.querySelectorAll('[data-i18n]');
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = t(els[i].getAttribute('data-i18n'));
        }
        var titles = rootNode.querySelectorAll('[data-i18n-title]');
        for (var j = 0; j < titles.length; j++) {
            titles[j].setAttribute('title', t(titles[j].getAttribute('data-i18n-title')));
        }
        var placeholders = rootNode.querySelectorAll('[data-i18n-placeholder]');
        for (var k = 0; k < placeholders.length; k++) {
            placeholders[k].setAttribute('placeholder', t(placeholders[k].getAttribute('data-i18n-placeholder')));
        }
    }

    function readStoredLocale() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored && getCatalog(stored)) {
                return stored;
            }
        } catch (e) {
            // ignore
        }
        return DEFAULT_LOCALE;
    }

    // Sync locale as soon as catalogs are available (before DOM apply)
    _locale = readStoredLocale();

    function initI18n() {
        _locale = readStoredLocale();
        if (typeof document !== 'undefined') {
            document.documentElement.lang = _locale;
            applyDom(document);
            var sel = document.getElementById('locale-select');
            if (sel) {
                sel.value = _locale;
                sel.addEventListener('change', function () {
                    setLocale(sel.value);
                });
            }
        }
    }

    M.t = t;
    M.setLocale = setLocale;
    M.getLocale = getLocale;
    M.onLocaleChange = onLocaleChange;
    M.applyI18n = applyDom;
    M.initI18n = initI18n;
    M.DEFAULT_LOCALE = DEFAULT_LOCALE;

})(typeof globalThis !== 'undefined' ? globalThis : this);

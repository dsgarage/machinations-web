/**
 * locale-parity.test.js
 * Asserts Japanese catalog matches the frozen baseline and en has the same keys.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const baselinePath = path.join(root, 'locales', 'ja.baseline.json');

const ja = require(path.join(root, 'locales', 'ja.js'));
const en = require(path.join(root, 'locales', 'en.js'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

test('ja catalog equals locales/ja.baseline.json', () => {
    assert.deepEqual(ja, baseline);
});

test('en key set equals ja key set', () => {
    const jaKeys = Object.keys(ja).sort();
    const enKeys = Object.keys(en).sort();
    assert.deepEqual(enKeys, jaKeys);
});

test('locale catalogs load as plain objects under Node', () => {
    assert.equal(typeof ja, 'object');
    assert.equal(typeof en, 'object');
    assert.ok(ja['status.ready']);
    assert.ok(en['status.ready']);
    assert.notEqual(ja['status.ready'], en['status.ready']);
});

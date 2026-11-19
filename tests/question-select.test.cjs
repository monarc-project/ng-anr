/**
 * @link      https://github.com/monarc-project for the canonical source repository
 * @copyright Copyright (c) 2016-2026 Luxembourg House of Cybersecurity LHC.lu - Licensed under GNU Affero GPL v3
 * @license   MONARC is licensed under GNU Affero General Public License version 3
 */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { before, after, test } = require('node:test');
const { chromium } = require('@playwright/test');

const angularModules = path.resolve(process.env.MONARC_ANGULAR_MODULES || '../ng-client/node_modules');
const template = readFileSync(path.join(__dirname, '../views/trends.evalcontext.html'), 'utf8');
const selects = template.match(/<md-select\b[^>]*question\.response[^>]*>[\s\S]*?<\/md-select>/g).join('\n');
let browser;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function render(t, { multiple = false, writable = true, response = null } = {}) {
    const page = await browser.newPage();
    t.after(() => page.close());
    await page.setContent('<!doctype html><html><head></head><body></body></html>');
    await page.addStyleTag({ path: path.join(angularModules, 'angular-material/angular-material.css') });
    for (const library of ['angular', 'angular-animate', 'angular-aria', 'angular-messages', 'angular-material']) {
        await page.addScriptTag({ path: path.join(angularModules, library, `${library}.js`) });
    }
    await page.evaluate(({ selects, multiple, writable, response }) => {
        const injector = angular.bootstrap(document.body, ['ngMaterial']);
        const scope = injector.get('$rootScope').$new();
        scope.question = {
            type: 2, multichoice: Number(multiple), response,
            choices: [{ id: 7, label1: 'First answer' }, { id: 8, label1: 'Second answer' }],
        };
        scope.anr = { rwd: Number(writable) };
        scope._langField = (choice, field) => choice[`${field}1`];
        window.questionScope = scope;
        const element = injector.get('$compile')(`<div>${selects}</div>`)(scope);
        angular.element(document.body).append(element);
        scope.$digest();
    }, { selects, multiple, writable, response });
    return page;
}

test('single choice can select an answer and clear it without a dummy choice record', async (t) => {
    const page = await render(t);
    await page.locator('md-select').click();
    await page.getByRole('option', { name: 'First answer', exact: true }).click();
    assert.equal(await page.evaluate(() => questionScope.question.response), 7);
    await page.locator('md-select').click();
    await page.locator('md-option[ng-value="null"]').click();
    assert.equal(await page.evaluate(() => questionScope.question.response), null);
    assert.equal(await page.evaluate(() => JSON.stringify(questionScope.question.response)), 'null');
    assert.deepEqual(await page.evaluate(() => questionScope.question.choices.map(choice => choice.id)), [7, 8]);
});

test('multiple choice has only real options and can deselect all answers', async (t) => {
    const page = await render(t, { multiple: true, response: [7] });
    assert.equal(await page.locator('md-option[ng-value="null"]').count(), 0);
    await page.locator('md-select').click();
    await page.locator('md-option').first().waitFor({ state: 'visible' });
    assert.equal(await page.locator('md-option').count(), 2);
    await page.locator('md-option').filter({ hasText: 'First answer' }).click();
    assert.deepEqual(await page.evaluate(() => questionScope.question.response), []);
});

test('read-only single choice keeps its selected answer and cannot open the dropdown', async (t) => {
    const page = await render(t, { writable: false, response: 8 });
    assert.equal(await page.locator('md-select').getAttribute('disabled'), 'disabled');
    assert.equal(await page.evaluate(() => questionScope.question.response), 8);
    assert.equal(await page.locator('.md-select-menu-container.md-active').count(), 0);
});

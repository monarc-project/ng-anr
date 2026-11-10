/**
 * @link      https://github.com/monarc-project for the canonical source repository
 * @copyright Copyright (c) 2016-2026 Luxembourg House of Cybersecurity LHC.lu - Licensed under GNU Affero GPL v3
 * @license   MONARC is licensed under GNU Affero General Public License version 3
 */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { before, after, test } = require('node:test');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const modules = path.resolve(root, process.env.MONARC_ANGULAR_MODULES || '../ng-client/node_modules');
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

function record(id, label) {
    return {id, label, purposes: 'Provide a service', secMeasures: 'Access controls',
        createdAt: {date: '2026-11-09 10:00:00'}, updatedAt: null,
        controller: {id: 10, label: 'Controller', contact: 'contact@example.invalid'},
        representative: null, dpo: null,
        jointControllers: [{id: 11, label: 'Joint controller', contact: ''},
            {id: 12, label: 'Second joint controller', contact: ''}],
        personalData: [{id: 20, record: id, dataSubject: 'Customers', description: 'Contact information',
            retentionPeriod: 12, retentionPeriodMode: 1, retentionPeriodDescription: 'After contract',
            dataCategories: id === 1 ? [{id: 30, label: 'Email'}] : []}],
        recipients: [], internationalTransfers: [], processors: []};
}

async function render(t, {readonly = false, mobile = false, empty = false, failPatch = false, selectedRecord, shell = false, applicationShell = false} = {}) {
    const page = await browser.newPage({viewport: {width: mobile ? 390 : 1440, height: 900}});
    page.setDefaultTimeout(5000);
    t.after(() => page.close());
    const requests = [];
    const records = empty ? [] : [record(1, 'Customer support'), record(2, 'Staff onboarding')];
    await page.route('http://ropa.test/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/') return route.fulfill({contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>'});
        if (url.pathname === '/img/monarc.png') return route.fulfill({contentType: 'image/png', body: readFileSync(path.join(root, '../ng-client/img/monarc.png'))});
        if (url.pathname === '/views/anr/create.records.html') return route.fulfill({contentType: 'text/html', body: readFileSync(path.join(root, 'views/create.records.html'), 'utf8')});
        if (url.pathname === '/views/anr/export.record.html') return route.fulfill({contentType: 'text/html', body: readFileSync(path.join(root, 'views/export.record.html'), 'utf8')});
        if (url.pathname === '/views/anr/anr.ropa.html') return route.fulfill({contentType: 'text/html', body: readFileSync(path.join(root, 'views/anr.ropa.html'), 'utf8')});
        if (url.pathname.startsWith('/views/')) return route.fulfill({contentType: 'text/html', body: ''});
        const method = request.method();
        requests.push({method, path: url.pathname, query: url.search, data: request.postDataJSON()});
        let body;
        const recordId = url.pathname.match(/\/records\/(\d+)$/)?.[1];
        const exportId = url.pathname.match(/\/records\/(\d+)\/export$/)?.[1];
        if (url.pathname.endsWith('/export') && method === 'POST') {
            const exported = exportId ? records.filter(r => r.id === Number(exportId)) : records;
            return route.fulfill({contentType: 'application/json', headers: {'Content-Disposition': 'attachment; filename="records.json"'}, body: JSON.stringify(exported.map(r => ({name: r.label})))});
        }
        if (url.pathname.endsWith('/records') && method === 'GET') {
            const filter = (url.searchParams.get('filter') || '').toLowerCase();
            const filtered = records.filter(r => r.label.toLowerCase().includes(filter));
            body = {count: filtered.length, records: filtered};
        } else if (recordId && method === 'GET') {
            body = records.find(r => r.id === Number(recordId));
        } else if (recordId && method === 'PATCH') {
            if (failPatch) return route.fulfill({status: 412, contentType: 'application/json', body: '{"message":"Rejected edit"}'});
            Object.assign(records.find(r => r.id === Number(recordId)), request.postDataJSON());
            body = {status: 'ok', updatedAt: {date: '2026-11-09 12:00:00'}};
        } else if (url.pathname.endsWith('/records/duplicate') && method === 'POST') {
            const data = request.postDataJSON();
            const copy = JSON.parse(JSON.stringify(records.find(r => r.id === data.record)));
            copy.id = records.length + 1;
            copy.label = data.label;
            records.push(copy);
            body = {id: copy.id, status: 'ok'};
        } else if (url.pathname.endsWith('/records') && method === 'POST') {
            const created = record(records.length + 1, request.postDataJSON().label);
            records.push(created);
            body = {id: created.id, status: 'ok'};
        } else if (url.pathname.endsWith('/record-actors')) {
            body = {'record-actors': [], count: 0};
        } else if (url.pathname.endsWith('/record-data-categories')) {
            body = {'record-data-categories': [], count: 0};
        } else {
            body = {status: 'ok'};
        }
        return route.fulfill({contentType: 'application/json', body: JSON.stringify(body)});
    });
    await page.goto('http://ropa.test/#/client/project/1/anr/ropa' + (selectedRecord ? '?record=' + selectedRecord : ''));
    await page.addStyleTag({path: path.join(modules, 'angular-material/angular-material.css')});
    await page.addStyleTag({path: path.join(root, 'css/anr.css')});
    const font = readFileSync(path.join(root, '../ng-client/css/MaterialIcons-Regular.woff2')).toString('base64');
    await page.addStyleTag({content: `@font-face {font-family: 'Material Icons';src:url(data:font/woff2;base64,${font}) format('woff2')} md-icon {font-family:'Material Icons';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:'liga';-webkit-font-smoothing:antialiased} body {margin:0;font-family:Roboto,Arial,sans-serif;background:#f5f7f9}`});
    for (const name of ['angular', 'angular-animate', 'angular-aria', 'angular-messages', 'angular-material', 'angular-resource']) {
        await page.addScriptTag({path: path.join(modules, name, `${name}.js`)});
    }
    await page.evaluate(() => {
        window.uiErrors = [];
        window.downloads = [];
        window.deliverables = [];
        angular.module('AnrModule', ['ngMaterial', 'ngResource'])
            .filter('translate', () => value => value)
            .factory('gettextCatalog', () => ({getString: value => value}))
            .value('toastr', {success() {}, warning() {}})
            .value('DownloadService', {
                downloadJSON: (data, filename) => window.downloads.push({data, filename}),
                downloadCSV: (data, filename) => window.downloads.push({data, filename})
            })
            .controller('AnrLayoutCtrl', function () {})
            .value('ConfigService', {getLanguages: () => ({en: 1})})
            .config(['$provide', '$locationProvider', function ($provide, $locationProvider) {
                $locationProvider.hashPrefix('');
                $provide.decorator('$exceptionHandler', () => error => window.uiErrors.push(error.message));
            }]);
    });
    for (const file of ['RecordService.js', 'EditableDirective.js', 'AnrRopaCtrl.js']) {
        await page.addScriptTag({path: path.join(root, 'src', file)});
    }
    await page.evaluate(({template, readonly, applicationShell}) => {
        const injector = angular.bootstrap(document.body, ['AnrModule']);
        const scope = injector.get('$rootScope');
        scope.OFFICE_MODE = 'FO';
        scope.getUrlAnrId = () => 1;
        scope.getAnrLanguage = () => 1;
        scope.anr = {id: 1, rwd: readonly ? 0 : 1};
        scope.model = {anr: scope.anr};
        scope.display = {anrSelectedTabIndex: 4};
        scope.methodProgress = [1, 2, 3, 4].map(num => ({num, steps: [], color: 'blue'}));
        scope.isMethodStepComplete = () => false;
        scope.getStepProgress = () => 0;
        scope.openMethodDeliverable = step => window.deliverables.push(step);
        scope.isAnrReadOnly = readonly;
        scope.tabRopaDisplayed = true;
        scope.$dialogScope = scope;
        scope.handleRejectionDialog = () => {};
        const content = applicationShell
            ? `<div layout="row" style="min-height:100vh"><aside hide-xs style="width:320px">Analyses</aside><md-content layout="column" flex class="md-main-content"><md-toolbar><div class="md-toolbar-tools">Breadcrumbs</div></md-toolbar><div>${template}</div></md-content></div>`
            : template;
        angular.element(document.body).append(injector.get('$compile')(content)(scope));
        scope.$digest();
    }, {template: readFileSync(path.join(root, shell ? 'views/anr.layout.html' : 'views/anr.ropa.html'), 'utf8'), readonly, applicationShell});
    await page.waitForFunction(() => document.querySelector('.ropa-workspace') &&
        !angular.element(document.querySelector('.ropa-workspace')).scope().updatingRecords);
    assert.deepEqual(await page.evaluate(() => uiErrors), []);
    return {page, requests};
}

test('initial load uses one request and renders only the selected processing and section', async t => {
    const {page, requests} = await render(t);
    assert.equal(requests.filter(r => r.path.endsWith('/records')).length, 1);
    assert.equal(await page.locator('.ropa-record-item').count(), 2);
    assert.equal(await page.locator('.ropa-editor article').count(), 1);
    assert.equal(await page.locator('.ropa-section').count(), 1);
    await expect(page.locator('.ropa-editor h2')).toHaveText('Customer support');
    await page.getByRole('button', {name: /Staff onboarding/}).click();
    await expect(page.locator('.ropa-editor h2')).toHaveText('Staff onboarding');
    assert.equal(requests.length, 1);
    await page.screenshot({path: '/private/tmp/php84-05-ropa-desktop.png', fullPage: true});
});

test('search has an empty state and restores a valid selection when cleared', async t => {
    const {page} = await render(t);
    const search = page.getByRole('textbox', {name: 'Search...'});
    await search.fill('missing');
    await expect(page.locator('.ropa-empty-state')).toBeVisible();
    await expect(page.locator('.ropa-record-item')).toHaveCount(0);
    await search.fill('');
    await expect(page.locator('.ropa-record-item')).toHaveCount(2);
    await expect(page.locator('.ropa-editor h2')).toHaveText('Customer support');
});

test('editing a description field sends only that field in one PATCH and displays the returned update date', async t => {
    const {page, requests} = await render(t);
    const cell = page.locator('.ropa-description [edit-field="purposes"]');
    await cell.click();
    await cell.locator('textarea').fill('Updated purpose');
    await page.locator('.ropa-editor-heading h2').click();
    await expect(cell.locator('textarea')).toHaveCount(0);
    const writes = requests.filter(r => r.method !== 'GET');
    assert.deepEqual(writes, [{method: 'PATCH', path: '/api/client-anr/1/records/1', query: '', data: {purposes: 'Updated purpose'}}]);
    assert.equal(requests.filter(r => r.method === 'GET').length, 1);
    await expect(page.locator('.ropa-dates')).toContainText('Update date: 2026-11-09');
});

test('failed edits remain editable instead of appearing saved', async t => {
    const {page} = await render(t, {failPatch: true});
    const cell = page.locator('.ropa-description [edit-field="purposes"]');
    await cell.click();
    await cell.locator('textarea').fill('Rejected purpose');
    await page.locator('.ropa-editor-heading h2').click();
    await expect(cell.locator('textarea.editerror')).toBeVisible();
});

test('read-only users can navigate every section and see all joint controllers without writes', async t => {
    const {page, requests} = await render(t, {readonly: true});
    assert.equal(await page.getByRole('button', {name: 'Add a processing', exact: true}).count(), 0);
    await page.locator('.ropa-section-nav button').filter({hasText: 'Actors'}).click();
    await expect(page.locator('.ropa-section')).toContainText('Second joint controller');
    assert.equal(await page.locator('.ropa-section md-autocomplete').count(), 0);
    for (const label of ['Personal data', 'Recipients', 'International transfers', 'Processors', 'Description']) {
        await page.locator('.ropa-section-nav button').filter({hasText: label}).click();
        assert.equal(await page.locator('.ropa-section').count(), 1);
    }
    assert.equal(requests.filter(r => r.method !== 'GET').length, 0);
    assert.deepEqual(await page.evaluate(() => uiErrors), []);
});

test('mobile layout stays within the viewport and section navigation works', async t => {
    const {page} = await render(t, {mobile: true});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.ropa-section-nav button').filter({hasText: 'Personal data'}).click();
    await expect(page.locator('.ropa-section')).toContainText('Customers');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: '/private/tmp/php84-05-ropa-mobile.png', fullPage: true});
});

test('duplicate dialog selects the returned record and keeps it visible after a search', async t => {
    const {page, requests} = await render(t);
    await page.getByRole('textbox', {name: 'Search...'}).fill('Customer');
    await expect(page.locator('.ropa-record-item')).toHaveCount(1);
    await page.getByRole('button', {name: /Add a processing/}).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('md-select').click();
    await page.getByRole('option', {name: 'Customer support', exact: true}).click();
    await dialog.getByRole('textbox', {name: 'Label', exact: true}).fill('Customer support copy');
    await dialog.getByRole('button', {name: 'Create', exact: true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.ropa-editor h2')).toHaveText('Customer support copy');
    await expect(page.getByRole('textbox', {name: 'Search...'})).toHaveValue('');
    assert.deepEqual(requests.find(r => r.path.endsWith('/records/duplicate')).data, {record: 1, label: 'Customer support copy'});
    assert.deepEqual(await page.evaluate(() => uiErrors), []);
});

test('an empty register offers creation and then selects the new processing', async t => {
    const {page} = await render(t, {empty: true, shell: true, applicationShell: true});
    await expect(page.locator('.ropa-empty-state')).toBeVisible();
    await expect(page.locator('.ropa-toolbar-actions').getByRole('button', {name: /Add a processing/})).toBeVisible();
    await expect(page.locator('.ropa-empty-state').getByRole('button', {name: /Add a processing/})).toBeVisible();
    await page.getByRole('button', {name: /Add a processing/}).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', {name: 'Label', exact: true}).fill('First processing');
    await dialog.getByRole('button', {name: 'Create', exact: true}).click();
    await expect(page.locator('.ropa-editor h2')).toHaveText('First processing');
    await expect(page.locator('.ropa-record-item')).toHaveCount(1);
});

test('selection follows the URL and query navigation without reloading the register', async t => {
    const {page, requests} = await render(t, {selectedRecord: 2});
    await expect(page.locator('.ropa-editor h2')).toHaveText('Staff onboarding');
    await page.getByRole('button', {name: /Customer support/}).click();
    await expect(page).toHaveURL(/record=1$/);
    await page.evaluate(() => {
        const injector = angular.element(document.body).injector();
        injector.get('$location').search('record', 2);
        injector.get('$rootScope').$digest();
    });
    await expect(page.locator('.ropa-editor h2')).toHaveText('Staff onboarding');
    assert.equal(requests.length, 1);
});

test('Word export passes the displayed processing ID and a separate full-register document type', async t => {
    const {page} = await render(t);
    await page.getByRole('button', {name: /Staff onboarding/}).click();
    await page.locator('.ropa-record-actions').getByRole('button', {name: 'Export', exact: true}).click();
    await page.getByRole('menuitem', {name: '.docx', exact: true}).click();
    await page.getByRole('button', {name: 'Export all processings in one file'}).click();
    await page.getByRole('menuitem', {name: '.docx', exact: true}).click();
    assert.deepEqual(await page.evaluate(() => window.deliverables), [{num: 6, record: 2}, {num: 7}]);
});

async function exportJson(page, all) {
    const button = all ? page.getByRole('button', {name: 'Export all processings in one file'})
        : page.locator('.ropa-record-actions').getByRole('button', {name: 'Export', exact: true});
    await button.click();
    await page.getByRole('menuitem', {name: '.json', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Export', exact: true}).click();
    await page.waitForFunction(() => window.downloads.length > 0);
}

test('JSON export downloads the selected record after switching in the list', async t => {
    const {page, requests} = await render(t);
    await page.getByRole('button', {name: /Staff onboarding/}).click();
    await exportJson(page, false);
    assert.deepEqual(await page.evaluate(() => window.downloads[0].data), [{name: 'Staff onboarding'}]);
    assert.equal(requests.find(r => r.path.endsWith('/export')).path, '/api/client-anr/1/records/2/export');
});

test('full-register JSON export remains available even when the search has no matches', async t => {
    const {page, requests} = await render(t);
    await page.getByRole('textbox', {name: 'Search...'}).fill('missing');
    await expect(page.locator('.ropa-record-item')).toHaveCount(0);
    await exportJson(page, true);
    assert.deepEqual(await page.evaluate(() => window.downloads[0].data), [{name: 'Customer support'}, {name: 'Staff onboarding'}]);
    const request = requests.find(r => r.path.endsWith('/export'));
    assert.equal(request.path, '/api/client-anr/1/records/export');
    assert.deepEqual(request.data, {export: 'All', password: ''});
});

test('CSV exports the selected record or the full register with empty categories independently of search', async t => {
    const {page, requests} = await render(t);
    await page.getByRole('button', {name: /Staff onboarding/}).click();
    await page.locator('.ropa-record-actions').getByRole('button', {name: 'Export', exact: true}).click();
    await page.getByRole('menuitem', {name: '.csv', exact: true}).click();
    await page.waitForFunction(() => window.downloads.length === 1);
    const selected = await page.evaluate(() => window.downloads[0]);
    assert.match(selected.data, /Staff onboarding/);
    assert.doesNotMatch(selected.data, /Customer support/);
    await page.getByRole('textbox', {name: 'Search...'}).fill('Staff');
    await expect(page.locator('.ropa-record-item')).toHaveCount(1);
    await page.getByRole('button', {name: 'Export all processings in one file'}).click();
    await page.getByRole('menuitem', {name: '.csv', exact: true}).click();
    await page.waitForFunction(() => window.downloads.length === 2);
    const all = await page.evaluate(() => window.downloads[1]);
    assert.equal(all.filename, 'records_list.csv');
    assert.match(all.data, /Customer support/);
    assert.match(all.data, /Staff onboarding/);
    const query = requests.filter(r => r.path.endsWith('/records')).at(-1).query;
    assert.ok(!query.includes('filter='));
    assert.deepEqual(await page.evaluate(() => uiErrors), []);
});

test('method controls and their final logo sit above the white card on ROPA and risk analysis', async t => {
    const {page} = await render(t, {shell: true});
    await expect(page.locator('.anr-workspace > .anr-method-progress img[alt="MONARC"]')).toBeVisible();
    await expect(page.locator('.main-card .anr-method-progress')).toHaveCount(0);
    await expect.poll(() => page.locator('.anr-method-progress img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    const logo = await page.locator('.anr-method-progress .step-bullet.white').boundingBox();
    assert.equal(logo.height, 32);
    assert.equal(logo.width, 32);
    const progress = await page.locator('.anr-method-progress').boundingBox();
    const card = await page.locator('.main-card').boundingBox();
    assert.equal(card.y - progress.y - progress.height, 8);
    await expect(page.locator('.anr-method-progress')).toBeVisible();
    assert.equal(await page.locator('.anr-method-progress [ng-click="showMethodBox(idx+1, step, $event)"]').count(), 4);
    await page.evaluate(() => {
        const scope = angular.element(document.body).injector().get('$rootScope');
        scope.display.anrSelectedTabIndex = 0;
        scope.$digest();
    });
    await expect(page.locator('.anr-method-progress')).toBeVisible();
    assert.equal(await page.locator('.anr-method-progress [ng-click="showMethodBox(idx+1, step, $event)"]').count(), 4);
    await page.evaluate(() => {
        const scope = angular.element(document.body).injector().get('$rootScope');
        scope.OFFICE_MODE = 'BO';
        scope.$digest();
    });
    await expect(page.locator('.anr-method-progress')).toHaveCount(0);
    assert.ok((await page.locator('.main-card').boundingBox()).y <= 8);
});

for (const viewport of [{width: 1440, height: 1000}, {width: 1024, height: 768},
    {width: 390, height: 844}, {width: 844, height: 390}]) {
    test(`analysis workspace fills the area below the toolbar at ${viewport.width}x${viewport.height}`, async t => {
        const {page} = await render(t, {shell: true, applicationShell: true});
        await page.setViewportSize(viewport);
        for (const office of ['FO', 'BO']) {
            await page.evaluate(office => {
                const scope = angular.element(document.body).injector().get('$rootScope');
                scope.OFFICE_MODE = office;
                scope.display.anrSelectedTabIndex = 5;
                scope.$digest();
            }, office);
            await expect.poll(() => page.evaluate(() => {
                const card = document.querySelector('.anr-workspace > .main-card').getBoundingClientRect();
                const content = document.querySelector('.md-main-content').getBoundingClientRect();
                const toolbar = document.querySelector('.md-main-content > md-toolbar').getBoundingClientRect();
                return {top: Math.round(card.top - toolbar.bottom), left: Math.round(card.left - content.left),
                    right: Math.round(content.right - card.right), bottom: Math.round(innerHeight - card.bottom)};
            })).toEqual({top: office === 'FO' ? 48 : 8, left: 8, right: 8, bottom: 0});
        }
        await page.evaluate(() => {
            const content = document.createElement('div');
            content.style.height = (innerHeight + 200) + 'px';
            content.textContent = 'Long analysis content';
            document.querySelector('.anr-workspace > .main-card').append(content);
        });
        const box = await page.locator('.anr-workspace > .main-card').boundingBox();
        assert.ok(box.height > viewport.height, 'long content must expand the card');
        assert.deepEqual(await page.evaluate(() => uiErrors), []);
    });
}

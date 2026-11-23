/**
 * @link      https://github.com/monarc-project for the canonical source repository
 * @copyright Copyright (c) 2016-2026 Luxembourg House of Cybersecurity LHC.lu - Licensed under GNU Affero GPL v3
 * @license   MONARC is licensed under GNU Affero General Public License version 3
 */

const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {chromium, expect} = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const modules = path.resolve(root, process.env.MONARC_ANGULAR_MODULES || '../ng-client/node_modules');
let browser;
before(async () => { browser = await chromium.launch({headless: true}); });
after(async () => { await browser?.close(); });

async function environment(t) {
    const page = await browser.newPage();
    t.after(() => page.close());
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addStyleTag({path: path.join(modules, 'angular-material/angular-material.css')});
    await page.addStyleTag({path: path.join(root, 'css/anr.css')});
    for (const name of ['angular', 'angular-animate', 'angular-aria', 'angular-messages', 'angular-material', 'angular-resource']) {
        await page.addScriptTag({path: path.join(modules, name, `${name}.js`)});
    }
    await page.addScriptTag({path: path.join(modules, 'angular-ui-tree/dist/angular-ui-tree.js')});
    await page.evaluate(() => {
        window.uiErrors = [];
        angular.module('AnrModule', ['ngMaterial', 'ngResource', 'ui.tree'])
            .filter('translate', () => value => value);
        angular.module('ClientApp', ['AnrModule'])
            .value('$stateParams', {modelId: 77})
            .config(['$provide', function ($provide) {
                $provide.decorator('$exceptionHandler', () => error => window.uiErrors.push(error.message));
            }]);
    });
    for (const file of ['src/ToolsAnrService.js', '../ng-client/src/TableHelperService.js', 'src/AnrLayoutCtrl.js', 'src/AnrSoaCtrl.js']) {
        await page.addScriptTag({path: path.resolve(root, file)});
    }
    await page.evaluate(() => {
        const injector = angular.bootstrap(document.body, ['ClientApp']);
        const scope = injector.get('$rootScope');
        const $q = injector.get('$q');
        scope.getAnrLanguage = () => 2;
        scope.setAnrLanguage = () => {};
        scope.getLanguageCode = () => 'fr';
        scope._langField = field => field;
        scope.$dialogScope = scope.$new();
        window.fixture = {injector, root: scope, $q};
        window.controllerLocals = function (name, child) {
            const definition = angular.module('AnrModule')._invokeQueue.find(row => row[2][0] === name)[2][1];
            const pending = $q.defer().promise;
            const service = new Proxy({}, {get: () => () => pending});
            const locals = {};
            for (const dependency of definition.slice(0, -1)) {
                locals[dependency] = injector.has(dependency) ? injector.get(dependency) : service;
            }
            locals.$scope = child;
            locals.$http = {get: () => pending};
            locals.gettext = text => text;
            locals.gettextCatalog = {getString: text => text};
            locals.$state = {current: {name: 'main.project.anr.ropa'}, $current: {name: 'main.project.anr.ropa'}, transitionTo() {}};
            locals.$transitions = {onBefore: () => () => {}, onSuccess: () => () => {}};
            return locals;
        };
    });
    return page;
}

for (const office of ['FO', 'BO']) {
    test(`${office} waits for configuration before loading the analysis and initializes the selected language once`, async t => {
        const page = await environment(t);
        const result = await page.evaluate(office => {
            const {injector, root, $q} = fixture;
            root.OFFICE_MODE = office;
            const scope = root.$new().$new();
            const analysis = $q.defer();
            let loaded = false;
            let requests = 0;
            const service = {getAnr: () => { requests++; return analysis.promise; }};
            const locals = controllerLocals('AnrLayoutCtrl', scope);
            locals.$injector = {get: () => service};
            locals.ModelService = {getModel: service.getAnr};
            locals.UserService = {getDataLanguage: () => 2};
            const languages = {1: {code: 'en'}, 2: {code: 'fr'}};
            locals.ConfigService = {isLoaded: () => loaded, getLanguages: () => loaded ? languages : {1: languages[1]},
                getLanguage: index => languages[index] || languages[1]};
            locals.SoaScaleCommentService = {getSoaScaleComments: () => $q.resolve({data: []})};
            injector.get('$controller')('AnrLayoutCtrl', locals);
            for (const method of ['updateRisksManagementAccess', 'updateAnrRisksTable', 'updateAnrRisksOpTable',
                'updateInstances', 'updateObjectsLibrary', 'updateScales', 'updateOperationalRiskScales',
                'updateReferentials', 'updateRecommendationsSets']) scope[method] = () => {};
            root.$digest();
            const beforeConfiguration = requests;
            loaded = true;
            root.$digest();
            analysis.resolve(office === 'FO'
                ? {id: 77, language: 2, languageCode: 'fr', rwd: 1}
                : {anr: {id: 77}, showRolfBrut: false});
            root.$digest();
            loaded = false;
            root.$digest();
            loaded = true;
            root.$digest();
            return {beforeConfiguration, requests, language: scope.opRisksLanguageSelected,
                references: scope.referentials.items.referentials, errors: uiErrors};
        }, office);
        assert.deepEqual(result, {beforeConfiguration: 0, requests: 1, language: 'fr', references: [], errors: []});
    });
}

async function mountSoa(page) {
    await page.evaluate(() => {
        const {injector, root, $q} = fixture;
        root.referentials = {items: {referentials: [{uuid: 'parent-only'}]}};
        const scope = root.$new();
        const refs = [];
        const measures = [];
        const locals = controllerLocals('AnrSoaCtrl', scope);
        locals.ReferentialService = {getReferentials: () => {
            const request = $q.defer(); refs.push(request); return request.promise;
        }};
        locals.ClientSoaService = {getSoas: query => {
            const request = $q.defer(); measures.push({query, request}); return request.promise;
        }};
        locals.SOACategoryService = {getCategories: () => $q.resolve({categories: []})};
        injector.get('$controller')('AnrSoaCtrl', locals);
        fixture.soa = {scope, refs, measures};
        root.$digest();
    });
}

test('SOA owns its referentials state and retains only selections present in refreshed data', async t => {
    const page = await environment(t);
    await mountSoa(page);
    const result = await page.evaluate(() => {
        const {scope, refs, measures} = fixture.soa;
        refs[0].resolve({referentials: [{uuid: 'a'}, {uuid: 'b'}]});
        fixture.root.$digest();
        scope.selectReferential('b');
        scope.updateSoaReferentials();
        refs[1].resolve({referentials: [{uuid: 'b'}]});
        fixture.root.$digest();
        const retained = scope.referential_uuid;
        scope.updateSoaReferentials();
        refs[2].resolve({referentials: [{uuid: 'c'}]});
        fixture.root.$digest();
        return {retained, selected: scope.referential_uuid, parent: fixture.root.referentials.items.referentials,
            queries: measures.map(row => row.query.referential), errors: uiErrors};
    });
    assert.deepEqual(result, {retained: 'b', selected: 'c', parent: [{uuid: 'parent-only'}],
        queries: ['a', 'b', 'b', 'c'], errors: []});
});

test('SOA accepts an empty register, ignores measure refreshes without a selection and removes destroyed listeners', async t => {
    const page = await environment(t);
    await mountSoa(page);
    const result = await page.evaluate(() => {
        const {scope, refs, measures} = fixture.soa;
        refs[0].resolve({referentials: []});
        fixture.root.$digest();
        fixture.root.$broadcast('controlsUpdated');
        fixture.root.$broadcast('soaScaleUpdated');
        const selected = scope.referential_uuid;
        const ready = scope.updatingReferentials;
        scope.$destroy();
        fixture.root.$broadcast('referentialsUpdated');
        fixture.root.$broadcast('controlsUpdated');
        fixture.root.$digest();
        return {selected, ready, referenceRequests: refs.length, measureRequests: measures.length, errors: uiErrors};
    });
    assert.deepEqual(result, {selected: null, ready: true, referenceRequests: 1, measureRequests: 0, errors: []});
});

test('a delayed SOA measure response cannot overwrite another referential or fail after a reload', async t => {
    const page = await environment(t);
    await mountSoa(page);
    const result = await page.evaluate(() => {
        const {scope, refs, measures} = fixture.soa;
        refs[0].resolve({referentials: [{uuid: 'a'}, {uuid: 'b'}]});
        fixture.root.$digest();
        scope.selectReferential('b');
        measures[0].request.resolve({soaMeasures: [{id: 'old-a'}]});
        fixture.root.$digest();
        const beforeB = scope.soa_measures.b.items;
        scope.updateSoaReferentials();
        refs[1].resolve({referentials: []});
        fixture.root.$digest();
        measures[1].request.resolve({soaMeasures: [{id: 'old-b'}]});
        fixture.root.$digest();
        return {beforeB, selected: scope.referential_uuid, references: scope.referentials.items.referentials, errors: uiErrors};
    });
    assert.deepEqual(result, {beforeB: [], selected: null, references: [], errors: []});
});

test('SOA receives updates while Material disconnects its inactive tab and refreshes on return', async t => {
    const page = await environment(t);
    await mountSoa(page);
    const result = await page.evaluate(() => {
        const {scope, refs} = fixture.soa;
        refs[0].resolve({referentials: [{uuid: 'a'}]});
        fixture.root.$digest();
        const material = fixture.injector.get('$mdUtil');
        material.disconnectScope(scope);
        fixture.root.$broadcast('referentialsUpdated');
        fixture.root.$digest();
        const queued = scope.referentialsUpdated;
        const whileDisconnected = refs.length;
        material.reconnectScope(scope);
        fixture.root.$digest();
        return {queued, whileDisconnected, afterReturn: refs.length, errors: uiErrors};
    });
    assert.deepEqual(result, {queued: true, whileDisconnected: 1, afterReturn: 2, errors: []});
});

async function mountAnalysisControls(page, readonly = false) {
    await page.evaluate(({layout, riskAnalysis, readonly}) => {
        const {injector, root, $q} = fixture;
        root.OFFICE_MODE = 'FO';
        const scope = root.$new().$new();
        const writes = [];
        const clientAnrService = {
            getAnr: () => $q.resolve({id: 77, language: 1, languageCode: 'en', rwd: readonly ? 0 : 1}),
            updateAnr: (data, success) => { writes.push(data); success(); },
        };
        const locals = controllerLocals('AnrLayoutCtrl', scope);
        locals.$injector = {get: () => clientAnrService};
        locals.ConfigService = {isLoaded: () => true, getLanguages: () => ({1: {code: 'en'}}),
            getLanguage: () => ({code: 'en'})};
        locals.SoaScaleCommentService = {getSoaScaleComments: () => $q.resolve({data: []})};
        locals.AnrService = {addInstance: (...args) => {
            writes.push({anr: args[0], object: args[1], parent: args[2], position: args[3]});
            args[4]();
        }};
        injector.get('$controller')('AnrLayoutCtrl', locals);
        for (const method of ['updateRisksManagementAccess', 'updateAnrRisksTable', 'updateAnrRisksOpTable',
            'updateObjectsLibrary', 'updateScales', 'updateOperationalRiskScales',
            'updateReferentials', 'updateRecommendationsSets']) scope[method] = () => {};
        scope.updateInstances = callback => callback?.();
        scope.isRiskAnalysisView = () => false;
        root.$digest();
        scope._langField = (value, field) => typeof value === 'string' ? value : value[field + '1'];
        scope.display.anrSelectedTabIndex = 0;
        scope.tabRiskAnalysisDisplayed = true;
        scope.anr_obj_instances_data = [{id: 10, type: 'inst', name1: 'Existing asset', __children__: []}];
        scope.anr_obj_library_data = [{id: 20, type: 'libcat', label1: 'Assets', __collapsed__: false,
            __children__: [{uuid: 'library-asset', type: 'lib', name1: 'Library asset', __children__: []}]}];
        for (const match of layout.matchAll(/ng-include="'([^']+)'"/g)) {
            injector.get('$templateCache').put(match[1], match[1].endsWith('_anr.riskanalysis.html') ? riskAnalysis : '');
        }
        angular.element(document.body).append(injector.get('$compile')(
            layout.replace('ng-controller="AnrLayoutCtrl"', '')
        )(scope));
        root.$digest();
        window.controls = {scope, writes};
    }, {layout: readFileSync(path.join(root, 'views/anr.layout.html'), 'utf8'),
        riskAnalysis: readFileSync(path.join(root, 'views/_anr.riskanalysis.html'), 'utf8'), readonly});
}

test('method substep buttons toggle in both directions and remain available on the ROPA tab', async t => {
    const page = await environment(t);
    await mountAnalysisControls(page);
    await page.locator('.method-menu-step-1').click();
    const checkbox = page.locator('.md-monarc-method-box .md-icon-button').first();
    await expect(checkbox).toHaveText('check_box_outline_blank');
    await checkbox.click();
    await expect(checkbox).toHaveText('check_box');
    await checkbox.click();
    await expect(checkbox).toHaveText('check_box_outline_blank');
    assert.deepEqual(await page.evaluate(() => controls.writes), [
        {id: 77, initAnrContext: 1}, {id: 77, initAnrContext: 0},
    ]);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { controls.scope.display.anrSelectedTabIndex = 4; fixture.root.$digest(); });
    await expect(page.locator('.method-menu-step-1')).toBeVisible();
    assert.deepEqual(await page.evaluate(() => uiErrors), []);
});

test('read-only analysis method substeps do not send updates', async t => {
    const page = await environment(t);
    await mountAnalysisControls(page, true);
    await page.locator('.method-menu-step-1').click();
    await page.locator('.md-monarc-method-box .md-icon-button').first().click();
    assert.deepEqual(await page.evaluate(() => controls.writes), []);
    assert.deepEqual(await page.evaluate(() => uiErrors), []);
});

for (const readonly of [false, true]) {
    test(`asset-library dragging ${readonly ? 'is blocked for read-only access' : 'creates an analysis instance'}`, async t => {
        const page = await environment(t);
        await mountAnalysisControls(page, readonly);
        const source = page.locator('#objlib-tree-root .md-tree-link').filter({hasText: 'Library asset'});
        const destination = page.locator('#inst-tree-root .md-tree-link').filter({hasText: 'Existing asset'});
        await source.scrollIntoViewIfNeeded();
        const start = await source.boundingBox();
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(200);
        await destination.scrollIntoViewIfNeeded();
        const end = await destination.boundingBox();
        await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {steps: 20});
        await page.waitForTimeout(200);
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => controls.writes)).toEqual(readonly ? [] : [
            {anr: 77, object: 'library-asset', parent: 10, position: 0},
        ]);
        assert.deepEqual(await page.evaluate(() => uiErrors), []);
    });
}

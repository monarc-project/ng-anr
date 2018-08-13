(function () {

    angular
        .module('AnrModule')
        .controller('AnrKbMgmtCtrl', [
            '$scope', '$stateParams', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', 'TableHelperService',
            'AssetService', 'ThreatService', 'VulnService', 'AmvService', 'MeasureService', 'ClientSoaService', 'TagService', 'RiskService','ClientCategoryService',
             '$state', '$timeout', '$rootScope',
            AnrKbMgmtCtrl
        ]);

    /**
     * ANR > KB
     */
    function AnrKbMgmtCtrl($scope, $stateParams, toastr, $mdMedia, $mdDialog, gettextCatalog, TableHelperService,
                                  AssetService, ThreatService, VulnService, AmvService, MeasureService, ClientSoaService, TagService,
                                  RiskService,ClientCategoryService, $state, $timeout, $rootScope) {
        $scope.tab = -1;
        $scope.gettext = gettextCatalog.getString;
        TableHelperService.resetBookmarks();

        $scope.risk_tag_filter = null;


        /**** FO ADDITIONS ****/

        /*
         * Global helpers
         */

        $scope.specificityStr = function (type) {
            switch (type) {
                case 0: return gettextCatalog.getString('Generic');
                case 1: return gettextCatalog.getString('Specific');
            }
        };

        $scope.selectTab = function (tab) {
            switch (tab) {
                case 'assets': $scope.currentTabIndex = 0; break;
                case 'threats': $scope.currentTabIndex = 1; break;
                case 'vulns': $scope.currentTabIndex = 2; break;
                case 'measures': $scope.currentTabIndex = 3; break;
                case 'amvs': $scope.currentTabIndex = 4; break;
                case 'objlibs': $scope.currentTabIndex = 5; break;
                case 'categories': $scope.currentTabIndex = 6; break;

            }
        }
        //$scope.selectTab($scope.tab);

        $scope.$on('setup-kb-mgmt', function () {
            if ($scope.tab == -1) {
                $scope.tab = 0;
                $scope.selectAssetsTab();
            }
        });

        /*
         * ASSETS TAB
         */
        $scope.assets = TableHelperService.build('label1', 20, 1, '');
        $scope.assets.activeFilter = 1;
        var assetsFilterWatch;

        $scope.selectAssetsTab = function () {
            if ($scope.tab == -1) {
                return;
            }

            var initAssetsFilter = true;
            assetsFilterWatch = $scope.$watch('assets.activeFilter', function() {
                if (initAssetsFilter) {
                    initAssetsFilter = false;
                } else {
                    $scope.assets.query.page = 1;
                    $scope.updateAssets();
                }
            });
            TableHelperService.watchSearch($scope, 'assets.query.filter', $scope.assets.query, $scope.updateAssets, $scope.assets);
        };

        $scope.deselectAssetsTab = function () {
            if (assetsFilterWatch) {
                assetsFilterWatch();
            }
            TableHelperService.unwatchSearch($scope.assets);
        };

        $scope.updateAssets = function () {
            var query = angular.copy($scope.assets.query);
            query.status = $scope.assets.activeFilter;

            if ($scope.assets.previousQueryOrder != $scope.assets.query.order) {
                $scope.assets.query.page = query.page = 1;
                $scope.assets.previousQueryOrder = $scope.assets.query.order;
            }

            $scope.assets.promise = AssetService.getAssets(query);
            $scope.assets.promise.then(
                function (data) {
                    $scope.assets.items = data;
                }
            )
        };

        $scope.removeAssetsFilter = function () {
            TableHelperService.removeFilter($scope.assets);
        };

        $scope.toggleAssetStatus = function (asset) {
            AssetService.patchAsset(asset.id, {status: !asset.status}, function () {
                asset.status = !asset.status;
            });
        };

        $scope.createNewAsset = function (ev, asset) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ModelService', 'ConfigService', 'asset', CreateAssetDialogCtrl],
                templateUrl: 'views/anr/create.assets.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'asset': asset
                }
            })
                .then(function (asset) {
                    var cont = asset.cont;
                    asset.cont = undefined;

                    AssetService.createAsset(asset,
                        function () {
                            $scope.updateAssets();

                            if (cont) {
                                $scope.createNewAsset(ev);
                            }

                            if (asset.mode == 0 && asset.models && asset.models.length > 0) {
                                // If we create a generic asset, but we still have specific models, we should warn
                                toastr.warning(gettextCatalog.getString('The asset type has been created successfully, however without models, the element may not be specific.',
                                    {assetLabel: $scope._langField(asset,'label')}));
                            } else {
                                toastr.success(gettextCatalog.getString('The asset type has been created successfully.',
                                    {assetLabel: $scope._langField(asset,'label')}), gettextCatalog.getString('Creation successful'));
                            }
                        },

                        function () {
                            $scope.createNewAsset(ev, asset);
                        }
                    );
                });
        };

        $scope.editAsset = function (ev, asset) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            AssetService.getAsset(asset.id).then(function (assetData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ModelService', 'ConfigService', 'asset', CreateAssetDialogCtrl],
                    templateUrl: 'views/anr/create.assets.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'asset': assetData
                    }
                })
                    .then(function (asset) {
                        AssetService.updateAsset(asset,
                            function () {
                                $scope.updateAssets();

                                if (asset.mode == 0 && asset.models && asset.models.length > 0) {
                                    // If we create a generic asset, but we still have specific models, we should warn
                                    toastr.warning(gettextCatalog.getString('The asset type has been edited successfully, however without models, the element may not be specific.',
                                        {assetLabel: $scope._langField(asset,'label')}));
                                } else {
                                    toastr.success(gettextCatalog.getString('The asset type has been edited successfully.',
                                        {assetLabel: $scope._langField(asset,'label')}), gettextCatalog.getString('Edition successful'));
                                }
                            },

                            function () {
                                $scope.editAsset(ev, asset);
                            }
                        );
                    });
            });
        };

        $scope.deleteAsset = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete asset type?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                AssetService.deleteAsset(item.id,
                    function () {
                        $scope.updateAssets();
                        toastr.success(gettextCatalog.getString('The asset type has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteAssetMass = function (ev, item) {
            var count = $scope.assets.selected.length;
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected asset type(s)?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.assets.selected.length; ++i) {
                    ids.push($scope.assets.selected[i].id);
                }

                AssetService.deleteMassAsset(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} assets have been deleted.',
                        {count: count}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateAssets();
                });

                $scope.assets.selected = [];

            });
        };

        $scope.assetTypeStr = function (type) {
            switch (type) {
                case 1: return gettextCatalog.getString('Primary');
                case 2: return gettextCatalog.getString('Secondary');
            }
        };

        /*
         * THREATS TAB
         */
        $scope.threats = TableHelperService.build('label1', 20, 1, '');
        $scope.threats.activeFilter = 1;
        var threatsFilterWatch;

        $scope.selectThreatsTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'threats'});
            var initThreatsFilter = true;
            threatsFilterWatch = $scope.$watch('threats.activeFilter', function() {
                if (initThreatsFilter) {
                    initThreatsFilter = false;
                } else {
                    $scope.updateThreats();
                }
            });
            TableHelperService.watchSearch($scope, 'threats.query.filter', $scope.threats.query, $scope.updateThreats, $scope.threats);
        };

        $scope.deselectThreatsTab = function () {
            threatsFilterWatch();
            TableHelperService.unwatchSearch($scope.threats);
        };

        $scope.updateThreats = function () {
            var query = angular.copy($scope.threats.query);
            query.status = $scope.threats.activeFilter;

            if ($scope.threats.previousQueryOrder != $scope.threats.query.order) {
                $scope.threats.query.page = query.page = 1;
                $scope.threats.previousQueryOrder = $scope.threats.query.order;
            }

            $scope.threats.promise = ThreatService.getThreats(query);
            $scope.threats.promise.then(
                function (data) {
                    $scope.threats.items = data;
                }
            )
        };
        $scope.removeThreatsFilter = function () {
            TableHelperService.removeFilter($scope.threats);
        };


        $scope.toggleThreatStatus = function (threat) {
            ThreatService.patchThreat(threat.id, {status: !threat.status}, function () {
                threat.status = !threat.status;
            });
        };

        $scope.createNewThreat = function (ev, threat) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'ModelService', 'ThreatService', 'ConfigService', 'threat', CreateThreatDialogCtrl],
                templateUrl: 'views/anr/create.threats.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'threat': threat
                }
            })
                .then(function (threat) {
                    var themeBackup = threat.theme;

                    if (threat.theme) {
                        threat.theme = threat.theme.id;
                    }

                    var cont = threat.cont;
                    threat.cont = undefined;
                    if (cont) {
                        $scope.createNewThreat(ev);
                    }

                    ThreatService.createThreat(threat,
                        function () {
                            $scope.updateThreats();

                            if (threat.mode == 0 && threat.models && threat.models.length > 0) {
                                // If we create a generic threat, but we still have specific models, we should warn
                                toastr.warning(gettextCatalog.getString('The threat has been created successfully, however without models, the element may not be specific.',
                                    {threatLabel: $scope._langField(threat,'label')}));
                            } else {
                                toastr.success(gettextCatalog.getString('The threat has been created successfully.',
                                    {threatLabel: $scope._langField(threat,'label')}), gettextCatalog.getString('Creation successful'));
                            }
                        },

                        function () {
                            threat.theme = themeBackup;
                            $scope.createNewThreat(ev, threat);
                        }
                    );
                });
        };

        $scope.editThreat = function (ev, threat) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $scope.controls = [];//hack pour le bug référencé dans les forums de Material quand on ouvre deux fois d'affilée la modal
            ThreatService.getThreat(threat.id).then(function (threatData) {
                $scope.controls = [{}];//hack pour le bug référencé dans les forums de Material quand on ouvre deux fois d'affilée la modal
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', '$q', 'ModelService', 'ThreatService', 'ConfigService', 'threat', CreateThreatDialogCtrl],
                    templateUrl: 'views/anr/create.threats.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'threat': threatData
                    }
                })
                    .then(function (threat) {
                        var themeBackup = threat.theme;
                        if (threat.theme) {
                            threat.theme = threat.theme.id;
                        }

                        ThreatService.updateThreat(threat,
                            function () {
                                $scope.updateThreats();

                                if (threat.mode == 0 && threat.models && threat.models.length > 0) {
                                    // If we create a generic threat, but we still have specific models, we should warn
                                    toastr.warning(gettextCatalog.getString('The threat has been edited successfully, however without models, the element may not be specific.',
                                        {threatLabel: $scope._langField(threat,'label')}));
                                } else {
                                    toastr.success(gettextCatalog.getString('The threat has been edited successfully.',
                                        {threatLabel: $scope._langField(threat,'label')}), gettextCatalog.getString('Edition successful'));
                                }
                                threat.theme = themeBackup;
                            },

                            function () {
                                threat.theme = themeBackup;
                                $scope.editThreat(ev, threat);
                            }
                        );
                    });
            });
        };

        $scope.deleteThreat = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete threat?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                ThreatService.deleteThreat(item.id,
                    function () {
                        $scope.updateThreats();
                        toastr.success(gettextCatalog.getString('The threat has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteThreatMass = function (ev, item) {
            var outpromise = null;
            var count = $scope.threats.selected.length;

            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected threat(s)?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.threats.selected.length; ++i) {
                    ids.push($scope.threats.selected[i].id);
                }

                ThreatService.deleteMassThreat(ids, function () {
                    $scope.updateThreats();
                    toastr.success(gettextCatalog.getString('{{count}} threats have been deleted.',
                        {count: ids.length}), gettextCatalog.getString('Deletion successful'));
                });

                $scope.threats.selected = [];

            });
        };

        /*
         * VULNS TAB
         */
        $scope.vulns = TableHelperService.build('label1', 20, 1, '');
        $scope.vulns.activeFilter = 1;
        var vulnsFilterWatch;


        $scope.selectVulnsTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'vulns'});
            var initVulnsFilter = true;
            vulnsFilterWatch = $scope.$watch('vulns.activeFilter', function() {
                if (initVulnsFilter) {
                    initVulnsFilter = false;
                } else {
                    $scope.updateVulns();
                }
            });

            TableHelperService.watchSearch($scope, 'vulns.query.filter', $scope.vulns.query, $scope.updateVulns, $scope.vulns);
        };

        $scope.deselectVulnsTab = function () {
            TableHelperService.unwatchSearch($scope.vulns);
        };

        $scope.updateVulns = function () {
            var query = angular.copy($scope.vulns.query);
            query.status = $scope.vulns.activeFilter;

            if ($scope.vulns.previousQueryOrder != $scope.vulns.query.order) {
                $scope.vulns.query.page = query.page = 1;
                $scope.vulns.previousQueryOrder = $scope.vulns.query.order;
            }

            $scope.vulns.promise = VulnService.getVulns(query);
            $scope.vulns.promise.then(
                function (data) {
                    $scope.vulns.items = data;
                }
            )
        };
        $scope.removeVulnsFilter = function () {
            TableHelperService.removeFilter($scope.vulns);
        };

        $scope.toggleVulnStatus = function (vuln) {
            VulnService.patchVuln(vuln.id, {status: !vuln.status}, function () {
                vuln.status = !vuln.status;
            });
        }

        $scope.createNewVuln = function (ev, vuln) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ModelService', 'ConfigService', 'vuln', CreateVulnDialogCtrl],
                templateUrl: 'views/anr/create.vulns.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'vuln': vuln
                }
            })
                .then(function (vuln) {
                    var cont = vuln.cont;
                    vuln.cont = undefined;
                    if (cont) {
                        $scope.createNewVuln(ev);
                    }

                    VulnService.createVuln(vuln,
                        function () {
                            $scope.updateVulns();

                            if (vuln.mode == 0 && vuln.models && vuln.models.length > 0) {
                                // If we create a generic vulnerability, but we still have specific models, we should warn
                                toastr.warning(gettextCatalog.getString('The vulnerability has been created successfully, however without models, the element may not be specific.',
                                    {vulnLabel: $scope._langField(vuln,'label')}));
                            } else {
                                toastr.success(gettextCatalog.getString('The vulnerability has been created successfully.',
                                    {vulnLabel: $scope._langField(vuln,'label')}), gettextCatalog.getString('Creation successful'));
                            }
                        },

                        function () {
                            $scope.createNewVuln(ev, vuln);
                        }
                    );
                });
        };

        $scope.editVuln = function (ev, vuln) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $scope.controls = [];//hack pour le bug référencé dans les forums de Material quand on ouvre deux fois d'affilée la modal
            VulnService.getVuln(vuln.id).then(function (vulnData) {
                $scope.controls = [{}];//hack pour le bug référencé dans les forums de Material quand on ouvre deux fois d'affilée la modal
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ModelService', 'ConfigService', 'vuln', CreateVulnDialogCtrl],
                    templateUrl: 'views/anr/create.vulns.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'vuln': vulnData
                    }
                })
                    .then(function (vuln) {
                        VulnService.updateVuln(vuln,
                            function () {
                                $scope.updateVulns();

                                if (vuln.mode == 0 && vuln.models && vuln.models.length > 0) {
                                    // If we create a generic vulnerability, but we still have specific models, we should warn
                                    toastr.warning(gettextCatalog.getString('The vulnerability has been edited successfully, however without models, the element may not be specific.',
                                        {vulnLabel: $scope._langField(vuln,'label')}));
                                } else {
                                    toastr.success(gettextCatalog.getString('The vulnerability has been edited successfully.',
                                        {vulnLabel: $scope._langField(vuln,'label')}), gettextCatalog.getString('Edition successful'));
                                }
                            },

                            function () {
                                $scope.editVuln(ev, vuln);
                            }
                        );
                    });
            });
        };

        $scope.deleteVuln = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete vulnerability?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                VulnService.deleteVuln(item.id,
                    function () {
                        $scope.updateVulns();
                        toastr.success(gettextCatalog.getString('The vulnerability has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteVulnMass = function (ev, item) {
            var count = $scope.vulns.selected.length;
            var outpromise = null;

            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected vulnerabilites?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.vulns.selected.length; ++i) {
                    ids.push($scope.vulns.selected[i].id);
                }

                VulnService.deleteMassVuln(ids, function () {
                    $scope.updateVulns();
                    toastr.success(gettextCatalog.getString('{{count}} vulnerabilities have been deleted.',
                        {count: ids.length}), gettextCatalog.getString('Deletion successful'));
                });

                $scope.vulns.selected = [];

            });
        };

        /*
         * 27002 CONTROLS TAB
         */
        $scope.measures = TableHelperService.build('description1', 20, 1, '');
        $scope.measures.activeFilter = 1;
        var measuresFilterWatch;

        $scope.selectMeasuresTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'measures'});
            var initMeasuresFilter = true;
            initMeasuresFilter = $scope.$watch('measures.activeFilter', function() {
                if (initMeasuresFilter) {
                    initMeasuresFilter = false;

                } else {
                    $scope.updateMeasures();
                }
            });

            TableHelperService.watchSearch($scope, 'measures.query.filter', $scope.measures.query, $scope.updateMeasures, $scope.measures);
        };

        $scope.deselectMeasuresTab = function () {
            TableHelperService.unwatchSearch($scope.measures);
        };


        $scope.updateMeasures = function () {
            var query = angular.copy($scope.measures.query);
            query.status = $scope.measures.activeFilter;

            if ($scope.measures.previousQueryOrder != $scope.measures.query.order) {
                $scope.measures.query.page = query.page = 1;
                $scope.measures.previousQueryOrder = $scope.measures.query.order;
            }
            $scope.measures.promise = MeasureService.getMeasures(query);
            $scope.measures.promise.then(
                function (data) {
                    $scope.measures.items = data;
                }
            )


        };
        $scope.removeMeasuresFilter = function () {
            TableHelperService.removeFilter($scope.vulns);
        };


        $scope.toggleMeasureStatus = function (measure) {
            MeasureService.patchMeasure(measure.id, {status: !measure.status}, function () {
                measure.status = !measure.status;
            });
        }


        $scope.createNewMeasure = function (ev, measure) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));


            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ClientCategoryService', 'ConfigService', 'measure', 'anrId', CreateMeasureDialogCtrl],
                templateUrl: 'views/anr/create.measures.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'measure': measure,
                    'anrId': $scope.model.anr.id
                }
            })
                .then(function (measure) {
                    var cont = measure.cont;
                    measure.cont = undefined;
                    if (cont) {
                        $scope.createNewMeasure(ev);
                    }

                    MeasureService.createMeasure(measure,
                        function () {
                          $scope.measures.activeFilter=1;
                            $scope.updateMeasures();
                            toastr.success(gettextCatalog.getString('The control has been created successfully.',
                                {measureLabel: $scope._langField(measure,'description')}), gettextCatalog.getString('Creation successful'));
                        },

                        function (err) {
                            $scope.createNewMeasure(ev, measure);
                        }
                    ).then(function (data) {
                      $scope.measure_data=data;
                      //create soa linked to the measure
                      var  soa={ "anr" : $scope.model.anr.id , "measure" : $scope.measure_data.id };
                      ClientSoaService.createSoa(soa,
                          function () {
                          });
                        });


                });
        };

        $scope.editMeasure = function (ev, measure) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            MeasureService.getMeasure(measure.id).then(function (measureData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ClientCategoryService', 'ConfigService', 'measure', 'anrId', CreateMeasureDialogCtrl],
                    templateUrl: 'views/anr/create.measures.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'measure': measureData,
                        'anrId': $scope.model.anr.id
                    }
                })
                    .then(function (measure) {
                        MeasureService.updateMeasure(measure,
                            function () {
                                $scope.updateMeasures();
                                toastr.success(gettextCatalog.getString('The control has been edited successfully.',
                                    {measureLabel: $scope._langField(measure,'description')}), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.editMeasure(ev, measure);
                            }
                        );
                    });
            });
        };


        $scope.deleteMeasure = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete control?',
                    {label: $scope._langField(item,'description')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
              //delete the soa associated to the measure
                ClientSoaService.getSoas({anr: $scope.model.anr.id}).then(function (data) {
                  $scope.soas = data['Soa-list'];
                  for (soa in $scope.soas){
                      if($scope.soas[soa].measure.id == item.id) {

                           ClientSoaService.deleteSoa({anr: $scope.model.anr.id, id: $scope.soas[soa].id},
                             function () {
                                 var query = angular.copy($scope.soas.query);
                             }
                           );
                         }
                  }
                  MeasureService.deleteMeasure(item.id,
                      function () {
                          $scope.updateMeasures();
                          toastr.success(gettextCatalog.getString('The control has been deleted.',
                              {label: $scope._langField(item,'description')}), gettextCatalog.getString('Deletion successful'));
                      }
                  );
              })

            });
        };

        $scope.deleteMeasureMass = function (ev, item) {
            var outpromise = null;
            var count = $scope.measures.selected.length;

            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected controls?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.measures.selected.length; ++i) {
                    ids.push($scope.measures.selected[i].id);
                }
                //delete the soas associated to the measures
                ClientSoaService.getSoas({anr: $scope.model.anr.id}).then(function (data) {
                  $scope.soas = data['Soa-list'];
                    for (soa in $scope.soas){
                      for (var i = 0; i < ids.length; ++i) {
                          if($scope.soas[soa].measure.id == ids[i]) {
                                ClientSoaService.deleteSoa({anr: $scope.model.anr.id, id: $scope.soas[soa].id},
                                    function () {
                                        var query = angular.copy($scope.soas.query);
                                    }
                                );

                              }
                         }
                    }

                    MeasureService.deleteMassMeasure(ids, function () {
                        $scope.updateMeasures();
                        toastr.success(gettextCatalog.getString('{{count}} controls have been deleted.',
                            {count: count}), gettextCatalog.getString('Deletion successful'));
                    });

                    $scope.measures.selected = [];
                })




            });
        };

        // /*
        //  * CATEGORIES TAB
        //  */
        //

        $scope.categories = TableHelperService.build('label1', 20, 1, '');
        $scope.categories.activeFilter = 1;
        var categoriesFilterWatch;

        $scope.selectCategoriesTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'categories'});
            var initCategoriesFilter = true;
            initCategoriesFilter = $scope.$watch('categories.activeFilter', function() {
                if (initCategoriesFilter) {
                    initCategoriesFilter = false;
                } else {
                    $scope.updateCategories();
                }
            });

            TableHelperService.watchSearch($scope, 'categories.query.filter', $scope.categories.query, $scope.updateCategories, $scope.categories);
        };

        $scope.deselectCategoriesTab = function () {
            TableHelperService.unwatchSearch($scope.categories);
        };


        $scope.updateCategories = function () {
            var query = angular.copy($scope.categories.query);
            query.status = $scope.categories.activeFilter;

            if ($scope.categories.previousQueryOrder != $scope.categories.query.order) {
                $scope.categories.query.page = query.page = 1;
                $scope.categories.previousQueryOrder = $scope.categories.query.order;
            }
            $scope.categories.promise = ClientCategoryService.getCategories(query);
            $scope.categories.promise.then(
                function (data) {
                    $scope.categories.items = data;
                }
            )


        };
        $scope.removeCategoriesFilter = function () {
            TableHelperService.removeFilter($scope.vulns);
        };

        //the new status of the category is also assigned to the measure
        $scope.toggleCategoryStatus = function (category) {

           MeasureService.getMeasures({anr: $scope.model.anr.id}).then(function (data) {
               $scope.measures_cat = data['measures'];
               for (measure in $scope.measures_cat){
                 if( $scope.measures_cat[measure].category !=null ) {
                   if( $scope.measures_cat[measure].category.id==category.id ) {
                         MeasureService.patchMeasure($scope.measures_cat[measure].id, {status: category.status}, function () {
                             $scope.measures_cat[measure].status = !category.status;
                          })

                    }
                  }
                }

           })


            ClientCategoryService.patchCategory(category.id, {status: !category.status}, function () {
                category.status = !category.status;
            });

        }


        $scope.createNewCategory = function (ev, category) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));


            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ConfigService', 'category', CreateCategoryDialogCtrl],
                templateUrl: 'views/anr/create.categories.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'category': category
                }
            })
                .then(function (category) {
                    var cont = category.cont;
                    category.cont = undefined;
                    if (cont) {
                        $scope.createNewCategory(ev);
                    }

                    ClientCategoryService.createCategory(category,
                        function () {
                            $scope.updateCategories();
                            toastr.success(gettextCatalog.getString('The category has been created successfully.',
                                {categoryLabel: $scope._langField(category,'label')}), gettextCatalog.getString('Creation successful'));
                        },

                        function (err) {
                            $scope.createNewCategory(ev, category);
                        }
                    );
                });
        };

        $scope.editCategory = function (ev, category) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            ClientCategoryService.getCategory(category.id).then(function (categoryData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ConfigService', 'category', CreateCategoryDialogCtrl],
                    templateUrl: 'views/anr/create.categories.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'category': category
                    }
                })
                    .then(function (category) {
                        ClientCategoryService.updateCategory(category,
                            function () {
                                $scope.updateCategories();
                                toastr.success(gettextCatalog.getString('The category has been edited successfully.',
                                    {categoryLabel: $scope._langField(category,'label')}), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.editCategory(ev, category);
                            }
                        );
                    });
            });

        };
        $scope.deleteCategory = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete category?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
              
              // once we  delete a category the measure linked to this category have their category-id changed to null
              MeasureService.getMeasures({anr: $scope.model.anr.id}).then(function (data) {
                  $scope.measures_cat = data['measures'];
                  for (measure in $scope.measures_cat){
                    if( $scope.measures_cat[measure].category !=null ) {
                      if($scope.measures_cat[measure].category.id == item.id) {
                         $scope.measures_cat[measure].category =null;

                         MeasureService.updateMeasure($scope.measures_cat[measure],
                             function () {

                                 var query = angular.copy($scope.categories.query);
                              }
                         );
                         }
                       }
                  }
                  ClientCategoryService.deleteCategory(item.id,
                      function () {
                          $scope.updateCategories();
                          toastr.success(gettextCatalog.getString('The category has been deleted.',
                              {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                      }
                  );
              })
            });


        };

        $scope.deleteCategoryMass = function (ev, item) {
            var outpromise = null;
            var count = $scope.categories.selected.length;

            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected categories?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.categories.selected.length; ++i) {
                    ids.push($scope.categories.selected[i].id);
                }
                MeasureService.getMeasures({anr: $scope.model.anr.id}).then(function (data) {
                    $scope.measures_cat = data['measures'];
                    for (measure in $scope.measures_cat){
                      for (var i = 0; i < ids.length; ++i) {
                     if( $scope.measures_cat[measure].category !=null ) {
                        if($scope.measures_cat[measure].category.id == ids[i]) {
                           $scope.measures_cat[measure].category =null;

                           MeasureService.updateMeasure($scope.measures_cat[measure],
                             function () {
                                 var query = angular.copy($scope.categories.query);
                              }
                           );
                           }
                         }
                    }
                    }
                    ClientCategoryService.deleteMassCategory(ids, function () {
                        $scope.updateCategories();
                        toastr.success(gettextCatalog.getString('{{count}} categories have been deleted.',
                            {count: count}), gettextCatalog.getString('Deletion successful'));
                    });

                    $scope.categories.selected = [];
                })


            });
        };























         /*
          * AMVS TAB
          */
        $scope.amvs = TableHelperService.build('status', 20, 1, '');
        $scope.amvs.activeFilter = 1;
        var amvsFilterWatch;

        $scope.selectAmvsTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'amvs'});
            var initAmvsFilter = true;
            initAmvsFilter = $scope.$watch('amvs.activeFilter', function() {
                if (initAmvsFilter) {
                    initAmvsFilter = false;
                } else {
                    $scope.updateAmvs();
                }
            });

            TableHelperService.watchSearch($scope, 'amvs.query.filter', $scope.amvs.query, $scope.updateAmvs, $scope.amvs);
        };

        $scope.deselectAmvsTab = function () {
            TableHelperService.unwatchSearch($scope.amvs);
        };

        $scope.updateAmvs = function () {
            var query = angular.copy($scope.amvs.query);
            query.status = $scope.amvs.activeFilter;

            if ($scope.amvs.previousQueryOrder != $scope.amvs.query.order) {
                $scope.amvs.query.page = query.page = 1;
                $scope.amvs.previousQueryOrder = $scope.amvs.query.order;
            }

            $scope.amvs.promise = AmvService.getAmvs(query);
            $scope.amvs.promise.then(
                function (data) {
                    $scope.amvs.items = data;
                }
            )
        };

        $scope.removeAmvsFilter = function () {
            TableHelperService.removeFilter($scope.amvs);
        };


        $scope.toggleAmvStatus = function (amv) {
            AmvService.patchAmv(amv.id, {status: !amv.status}, function () {
                amv.status = !amv.status;
            })
        }


        $scope.createNewAmv = function (ev, amv) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AssetService', 'ThreatService', 'VulnService', 'MeasureService', 'ConfigService', 'AmvService', '$q', 'amv', CreateAmvDialogCtrl],
                templateUrl: 'views/anr/create.amvs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'amv': amv
                }
            })
                .then(function (amv) {
                    var amvBackup = angular.copy(amv);

                    if (amv.measure1) {
                        amv.measure1 = amv.measure1.id;
                    }
                    if (amv.measure2) {
                        amv.measure2 = amv.measure2.id;
                    }
                    if (amv.measure3) {
                        amv.measure3 = amv.measure3.id;
                    }
                    if (amv.threat) {
                        amv.threat = amv.threat.id;
                    }
                    if (amv.asset) {
                        amv.asset = amv.asset.id;
                    }
                    if (amv.vulnerability) {
                        amv.vulnerability = amv.vulnerability.id;
                    }

                    var cont = amv.cont;
                    amv.cont = undefined;
                    if (cont) {
                        $scope.createNewAmv(ev);
                    }

                    AmvService.createAmv(amv,
                        function () {
                            $scope.updateAmvs();
                            toastr.success(gettextCatalog.getString('The risk has been created successfully.'), gettextCatalog.getString('Creation successful'));
                        },

                        function () {
                            $scope.createNewAmv(ev, amvBackup);
                        }
                    );
                });
        };

        $scope.editAmv = function (ev, amv) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            if(amv == null){
                return;
            }
            if(amv.id!=undefined){
                amv = amv.id;
            }

            AmvService.getAmv(amv).then(function (amvData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'AssetService', 'ThreatService', 'VulnService', 'MeasureService', 'ConfigService', 'AmvService', '$q', 'amv', CreateAmvDialogCtrl],
                    templateUrl: 'views/anr/create.amvs.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'amv': amvData
                    }
                })
                    .then(function (amv) {
                        var amvBackup = angular.copy(amv);
                        if (amv.measure1) {
                            amv.measure1 = amv.measure1.id;
                        }
                        if (amv.measure2) {
                            amv.measure2 = amv.measure2.id;
                        }
                        if (amv.measure3) {
                            amv.measure3 = amv.measure3.id;
                        }
                        if (amv.threat) {
                            amv.threat = amv.threat.id;
                        }
                        if (amv.asset) {
                            amv.asset = amv.asset.id;
                        }
                        if (amv.vulnerability) {
                            amv.vulnerability = amv.vulnerability.id;
                        }


                        AmvService.updateAmv(amv,
                            function () {
                                $scope.updateAmvs();
                                toastr.success(gettextCatalog.getString('The risk has been edited successfully.'), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.editAmv(ev, amvBackup);
                            }
                        );
                    });
            });
        };

        if($stateParams.showid !== undefined){
            $scope.editAmv(null,$stateParams.showid);
        }


        $scope.deleteAmv = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete this risk?'))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                AmvService.deleteAmv(item.id,
                    function () {
                        $scope.updateAmvs();
                        toastr.success(gettextCatalog.getString('The risk has been deleted.'), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteAmvMass = function (ev, item) {
            var count = $scope.amvs.selected.length;
            var outpromise = null;

            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected risk(s)?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.amvs.selected.length; ++i) {
                    ids.push($scope.amvs.selected[i].id);
                }

                AmvService.deleteMassAmv(ids, function () {
                    toastr.success(gettextCatalog.getString('{{ count }} risks have been deleted.',
                        {count: count}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateAmvs();
                });

                $scope.amvs.selected = [];

            }, function() {
            });
        };

        /*
         * ASSETS LIBRARY TAB
         */
        var objLibTabSelected = false;
        $scope.objlibs = TableHelperService.build('name1', 20, 1, '');

        if ($rootScope.objlibs_query) {
            $scope.objlibs.query = $rootScope.objlibs_query;
            $scope.objlibs.previousQueryOrder = $scope.objlibs.query.order;
        }


        $scope.objlib_asset_filter = 0;
        $scope.objlib_lockswitch = false;
        $scope.objlib_assets = [];

        $scope.$watchGroup(['objlib_category_filter', 'objlib_asset_filter', 'objlib_lockswitch'], function (newValue, oldValue) {
            if ($scope.objlib_category_filter == 0) {
                $scope.objlib_lockswitch = false;
            }

            if (objLibTabSelected) {
                // Refresh contents
                $scope.updateObjlibs();
            }
        });

        $scope.objlibAssetTypeStr = function (type) {
            if (type == 'bdc') {
                return gettextCatalog.getString('Knowledge base');
            } else if (type == 'anr') {
                return gettextCatalog.getString('Risk analysis');
            } else {
                return type;
            }
        }

        $scope.objlibScopeStr = function (scope) {
            switch (scope) {
                case 1: return gettextCatalog.getString('Local');
                case 2: return gettextCatalog.getString('Global');
                default: return scope;
            }
        }

        $scope.resetObjlibsFilters = function () {

            $scope.objlib_asset_filter = 0;
            $scope.objlib_lockswitch = false;
        };



        $scope.selectObjlibsTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'objlibs'});
            objLibTabSelected = true;
            TableHelperService.watchSearch($scope, 'objlibs.query.filter', $scope.objlibs.query, $scope.updateObjlibs, $scope.objlibs);

            // Load all assets to fill the md-select dropdowns
            AssetService.getAssets({order: '-code', limit: 0}).then(function (data) {
                $scope.objlib_assets = data.assets;
            });

        };

        $scope.deselectObjlibsTab = function () {
            objLibTabSelected = false;
            TableHelperService.unwatchSearch($scope.objlibs);
        };

        $scope.updateObjlibs = function () {
            var query = angular.copy($scope.objlibs.query);

            if ($scope.objlib_asset_filter > 0) {
                query.asset = $scope.objlib_asset_filter;
            }
            query.lock = $scope.objlib_lockswitch;

            if ($scope.objlibs.previousQueryOrder != $scope.objlibs.query.order) {
                $scope.objlibs.query.page = query.page = 1;
                $scope.objlibs.previousQueryOrder = $scope.objlibs.query.order;
            }

            $scope.objlibs.promise = ObjlibService.getObjlibs(query);
            $scope.objlibs.promise.then(
                function (data) {
                    $scope.objlibs.items = data;
                    $rootScope.objlibs_query = $scope.objlibs.query;
                }
            )
        };

        $scope.removeObjlibsFilter = function () {
            TableHelperService.removeFilter($scope.objlibs);
        };

        $scope.createNewObjlib = function (ev, objlib) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            var isUpdate = (objlib && objlib.id);

            $scope.objLibDialog = $mdDialog;
            $scope.objLibDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', CreateObjlibDialogCtrl],
                templateUrl: 'views/anr/create.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    mode: 'bdc',
                    objLibDialog: $scope,
                    objlib: objlib
                }
            })
                .then(function (objlib) {
                    if (objlib) {
                        var cont = objlib.cont;
                        objlib.cont = undefined;

                        var objlibBackup = angular.copy(objlib);

                        if (objlib.asset) {
                            objlib.asset = objlib.asset.id;
                        }

                        if (objlib.rolfTag) {
                            objlib.rolfTag = objlib.rolfTag.id;
                        }

                        if (isUpdate) {
                            if( ! objlib.implicitPosition ){
                                objlib.implicitPosition = 2;//à la fin
                            }
                            ObjlibService.updateObjlib(objlib,
                                function () {
                                    $scope.updateObjlibs();

                                    toastr.success(gettextCatalog.getString('The asset has been edited successfully.',
                                        {objlibLabel: $scope._langField(objlib,'label')}), gettextCatalog.getString('Edition successful'));
                                },

                                function () {
                                    $scope.createNewObjlib(ev, objlibBackup);
                                }
                            );
                        } else {
                            if( ! objlib.implicitPosition ){
                                objlib.implicitPosition = 2;//à la fin
                            }
                            ObjlibService.createObjlib(objlib,
                                function () {
                                    $scope.updateObjlibs();

                                    toastr.success(gettextCatalog.getString('The asset has been created successfully.',
                                        {objlibLabel: $scope._langField(objlib,'label')}), gettextCatalog.getString('Creation successful'));

                                    if (cont) {
                                        $scope.createNewObjlib(ev);
                                    }
                                },

                                function () {
                                    $scope.createNewObjlib(ev, objlibBackup);
                                }
                            );
                        }
                    }
                }, function () {
                    $scope.updateObjlibs();

                });
        };

        $scope.editObjlib = function (ev, objlib, dontFetch) {
            if (objlib && objlib.id) {
                if (dontFetch) {
                    $scope.createNewObjlib(ev, objlib);
                } else {
                    ObjlibService.getObjlib(objlib.id).then(function (objlibData) {
                        $scope.createNewObjlib(ev, objlibData);
                    });
                }
            } else {
                $scope.createNewObjlib(ev, objlib);
            }
        };

        $scope.deleteObjlib = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete asset?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                ObjlibService.deleteObjlib(item.id,
                    function () {
                        $scope.updateObjlibs();
                        toastr.success(gettextCatalog.getString('The asset has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteObjlibMass = function (ev, item) {
            var count = $scope.objlibs.selected.length;
            var outpromise = null;

            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected asset(s)?',
                    {count: count}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                angular.forEach($scope.objlibs.selected, function (value, key) {
                    ObjlibService.deleteObjlib(value.id,
                        function () {
                            if (outpromise) {
                                $timeout.cancel(outpromise);
                            }

                            outpromise = $timeout(function () {
                                toastr.success(gettextCatalog.getString('{{count}} assets have been deleted.',
                                    {count: count}), gettextCatalog.getString('Deletion successful'));
                                $scope.updateObjlibs();
                            }, 350);
                        }
                    );
                });

                $scope.objlibs.selected = [];

            }, function() {
            });
        };


        /// ROLF
        /*
         * Global helpers
         */
        $scope.selectTagsTab = function (tab) {
            switch (tab) {

                case 'tags': $scope.currentTabIndex = 1; break;
                case 'risks': $scope.currentTabIndex = 2; break;
            }
        }
        $scope.selectTagsTab($scope.tab);

        /*$scope.$on('$locationChangeSuccess', function (event, newUrl) {
            var tabName = newUrl.substring(newUrl.lastIndexOf('/') + 1);
            $scope.tab = tabName;
            $scope.selectTab(tabName);
        });*/


        /**
         * TAGS
         */
        $scope.tags = TableHelperService.build('label1', 20, 1, '');

        $scope.updateTags = function () {
            $scope.tags.promise = TagService.getTags($scope.tags.query);
            $scope.tags.promise.then(
                function (data) {
                    $scope.tags.items = data;
                }
            )
        };
        $scope.removeTagsFilter = function () {
            TableHelperService.removeFilter($scope.tags);
        };

        $scope.selectTagsTab = function () {
            $state.transitionTo('main.kb_mgmt.op_risk', {'tab': 'tags'});
            TableHelperService.watchSearch($scope, 'tags.query.filter', $scope.tags.query, $scope.updateTags, $scope.tags);
        };

        $scope.deselectTagsTab = function () {
            TableHelperService.unwatchSearch($scope.tags);
        };

        $scope.createNewTag = function (ev, tag) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ConfigService', 'tag', CreateTagDialogCtrl],
                templateUrl: 'views/anr/create.tags.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'tag': tag
                }
            })
                .then(function (tag) {
                    TagService.createTag(tag,
                        function () {
                            $scope.updateTags();
                            toastr.success(gettextCatalog.getString('The tag has been created successfully.',
                                {tagLabel: $scope._langField(tag,'label')}), gettextCatalog.getString('Creation successful'));
                        },

                        function () {
                            $scope.createNewTag(ev, tag);
                        }
                    );
                });
        };

        $scope.editTag = function (ev, tag) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            TagService.getTag(tag.id).then(function (tagData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ConfigService', 'tag', CreateTagDialogCtrl],
                    templateUrl: 'views/anr/create.tags.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'tag': tagData
                    }
                })
                    .then(function (tag) {
                        TagService.updateTag(tag,
                            function () {
                                $scope.updateTags();
                                toastr.success(gettextCatalog.getString('The tag has been edited successfully.',
                                    {tagLabel: $scope._langField(tag,'label')}), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.createNewTag(ev, tag);
                            }
                        );
                    });
            });
        };

        $scope.deleteTag = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete tag?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                TagService.deleteTag(item.id,
                    function () {
                        $scope.updateTags();
                        toastr.success(gettextCatalog.getString('The tag has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteTagMass = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected tag(s)?',
                    {count: $scope.tags.selected.length}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.tags.selected.length; ++i) {
                    ids.push($scope.tags.selected[i].id);
                }

                TagService.deleteMassTag(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} tags have been deleted.',
                        {count: $scope.tags.selected.length}), gettextCatalog.getString('Deletion successful'));
                    $scope.tags.selected = [];
                    $scope.updateTags();
                });
            }, function() {
            });
        };


        /**
         * RISKS
         */
        $scope.risks = TableHelperService.build('label1', 20, 1, '');

        var risksTabSelected = false;

        $scope.$watchGroup(['risk_tag_filter'], function (newValue, oldValue) {
            if (risksTabSelected) {
                // Refresh contents
                $scope.updateRisks();
            }
            $scope.updateRisks();
        });

        $scope.updateTagsRisks = function(value) {
            value == '0' ? $scope.risk_tag_filter = null : $scope.risk_tag_filter = value ;
        }

        $scope.updateRisks = function () {
            var query = angular.copy($scope.risks.query);

            if ($scope.risk_tag_filter > 0) {
                query.tag = $scope.risk_tag_filter;
            }
            $scope.risks.query.tag = $scope.risk_tag_filter;

            if ($scope.risks.previousQueryOrder != $scope.risks.query.order) {
                $scope.risks.query.page = query.page = 1;
                $scope.risks.previousQueryOrder = $scope.risks.query.order;
            }

            $scope.risks.promise = RiskService.getRisks(query);
            $scope.risks.promise.then(
                function (data) {
                    $scope.risks.items = data;
                }
            )
        };
        $scope.removeRisksFilter = function () {
            TableHelperService.removeFilter($scope.risks);
        };

        $scope.resetRisksFilters = function () {

            $scope.risk_tag_filter = null;
        }

        $scope.selectRisksTab = function () {
            $state.transitionTo('main.kb_mgmt.op_risk', {'tab': 'risks'});
            risksTabSelected = true;
            TableHelperService.watchSearch($scope, 'risks.query.filter', $scope.risks.query, $scope.updateRisks, $scope.risks);

            TagService.getTags({limit: 0, order: '-label1'}).then(function (tags) {
                $scope.risk_tags = tags.tags;
            })
        };

        $scope.deselectRisksTab = function () {
            risksTabSelected = false;
            TableHelperService.unwatchSearch($scope.risks);
        };

        $scope.createNewRisk = function (ev, risk) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'ConfigService', 'TagService', 'risk', CreateRiskDialogCtrl],
                templateUrl: 'views/anr/create.risks.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'risk': risk
                }
            })
                .then(function (risk) {
                    var riskBackup = angular.copy(risk);

                    var riskTagIds = [];
          for (var i = 0; i < risk.tags.length; ++i) {
                        riskTagIds.push(risk.tags[i].id);
                    }


                    risk.tags = riskTagIds;

                    var cont = risk.cont;
                    risk.cont = undefined;

                    RiskService.createRisk(risk,
                        function () {
                            $scope.updateRisks();
                            toastr.success(gettextCatalog.getString('The risk has been created successfully.',
                                {riskLabel: $scope._langField(risk,'label')}), gettextCatalog.getString('Creation successful'));

                            if (cont) {
                                $scope.createNewRisk(ev);
                            }
                        },

                        function () {
                            $scope.createNewRisk(ev, riskBackup);
                        }
                    );
                });
        };

        $scope.editRisk = function (ev, risk) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RiskService.getRisk(risk.id).then(function (riskData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', '$q', 'ConfigService', 'TagService', 'risk', CreateRiskDialogCtrl],
                    templateUrl: 'views/anr/create.risks.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'risk': riskData
                    }
                })
                    .then(function (risk) {
                        var riskBackup = angular.copy(risk);
                        var riskTagIds = [];

                        for (var i = 0; i < risk.tags.length; ++i) {
                            riskTagIds.push(risk.tags[i].id);
                        }


                        risk.tags = riskTagIds;

                        RiskService.updateRisk(risk,
                            function () {
                                $scope.updateRisks();
                                toastr.success(gettextCatalog.getString('The risk has been edited successfully.',
                                    {riskLabel: $scope._langField(risk,'label')}), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.editRisk(ev, riskBackup);
                            }
                        );
                    });
            });
        };

        $scope.deleteRisk = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete risk?',
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                RiskService.deleteRisk(item.id,
                    function () {
                        $scope.updateRisks();
                        toastr.success(gettextCatalog.getString('The risk has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };

        $scope.deleteRiskMass = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} selected risk(s)?',
                    {count: $scope.risks.selected.length}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                var ids = [];
                for (var i = 0; i < $scope.risks.selected.length; ++i) {
                    ids.push($scope.risks.selected[i].id);
                }

                RiskService.deleteMassRisk(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} risks have been deleted.',
                        {count: $scope.risks.selected.length}), gettextCatalog.getString('Deletion successful'));
                    $scope.risks.selected = [];

                    $scope.updateRisks();;
                });
            }, function() {
            });
        };
    }


    //////////////////////
    // DIALOGS
    //////////////////////

    function CreateAssetDialogCtrl($scope, $mdDialog, ModelService, ConfigService, asset) {
        ModelService.getModels({isGeneric:0}).then(function (data) {
            $scope.models = data.models;
        });

        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        if (asset != undefined && asset != null) {
            $scope.asset = asset;
            var modelsIds = [];
            $scope.asset.models = modelsIds;
        } else {
            $scope.asset = {
                mode: 0,
                code: '',
                type: 2,
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                description1: '',
                description2: '',
                description3: '',
                description4: '',
                models: []
            };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            if (Object.keys($scope.assetForm.$error).length == 0) {
                $mdDialog.hide($scope.asset);
            }
        };

        $scope.createAndContinue = function() {
            if (Object.keys($scope.assetForm.$error).length == 0) {
                $scope.asset.cont = true;
                $mdDialog.hide($scope.asset);
            }
        };
    }

    function CreateThreatDialogCtrl($scope, $mdDialog, $q, ModelService, ThreatService, ConfigService, threat) {
        ModelService.getModels({isGeneric:0}).then(function (data) {
            $scope.models = data.models;
        });

        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.themeSearchText = '';

        if (threat != undefined && threat != null) {
            $scope.threat = threat;

            var modelsIds = [];
            $scope.threat.models = modelsIds;

            $scope.threat.c = ($scope.threat.c == 1);
            $scope.threat.i = ($scope.threat.i == 1);
            $scope.threat.d = ($scope.threat.d == 1);

        } else {
            $scope.threat = {
                mode: 0,
                code: '',
                c: false,
                i: false,
                d: false,
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                description1: '',
                description2: '',
                description3: '',
                description4: '',
            };
        }

        $scope.queryThemeSearch = function (query) {
            var promise = $q.defer();
            ThreatService.getThemes({filter: query}).then(function (data) {
                promise.resolve(data.themes);
            }, function () {
                promise.reject();
            });
            return promise.promise;
        };

        $scope.selectedThemeItemChange = function (item) {
            $scope.threat.theme = item;
        }

        $scope.createTheme = function (label) {
            ThreatService.createTheme({label1: label}, function (data) {
                ThreatService.getTheme(data.id).then(function (theme) {
                    $scope.threat.theme = theme;
                })
            });
        };

        $scope.updateTheme = function (theme) {
            $scope.theme_edit_lock = true;
            ThreatService.updateTheme(theme, function () {
                ThreatService.getTheme(theme.id).then(function (theme) {
                    $scope.threat.theme = theme;
                    $scope.theme_edit_lock = false;
                    $scope.theme_edit = null;
                });
            });
        }

        $scope.deleteTheme = function (theme) {
            ThreatService.deleteTheme(theme.id, function () {
                $scope.threat.theme = null;
                $scope.theme_edit = null;
                $scope.themeSearchText = null;
            });
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.threat);
        };
        $scope.createAndContinue = function() {
            $scope.threat.cont = true;
            $mdDialog.hide($scope.threat);
        };
    }

    function CreateVulnDialogCtrl($scope, $mdDialog, ModelService, ConfigService, vuln) {
        ModelService.getModels({isGeneric:0}).then(function (data) {
            $scope.models = data.models;
        });

        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        if (vuln != undefined && vuln != null) {
            $scope.vuln = vuln;

            var modelsIds = [];
            $scope.vuln.models = modelsIds;
        } else {
            $scope.vuln = {
                mode: 0,
                code: '',
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                description1: '',
                description2: '',
                description3: '',
                description4: ''
            };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.vuln);
        };
        $scope.createAndContinue = function() {
            $scope.vuln.cont = true;
            $mdDialog.hide($scope.vuln);
        };
    }

    function CreateMeasureDialogCtrl($scope, $mdDialog, ClientCategoryService, ConfigService, measure, anrId) {

      $scope.languages = ConfigService.getLanguages();
      $scope.language = $scope.getAnrLanguage();
      ClientCategoryService.getCategories({anr: anrId}).then(function (data) {
         $scope.categories = data['categories'];
      });



        if (measure != undefined && measure != null) {
            $scope.measure = measure;
        } else {
            $scope.measure = {
                code: '',
                description1: '',
                description2: '',
                description3: '',
                description4: '',
            };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.measure);
        };
        $scope.createAndContinue = function() {
            $scope.measure.cont = true;
            $mdDialog.hide($scope.measure);
        };

    }


    function CreateCategoryDialogCtrl($scope, $mdDialog,  ConfigService, category) {

      $scope.languages = ConfigService.getLanguages();
      $scope.language = $scope.getAnrLanguage();


        if (category != undefined && category != null) {
            $scope.category = category;
        } else {
            $scope.category = {
                reference: '',
                label1: '',
                label2: '',
                label3: '',
                label4: '',
            };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.category);
        };
        $scope.createAndContinue = function() {
            $scope.category.cont = true;
            $mdDialog.hide($scope.category);
        };

    }




    function CreateAmvDialogCtrl($scope, $mdDialog, AssetService, ThreatService, VulnService, MeasureService, ConfigService, AmvService, $q, amv) {
        $scope.languages = ConfigService.getLanguages();
        $scope.defaultLang = $scope.getAnrLanguage();


        $scope.queryAmvs = function (asset_id) {
            AmvService.getAmvs({limit: 0, asset: asset_id, order: 'position', amvid: $scope.amv.id}).then(function (data) {
                $scope.asset_amvs = data.amvs;
            });
        };


        if (amv != undefined && amv != null) {
            $scope.amv = amv;
            if (amv.asset && amv.asset.id) {
                $scope.queryAmvs(amv.asset.id);
            }
            if (amv.previous && amv.previous.id) {
                $scope.amv.previous = $scope.amv.previous.id;
            }
        } else {
            $scope.amv = {
                asset: null,
                threat: null,
                vulnerability: null,
                measure1: null,
                measure2: null,
                measure3: null,
                implicitPosition: 2,
                status: 1
            };
        }

        // Asset
        $scope.queryAssetSearch = function (query) {
            var promise = $q.defer();
            AssetService.getAssets({filter: query, type: 2, status: 1}).then(function (e) {
                promise.resolve(e.assets);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.selectedAssetItemChange = function (item) {
            if (item) {
                $scope.amv.asset = item;
                $scope.queryAmvs(item.id);
            }
        }

        // Threat
        $scope.queryThreatSearch = function (query) {
            var promise = $q.defer();
            ThreatService.getThreats({filter: query, status: 1}).then(function (e) {
                promise.resolve(e.threats);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.selectedThreatItemChange = function (item) {
            if (item) {
                $scope.amv.threat = item;
            }
        }

        // Vulnerability
        $scope.queryVulnSearch = function (query) {
            var promise = $q.defer();
            VulnService.getVulns({filter: query, status: 1}).then(function (e) {
                promise.resolve(e.vulnerabilities);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.selectedVulnItemChange = function (item) {
            if (item) {
                $scope.amv.vulnerability = item;
            }
        }

        // Measures
        $scope.queryMeasureSearch = function (query) {
            var promise = $q.defer();
            MeasureService.getMeasures({filter: query}).then(function (e) {
                promise.resolve(e.measures);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };


        $scope.selectedMeasureItemChange = function (idx, item) {
            if (item) {
                $scope.amv['measure' + idx] = item;
            }
        }



        // Category
        $scope.queryCategorysSearch = function (query) {
            var promise = $q.defer();
            ClientCategoryService.getCategory({filter: query}).then(function (e) {
                promise.resolve(e.categories);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };


        $scope.selectedCategoryItemChange = function (idx, item) {
            if (item) {
              // $scope.amv.category = item;

                $scope.amv['category' + idx] = item;
            }
        }




        ////

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            if ($scope.amv.implicitPosition == 3 && !$scope.amv.previous) {
                $scope.amv.implicitPosition = 1;
            }

            $mdDialog.hide($scope.amv);
        };
        $scope.createAndContinue = function() {
            if ($scope.amv.implicitPosition == 3 && !$scope.amv.previous) {
                $scope.amv.implicitPosition = 1;
            }

            $scope.amv.cont = true;
            $mdDialog.hide($scope.amv);
        };
    }

    function ExportAssetDialog($scope, $mdDialog, mode) {
        $scope.mode = mode;
        $scope.exportData = {
            password: '',
            simple_mode: true,
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.exportData);
        };
    }



    function CreateTagDialogCtrl($scope, $mdDialog, ConfigService, tag) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        if (tag != undefined && tag != null) {
            $scope.tag = tag;
        } else {
            $scope.tag = {
                code: '',
                label1: '',
                label2: '',
                label3: '',
                label4: ''
            };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.tag);
        };
    }

    function CreateRiskDialogCtrl($scope, $mdDialog, $q, ConfigService, TagService, risk) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        tagSearchText = null;
        tagSelectedItem = null;
        $scope.queryTagSearch = function (query) {
            var promise = $q.defer();
            TagService.getTags({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e.tags.length; ++j) {
                    var found = false;

                    for (var i = 0; i < $scope.risk.tags.length; ++i) {
                        if ($scope.risk.tags[i].id == e.tags[j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e.tags[j]);
                    }
                }

                promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };
        // TO DO : To improve, test if the risk has tags if it hasn't create an empty table of tags.
        if (risk != undefined && risk != null) {
            $scope.risk = risk;
            if ($scope.risk.tags.length >0) {
            }
            else {
              $scope.risk.tags=[];
            }

        } else {
            $scope.risk = {
                code: '',
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                description1: '',
                description2: '',
                description3: '',
                description4: '',
                tags: [],
            };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.risk);
        };

        $scope.createAndContinue = function() {
            $scope.risk.cont = true;
            $mdDialog.hide($scope.risk);
        };
    }
})();

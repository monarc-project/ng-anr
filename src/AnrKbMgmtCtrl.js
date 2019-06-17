(function () {

    angular
        .module('AnrModule')
        .directive('onReadFile', ['$parse','$mdDialog', 'gettextCatalog', function ($parse, $mdDialog, gettextCatalog) {

          	return {
          		restrict: 'A',
          		scope: false,
          		link: function(scope, element, attrs) {
                      var fn = $parse(attrs.onReadFile);

          			element.on('change', function(onChangeEvent) {
        				    var reader = new FileReader();
            				reader.onload = function(onLoadEvent) {
              					scope.$apply(function() {
                          var data = onLoadEvent.target.result;
                          if (isJson) {
                            fn(scope, {$fileContent:JSON.parse(data)});
                          }else{
                            var workbook = XLSX.read(data, {
                              type: 'binary'
                            });
                            var sheetName = workbook.SheetNames[0];
                            if (workbook.Sheets[sheetName].hasOwnProperty('!ref')) {
                              var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                              var chartset = jschardet.detect(csv);
                                if (chartset.encoding == 'UTF-8') {
                                  fn(scope, {$fileContent:decodeURIComponent(escape(csv))});
                                }else {
                                  fn(scope, {$fileContent:csv});
                                }
                            }
                          }
              					});
            				};
                    var fileTypes = ['json', 'csv', 'xlsx', 'xls']; // File types supported
                    var extension = onChangeEvent.target.files[0].name.split('.').pop().toLowerCase(); //Extract extension of file
                    var isSuccess = fileTypes.indexOf(extension) > -1; // Check file type
                    var size = onChangeEvent.target.files[0].size < 1e6; // Check fize size being less 1M

                    if (isSuccess && size) {
                      var isJson = false;
                      if (extension == "json") {
                        reader.readAsText(onChangeEvent.target.files[0]);
                        isJson = true;
                      }else {
                        reader.readAsBinaryString(onChangeEvent.target.files[0]);
                      }
                    }
                    else {
                      var alert = $mdDialog.alert()
                          .multiple(true)
                          .title(gettextCatalog.getString('File error'))
                          .textContent(gettextCatalog.getString('File type not supported'))
                          .theme('light')
                          .ok(gettextCatalog.getString('Cancel'))
                      $mdDialog.show(alert);
                    }
                    onChangeEvent.target.value = null;
          			});
          		}
          	};
          }])
        .controller('AnrKbMgmtCtrl', [
            '$scope', '$stateParams', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', 'TableHelperService',
            'AssetService', 'ThreatService', 'VulnService', 'AmvService', 'MeasureService', 'ClientSoaService',
            'TagService', 'RiskService','SOACategoryService', 'ReferentialService', 'MeasureMeasureService',
             '$state', '$timeout', '$rootScope', AnrKbMgmtCtrl ])
    /**
     * ANR > KB
     */
    function AnrKbMgmtCtrl($scope, $stateParams, toastr, $mdMedia, $mdDialog, gettextCatalog, TableHelperService,
                                  AssetService, ThreatService, VulnService, AmvService, MeasureService, ClientSoaService, TagService,
                                  RiskService,SOACategoryService, ReferentialService, MeasureMeasureService, $state, $timeout, $rootScope) {
        $scope.gettext = gettextCatalog.getString;
        TableHelperService.resetBookmarks();


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
            }
        }

        $scope.language = $scope.getAnrLanguage();

        /*
         * ASSETS TAB
         */
        $scope.assets = TableHelperService.build('label' + $scope.language, 20, 1, '');
        $scope.assets.activeFilter = 1;
        var assetsFilterWatch;

        $scope.selectAssetsTab = function () {

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
            $scope.assets.selected = [];
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

            // we want to know the UUIDs of all the assets already
            // imported in the analysis
            query.limit = -1;
            query.filter = "";
            query.status = "all";
            $scope.assets.promise = AssetService.getAssets(query);
            $scope.assets.promise.then(
                function (data) {
                    $rootScope.assets_uuid = data.assets.map(function(asset){return asset.uuid});
                }
            )
        };

        $scope.removeAssetsFilter = function () {
            TableHelperService.removeFilter($scope.assets);
        };

        $scope.toggleAssetStatus = function (asset) {
            AssetService.patchAsset(asset.uuid, {status: !asset.status}, function () {
                asset.status = !asset.status;
            });
        };

        $scope.createNewAsset = function (ev, asset) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ModelService', 'ConfigService', 'asset', CreateAssetDialogCtrl],
                templateUrl: 'views/anr/create.assets.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
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

        $scope.importNewAsset = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$rootScope', '$scope', '$http', '$mdDialog', 'ConfigService', ImportAssetDialogCtrl],
                templateUrl: 'views/anr/import.asset.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            })
                .then(function (asset) {
                    AssetService.createAsset(asset,
                        function () {
                            $scope.$parent.updateAssets();

                            if (asset.mode == 0 && asset.models && asset.models.length > 0) {
                                // If we create a generic asset, but we still have specific models, we should warn
                                toastr.warning(gettextCatalog.getString('The asset type has been created successfully, however without models, the element may not be specific.'));
                            } else {
                                toastr.success(gettextCatalog.getString('The asset type has been created successfully.'),
                                               gettextCatalog.getString('Creation successful'));
                            }
                        }
                    );
                });
        };

        $scope.editAsset = function (ev, asset) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            AssetService.getAsset(asset.uuid).then(function (assetData) {
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
                AssetService.deleteAsset(item.uuid,
                    function () {
                        toastr.success(gettextCatalog.getString('The asset type has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                        $scope.updateAssets();
                        $scope.assets.selected = $scope.assets.selected.filter(assetSelected => assetSelected.uuid != item.uuid);
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
                    ids.push($scope.assets.selected[i].uuid);
                }

                AssetService.deleteMassAsset(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} assets have been deleted.',
                        {count: count}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateAssets();
                    $scope.assets.selected = [];
                });
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
        $scope.threats = TableHelperService.build('label' + $scope.language, 20, 1, '');
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
            $scope.threats.selected = [];
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

            // we want to know the UUIDs of all the threats already
            // imported in the analysis
            query.limit = -1;
            query.filter = "";
            query.status = "all";
            $scope.threats.promise = ThreatService.getThreats(query);
            $scope.threats.promise.then(
                function (data) {
                    $rootScope.threats_uuid = data.threats.map(function(threat){return threat.uuid});
                }
            )
        };

        $scope.removeThreatsFilter = function () {
            TableHelperService.removeFilter($scope.threats);
        };


        $scope.toggleThreatStatus = function (threat) {
            ThreatService.patchThreat(threat.uuid, {status: !threat.status}, function () {
                threat.status = !threat.status;
            });
        };

        $scope.createNewThreat = function (ev, threat) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia',  '$mdDialog', 'gettextCatalog', '$q', 'ModelService', 'ThreatService', 'ConfigService', 'threat', CreateThreatDialogCtrl],
                templateUrl: 'views/anr/create.threats.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'threat': threat
                }
            })
                .then(function (threat) {
                    var themeBackup = threat.theme;
                    var cont = threat.cont;
                    threat.cont = undefined;

                    if (threat.theme) {
                        threat.theme = threat.theme.id;
                    }

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

        $scope.importNewThreat = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$rootScope', '$scope', '$http', '$mdDialog', 'ConfigService', 'ThreatService', ImportThreatDialogCtrl],
                templateUrl: 'views/anr/import.threat.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            })
                .then(function (threat) {
                    ThreatService.createThreat(threat,
                        function () {
                            $scope.$parent.updateThreats();

                            if (threat.mode == 0 && threat.models && threat.models.length > 0) {
                                // If we create a generic threat, but we still have specific models, we should warn
                                toastr.warning(gettextCatalog.getString('The threat has been created successfully, however without models, the element may not be specific.'));
                            } else {
                                toastr.success(gettextCatalog.getString('The threat has been created successfully.'),
                                               gettextCatalog.getString('Creation successful'));
                            }
                        }
                    );
                });
        };

        $scope.editThreat = function (ev, threat) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $scope.controls = [];//hack pour le bug référencé dans les forums de Material quand on ouvre deux fois d'affilée la modal
            ThreatService.getThreat(threat.uuid).then(function (threatData) {
                $scope.controls = [{}];//hack pour le bug référencé dans les forums de Material quand on ouvre deux fois d'affilée la modal
                $mdDialog.show({
                    controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'ModelService', 'ThreatService', 'ConfigService', 'threat', CreateThreatDialogCtrl],
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
                ThreatService.deleteThreat(item.uuid,
                    function () {
                        toastr.success(gettextCatalog.getString('The threat has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                        $scope.updateThreats();
                        $scope.threats.selected = $scope.threats.selected.filter(threatSelected => threatSelected.uuid != item.uuid);
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
                    ids.push($scope.threats.selected[i].uuid);
                }

                ThreatService.deleteMassThreat(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} threats have been deleted.',
                        {count: ids.length}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateThreats();
                    $scope.threats.selected = [];
                });
            });
        };

        /*
         * VULNS TAB
         */
        $scope.vulns = TableHelperService.build('label' + $scope.language, 20, 1, '');
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
            $scope.vulns.selected = [];
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

                    // we want to know the UUIDs of all the vulnerabilites already
                    // imported in the analysis
                    query.limit = -1;
                    query.filter = "";
                    query.status = "all";
                    $scope.vulns.promise = VulnService.getVulns(query);
                    $scope.vulns.promise.then(
                        function (data) {
                            $rootScope.vulnerabilities_uuid = data.vulnerabilities.map(function(vulnerability){return vulnerability.uuid});
                        }
                    )
                }
            )


        };
        $scope.removeVulnsFilter = function () {
            TableHelperService.removeFilter($scope.vulns);
        };

        $scope.toggleVulnStatus = function (vuln) {
            VulnService.patchVuln(vuln.uuid, {status: !vuln.status}, function () {
                vuln.status = !vuln.status;
            });
        }

        $scope.importNewVulnerability = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$rootScope', '$scope', '$http', '$mdDialog', 'ConfigService', ImportVulnerabilityDialogCtrl],
                templateUrl: 'views/anr/import.vulnerability.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            })
                .then(function (vuln) {
                    VulnService.createVuln(vuln,
                        function () {
                            $scope.$parent.updateVulns();

                            if (vuln.mode == 0 && vuln.models && vuln.models.length > 0) {
                                // If we create a generic vulnerability, but we still have specific models, we should warn
                                toastr.warning(gettextCatalog.getString('The vulnerability has been created successfully, however without models, the element may not be specific.'));
                            } else {
                                toastr.success(gettextCatalog.getString('The vulnerability has been created successfully.'),
                                               gettextCatalog.getString('Creation successful'));
                            }
                        }
                    );
                });
        };

        $scope.createNewVuln = function (ev, vuln) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ModelService', 'ConfigService', 'vuln', CreateVulnDialogCtrl],
                templateUrl: 'views/anr/create.vulns.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
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
            VulnService.getVuln(vuln.uuid).then(function (vulnData) {
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
                VulnService.deleteVuln(item.uuid,
                    function () {
                        toastr.success(gettextCatalog.getString('The vulnerability has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                        $scope.updateVulns();
                        $scope.vulns.selected = $scope.vulns.selected.filter(vulSelected => vulSelected.uuid != item.uuid);
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
                    ids.push($scope.vulns.selected[i].uuid);
                }

                VulnService.deleteMassVuln(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} vulnerabilities have been deleted.',
                        {count: ids.length}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateVulns();
                    $scope.vulns.selected = [];
                });
            });
        };

        /*
         * REFERENTIALS TAB
         */
        $scope.measures = TableHelperService.build('code', 20, 1, '');
        $scope.measures.activeFilter = 1;
        $scope.referentials = [];
        var measuresFilterWatch;

        $scope.selectMeasuresTab = function () {
          $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'measures'});
          $scope.updatingReferentials = false;
          ReferentialService.getReferentials({order: 'createdAt'}).then(function (data) {
              $scope.referentials.items = data;
              $rootScope.referentials_uuid = $scope.referentials.items.referentials.map(function(referential){return referential.uuid});
              $scope.updatingReferentials = true;
          });
        };

        $scope.deselectMeasuresTab = function () {
            TableHelperService.unwatchSearch($scope.measures);
            $scope.measures.selected = [];
        };

        $rootScope.$on('anrUpdated', function () {
          if ($scope.currentTabIndex == 3) {
            $scope.deselectMeasuresTab();
            $scope.selectMeasuresTab();
          }
         });

        $scope.selectReferential = function (referentialId,index) {
            $scope.refTabSelected = index;
            $scope.referential_uuid = referentialId;
            ReferentialService.getReferential(referentialId).then(function (data) {
                $scope.referential = data;
            });

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

        $scope.deselectReferentialsTab = function () {
            TableHelperService.removeFilter($scope.measures);
            $scope.measures.selected = [];
        };

        $scope.removeMeasuresFilter = function () {
            TableHelperService.removeFilter($scope.measures);
        };

        $scope.toggleMeasureStatus = function (measure) {
            MeasureService.patchMeasure(measure.uuid, {status: !measure.status}, function () {
                measure.status = !measure.status;
            });
        }

        $scope.updateReferentials = function () {
            $scope.updatingReferentials = false;
            $scope.referentials.promise = ReferentialService.getReferentials({order: 'createdAt'});
            $scope.referentials.promise.then(
                function (data) {
                    $scope.referentials.items = data;
                    // we want to know the UUIDs of all the referentials already
                    // imported in the analysis
                    $rootScope.referentials_uuid = $scope.referentials.items.referentials.map(function(referential){return referential.uuid});
                    $scope.updatingReferentials = true;
                }
            )
        };

        $scope.importNewReferential = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$rootScope', '$scope', '$http', '$mdDialog', ImportReferentialDialogCtrl],
                templateUrl: 'views/anr/import.referentials.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            })
                .then(function (result) {
                    var referential = result.referential;
                    var categories = result.categories;
                    var measures = result.measures;

                    ReferentialService.createReferential(referential,
                        function () {
                            SOACategoryService.createCategory(categories, function(){
                                SOACategoryService.getCategories({order: $scope._langField('label'), referential: referential.uuid}).then(function (data) {
                                    measures.map(function(measure) {
                                        measure.category = data.categories.find( c => c['label' + $scope.language].toLowerCase().trim() === measure.category.toLowerCase().trim() ).id;
                                    })
                                    MeasureService.createMeasure(measures, function (){
                                        $scope.$parent.updateReferentials();
                                        toastr.success(gettextCatalog.getString('The referential has been imported successfully.'),
                                                       gettextCatalog.getString('Creation successful'));
                                         $rootScope.$broadcast('referentialsUpdated');
                                         $rootScope.$broadcast('controlsUpdated');
                                    });

                                });
                            });
                        }
                    );
                });
        };

        $scope.createNewReferential = function (ev, referential) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ReferentialService', 'ConfigService', 'referential', 'anrId', CreateReferentialDialogCtrl],
                templateUrl: 'views/anr/create.referentials.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                  'referential' : referential,
                  'anrId': $scope.model.anr.id
                }
            })
                .then(function (referential) {
                    var cont = referential.cont;
                    referential.cont = undefined;

                    if (cont) {
                        $scope.createNewReferential(ev);
                    }

                    ReferentialService.createReferential(referential,
                        function () {
                          $scope.refTabSelected = $scope.referentials.items.count + 1;
                          $scope.updateReferentials();
                          toastr.success(gettextCatalog.getString('The referential has been created successfully.'),
                                         gettextCatalog.getString('Creation successful'));
                          $rootScope.$broadcast('referentialsUpdated');
                        },

                        function () {
                            $scope.createNewReferential(ev, referential);
                        }
                    );
                });
        };

        $scope.editReferential = function (ev, referential) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            ReferentialService.getReferential(referential).then(function (referentialData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ReferentialService', 'ConfigService', 'referential', 'anrId', CreateReferentialDialogCtrl],
                    templateUrl: 'views/anr/create.referentials.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'referential': referentialData,
                        'anrId': $scope.model.anr.id
                    }
                })
                    .then(function (referential) {
                        ReferentialService.updateReferential(referential,
                            function () {
                                $scope.updateReferentials();
                                toastr.success(gettextCatalog.getString('The referential has been edited successfully.',
                                    {referentialLabel: referential.label1}), gettextCatalog.getString('Edition successful'));
                                $rootScope.$broadcast('referentialsUpdated');
                            },

                            function () {
                                $scope.editReferential(ev, referential);
                            }
                        );
                    });
            });
        };

        $scope.matchReferential = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            ReferentialService.getReferentials({order: 'createdAt'}).then(function (data) {
                var matchReferentials = data;
                MeasureService.getMeasures({referential: $scope.referential_uuid, order:'code'}).then(function (data) {
                    var measuresRefSelected = data;
                    $mdDialog.show({
                        controller: ['$scope', '$mdDialog', 'ReferentialService', 'MeasureService','ConfigService', 'MeasureMeasureService', '$q', 'measures', 'referentials', 'referentialSelected', MatchReferentialDialogCtrl],
                        templateUrl: 'views/anr/match.referentials.html',
                        targetEvent: ev,
                        preserveScope: false,
                        scope: $scope.$dialogScope.$new(),
                        clickOutsideToClose: false,
                        fullscreen: useFullScreen,
                        locals: {
                            'measures' : measuresRefSelected,
                            'referentials': matchReferentials,
                            'referentialSelected' : $scope.referential
                        }
                    })
                });
            });
        };

        $scope.deleteReferential = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete referential?',
                    {label: item.label1}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                ReferentialService.deleteReferential(item,
                    function () {
                        $scope.updateReferentials();
                        toastr.success(gettextCatalog.getString('The referential has been deleted.',
                                    {label: item.label1}), gettextCatalog.getString('Deletion successful'));
                        $rootScope.$broadcast('referentialsUpdated');
                    }
                );
            });
        };

        $scope.updateMeasures = function () {
            var query = angular.copy($scope.measures.query);
            query.status = $scope.measures.activeFilter;
            query.referential = $scope.referential_uuid;

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

        $scope.createNewMeasure = function (ev, measure) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));


            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', 'SOACategoryService',
                             'MeasureService', 'ReferentialService', 'ConfigService', '$q', 'measure', 'referential',
                             'anrId', CreateMeasureDialogCtrl],
                templateUrl: 'views/anr/create.measures.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'measure': measure,
                    'referential' : $scope.referential,
                    'anrId': $scope.model.anr
                }
            })
                .then(function (measure) {
                    var cont = measure.cont;
                    measure.cont = undefined;
                    measure.referential = $scope.referential.uuid;
                    if (cont) {
                        $scope.createNewMeasure(ev);
                    }

                    MeasureService.createMeasure(measure,
                        function () {
                            $scope.measures.activeFilter = 1;
                            $scope.updateMeasures();
                            toastr.success(gettextCatalog.getString('The control has been created successfully.',
                                {measureLabel: $scope._langField(measure,'label')}), gettextCatalog.getString('Creation successful'));
                            $rootScope.$broadcast('controlsUpdated');
                        },
                        function (err) {
                            $scope.createNewMeasure(ev, measure);
                        }
                    );
                });
        };

        $scope.editMeasure = function (ev, measure) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            MeasureService.getMeasure(measure.uuid).then(function (measureData) {
                $mdDialog.show({
                    controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', 'SOACategoryService',
                                 'MeasureService', 'ReferentialService', 'ConfigService', '$q', 'measure', 'referential',
                                 'anrId', CreateMeasureDialogCtrl],
                    templateUrl: 'views/anr/create.measures.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'measure': measureData,
                        'referential' : $scope.referential,
                        'anrId': $scope.model.anr
                    }
                })
                    .then(function (measure) {
                        measure.referential = $scope.referential.uuid;
                        MeasureService.updateMeasure(measure,
                            function () {
                                $scope.updateMeasures();
                                toastr.success(gettextCatalog.getString('The control has been edited successfully.',
                                    {measureLabel: $scope._langField(measure,'label')}), gettextCatalog.getString('Edition successful'));
                                $rootScope.$broadcast('controlsUpdated');
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
                    {label: $scope._langField(item,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                MeasureService.deleteMeasure(item.uuid,
                    function () {
                        toastr.success(gettextCatalog.getString('The control has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                        $scope.updateMeasures();
                        $scope.measures.selected = $scope.measures.selected.filter(measureSelected => measureSelected.uuid != item.uuid);
                        $rootScope.$broadcast('controlsUpdated');
                    }
                );
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
                    ids.push($scope.measures.selected[i].uuid);
                }
                MeasureService.deleteMassMeasure(ids, function () {
                    toastr.success(gettextCatalog.getString('{{count}} controls have been deleted.',
                        {count: count}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateMeasures();
                    $scope.measures.selected = [];
                    $rootScope.$broadcast('controlsUpdated');
                });
            });
        };


         /*
          * AMVS TAB
          */
        $scope.amvs = TableHelperService.build('status', 20, 1, '');
        $scope.amvs.activeFilter = 1;
        var amvsFilterWatch;
        $scope.referentials_filter = [];

        $scope.selectAmvsTab = function () {
            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'amvs'});
            ReferentialService.getReferentials({order: 'createdAt'}).then(function (data) {
                $scope.referentials_filter.items = data;
                if (data['referentials'][0]) {
                  $scope.referentials_filter.selected = data['referentials'][0].uuid;
                }
                $scope.updateAmvs();
            });
            var initAmvsFilter = true;
            initAmvsFilter = $scope.$watchGroup(['amvs.activeFilter', 'amvs.query.filter'], function(newValue, oldValue) {
                if (initAmvsFilter) {
                    initAmvsFilter = false;
                } else {
                    $scope.updateAmvs();
                }
            });
        }

        $scope.deselectAmvsTab = function () {
            TableHelperService.unwatchSearch($scope.amvs);
            $scope.amvs.selected = [];
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

            // we want to know the UUIDs of all the amvs already
            // imported in the analysis
            query.limit = -1;
            query.filter = "";
            query.status = "all";
            $scope.amvs.promise = AmvService.getAmvs(query);
            $scope.amvs.promise.then(
                function (data) {
                    $rootScope.amvs_uuid = data.amvs.map(function(amv){return amv.uuid});
                }
            )
        };

        $scope.removeAmvsFilter = function () {
            TableHelperService.removeFilter($scope.amvs);
        };


        $scope.toggleAmvStatus = function (amv) {
            AmvService.patchAmv(amv.uuid, {status: !amv.status}, function () {
                amv.status = !amv.status;
            })
        }

        $scope.updateMeasuresAMV = function (ev){
          var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

          $mdDialog.show({
              controller: ['$scope', '$mdDialog', 'referentials', updateMeasuresAMVDialogCtrl],
              templateUrl: 'views/anr/updateMeasures.amvs.html',
              targetEvent: ev,
              preserveScope: false,
              scope: $scope.$dialogScope.$new(),
              clickOutsideToClose: false,
              fullscreen: useFullScreen,
              locals: {
                  'referentials': $scope.referentials_filter.items['referentials'],
              }
          })

              .then(function (params) {
                AmvService.patchAmvs(params,
                  function () {
                    $scope.updateAmvs();
                    toastr.success(gettextCatalog.getString('The risks have been edited successfully.'),
                      gettextCatalog.getString('Edition successful'));
                    $rootScope.$broadcast('amvUpdated');
                });
              });
        }

        $scope.createNewAmv = function (ev, amv) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AssetService', 'ThreatService', 'VulnService',
                             'MeasureService', 'ReferentialService', 'ConfigService', 'AmvService',
                             '$q', 'amv', 'referentials', CreateAmvDialogCtrl],
                templateUrl: 'views/anr/create.amvs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'amv': amv,
                    'referentials': $scope.referentials_filter.items['referentials']
                }
            })
                .then(function (amv) {
                    var amvBackup = angular.copy(amv);

                    if (amv.threat) {
                        amv.threat = amv.threat.uuid;
                    }
                    if (amv.asset) {
                        amv.asset = amv.asset.uuid;
                    }
                    if (amv.vulnerability) {
                        amv.vulnerability = amv.vulnerability.uuid;
                    }

                    var cont = amv.cont;
                    amv.cont = undefined;
                    if (cont) {
                        $scope.createNewAmv(ev);
                    }

                    AmvService.createAmv(amv,
                        function () {
                            $scope.updateAmvs();
                            toastr.success(gettextCatalog.getString('The risk has been created successfully.'),
                              gettextCatalog.getString('Creation successful'));
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
            if(amv.uuid!=undefined){
                amv = amv.uuid;
            }

            AmvService.getAmv(amv).then(function (amvData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'AssetService', 'ThreatService', 'VulnService',
                                 'MeasureService', 'ReferentialService', 'ConfigService', 'AmvService',
                                 '$q', 'amv', 'referentials', CreateAmvDialogCtrl],
                    templateUrl: 'views/anr/create.amvs.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'amv': amvData,
                        'referentials' : $scope.referentials_filter.items['referentials']
                    }
                })
                    .then(function (amv) {
                        var amvBackup = angular.copy(amv);
                        if (amv.threat) {
                            amv.threat = amv.threat.uuid;
                        }
                        if (amv.asset) {
                            amv.asset = amv.asset.uuid;
                        }
                        if (amv.vulnerability) {
                            amv.vulnerability = amv.vulnerability.uuid;
                        }


                        AmvService.updateAmv(amv,
                            function () {
                                $scope.updateAmvs();
                                toastr.success(gettextCatalog.getString('The risk has been edited successfully.'),
                                  gettextCatalog.getString('Edition successful'));
                                $rootScope.$broadcast('amvUpdated');
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
                AmvService.deleteAmv(item.uuid,
                    function () {
                        toastr.success(gettextCatalog.getString('The risk has been deleted.'),
                          gettextCatalog.getString('Deletion successful'));
                        $scope.updateAmvs();
                        $scope.amvs.selected = $scope.amvs.selected.filter(amvSelected => amvSelected.uuid != item.uuid);
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
                    ids.push($scope.amvs.selected[i].uuid);
                }

                AmvService.deleteMassAmv(ids, function () {
                    toastr.success(gettextCatalog.getString('{{ count }} risks have been deleted.',
                        {count: count}), gettextCatalog.getString('Deletion successful'));
                    $scope.updateAmvs();
                    $scope.amvs.selected = [];
                });
            }, function() {
            });
        };

        /*
         * ASSETS LIBRARY TAB
         */
        var objLibTabSelected = false;
        $scope.objlibs = TableHelperService.build('name' + $scope.language, 20, 1, '');

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

            var isUpdate = (objlib && objlib.uuid);

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
                            objlib.asset = objlib.asset.uuid;
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
            if (objlib && objlib.uuid) {
                if (dontFetch) {
                    $scope.createNewObjlib(ev, objlib);
                } else {
                    ObjlibService.getObjlib(objlib.uuid).then(function (objlibData) {
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
        $scope.tags = TableHelperService.build('label' + $scope.language, 20, 1, '');

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
            $scope.tags.selected = [];
        };

        $scope.createNewTag = function (ev, tag) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ConfigService', 'tag', CreateTagDialogCtrl],
                templateUrl: 'views/anr/create.tags.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
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
                        toastr.success(gettextCatalog.getString('The tag has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                        $scope.updateTags();
                        $scope.tags.selected = $scope.tags.selected.filter(tagSelected => tagSelected.id != item.id);

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
        $scope.risks = TableHelperService.build('label' + $scope.language, 20, 1, '');
        $scope.risk_tag_filter = null;
        $scope.opRisksRef_filter = [];

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

            ReferentialService.getReferentials({order: 'createdAt'}).then(function (data) {
                $scope.opRisksRef_filter.items = data;
                if (data['referentials'][0]) {
                  $scope.opRisksRef_filter.selected = data['referentials'][0].uuid;
                }else {
                  $scope.updateRisks();
                }
            });

            TagService.getTags({limit: 0, order: '-label1'}).then(function (tags) {
                $scope.risk_tags = tags.tags;
            })
        };

        $scope.deselectRisksTab = function () {
            risksTabSelected = false;
            TableHelperService.unwatchSearch($scope.risks);
            $scope.risks.selected = [];
        };

        $scope.updateMeasuresOpRisks = function (ev){
          var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

          $mdDialog.show({
              controller: ['$scope', '$mdDialog', 'referentials', updateMeasuresAMVDialogCtrl],
              templateUrl: 'views/anr/updateMeasures.amvs.html',
              targetEvent: ev,
              preserveScope: false,
              scope: $scope.$dialogScope.$new(),
              clickOutsideToClose: false,
              fullscreen: useFullScreen,
              locals: {
                  'referentials': $scope.opRisksRef_filter.items['referentials'],
              }
          })

              .then(function (params) {
                RiskService.patchRisks(params,
                  function () {
                    $scope.updateRisks();
                    toastr.success(gettextCatalog.getString('The risks have been edited successfully.'),
                      gettextCatalog.getString('Edition successful'));
                    $rootScope.$broadcast('opRiskUpdated');
                });
              });
        }

        $scope.createNewRisk = function (ev, risk) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'ConfigService', 'TagService', 'MeasureService', 'risk', 'referentials', CreateRiskDialogCtrl],
                templateUrl: 'views/anr/create.risks.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'risk': risk,
                    'referentials': $scope.opRisksRef_filter.items['referentials']
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

        $scope.importNewAmv = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$rootScope', '$scope', '$http', '$mdDialog', '$q', 'ConfigService', 'AssetService', 'ThreatService', 'VulnService', ImportAmvDialogCtrl],
                templateUrl: 'views/anr/import.amv.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            })
            .then(function (amv) {
                var new_amv = {
                    uuid: amv.amv.uuid,
                    asset: amv.amv.asset,
                    threat: amv.amv.threat,
                    vulnerability: amv.amv.vulnerability,
                    status: 1,
                    implicitPosition: 1
                };
                AmvService.createAmv(new_amv,
                    function () {
                        $scope.updateAmvs();
                        toastr.success(gettextCatalog.getString('The risk has been created successfully.'),
                          gettextCatalog.getString('Creation successful'));
                    }
                );

            })
        };

        $scope.editRisk = function (ev, risk) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            RiskService.getRisk(risk.id).then(function (riskData) {
                  $mdDialog.show({
                      controller: ['$scope', '$mdDialog', '$q', 'ConfigService', 'TagService', 'MeasureService', 'risk', 'referentials', CreateRiskDialogCtrl],
                      templateUrl: 'views/anr/create.risks.html',
                      targetEvent: ev,
                      preserveScope: false,
                      scope: $scope.$dialogScope.$new(),
                      clickOutsideToClose: false,
                      fullscreen: useFullScreen,
                      locals: {
                          'risk': riskData,
                          'referentials': $scope.opRisksRef_filter.items['referentials']
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
                                  $rootScope.$broadcast('opRiskUpdated');
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
                        toastr.success(gettextCatalog.getString('The risk has been deleted.',
                            {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                        $scope.updateRisks();
                        $scope.risks.selected = $scope.risks.selected.filter(riskSelected => riskSelected.id != item.id);
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

      //Import File Center

      $scope.importFile = function (ev,tab) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        $mdDialog.show({
            controller: ['$scope', '$mdDialog', 'AssetService', 'ThreatService', 'VulnService', 'MeasureService',
                        'SOACategoryService', 'TagService', 'RiskService', 'MeasureMeasureService', 'toastr', 'gettextCatalog', '$q', 'tab', 'themes', 'categories', 'referential' ,'tags',  ImportFileDialogCtrl],
            templateUrl: 'views/anr/import.file.html',
            targetEvent: ev,
            scope: $scope.$dialogScope.$new(),
            preserveScope: false,
            clickOutsideToClose: false,
            fullscreen: useFullScreen,
            locals: {
                'tab': tab,
                'themes' : $scope.listThemes,
                'categories' : $scope.listCategories,
                'referential' : $scope.RefSelected,
                'tags' : $scope.listTags
            }
        })
         .then(function(importData){
           switch (tab) {

             case 'Asset types':
               AssetService.createAsset(importData, function (result){
                 $scope.$parent.updateAssets();
                 successCreateObject(result)
               });
               break;
             case 'Threats':
               ThreatService.createThreat(importData, function (result){
                 $scope.$parent.updateThreats();
                 successCreateObject(result)
               });
               break;
             case 'Vulnerabilties':
               VulnService.createVuln(importData, function (result){
                 $scope.$parent.updateVulns();
                 successCreateObject(result)
               });
               break;
             case 'Controls':
               MeasureService.createMeasure(importData, function (result){
                 $scope.$parent.updateMeasures();
                 successCreateObject(result)
                 $rootScope.$broadcast('controlsUpdated');
               });
               break;
             case 'Categories':
               SOACategoryService.createCategory(importData, function (result){
                 successCreateObject(result)
               });
               break;
             case 'Tags':
               TagService.createTag(importData, function (result){
                 $scope.$parent.updateTags();
                 successCreateObject(result)
               });
               break;
             case 'Operational risks':
               RiskService.createRisk(importData, function (result){
                 $scope.$parent.updateRisks();
                 successCreateObject(result)
               });
               break;
             case 'Matches':
                MeasureMeasureService.createMeasureMeasure(importData, function (result){
                  successCreateObject(result)
                });
               break;

             default:
           }

           function successCreateObject(result){

             toastr.success(gettextCatalog.getString((Array.isArray(result.id) ? result.id.length : 1) + ' ' + tab + ' ' + 'have been created successfully.'),
                            gettextCatalog.getString('Creation successful'));

           };
         })
      }

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

    function ImportAssetDialogCtrl($rootScope, $scope, $http, $mdDialog, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        var mosp_query_organizations = 'organization';
        $http.jsonp($rootScope.mospApiUrl + mosp_query_organizations)
        .then(function(org) {
            var mosp_query_all_assets = 'json_object?q={"filters":[{"name":"schema","op":"has","val":{"name":"name","op":"eq","val": "Assets"}}]}&results_per_page=3000';
            $http.jsonp($rootScope.mospApiUrl + mosp_query_all_assets)
            .then(function(assets) {
                $scope.all_assets = assets.data.data.objects;
                var org_ids = Array.from(new Set($scope.all_assets.map(asset => asset.org_id)));
                $scope.organizations = org.data.data.objects.filter(org => org_ids.includes(org.id));
            });
        });

        $scope.selectOrganization = function() {
            // Retrieve the assets from the selected organization
            $scope.mosp_assets = $scope.all_assets.filter(
                asset => asset.org_id == $scope.organization.id &&
                !$rootScope.assets_uuid.includes(asset.json_object.uuid) &&
                asset.json_object.language == $scope.languages[$scope.language].toUpperCase()
            );
        }

        $scope.getMatches = function(searchText) {
            // filter on the name and and the theme
            return $scope.mosp_assets.filter(r => r['name'].toLowerCase().includes(searchText.toLowerCase()));
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.import = function() {
            var asset = $scope.asset.json_object;
            for (var i = 1; i <=4; i++) {
                asset['label'+i] = asset.label;
                asset['description'+i] = asset.description;
            }
            asset['type'] = asset['type'] == 'Primary' ? 1 : 2;
            $mdDialog.hide(asset);
        };
    }

    function CreateThreatDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, ModelService, ThreatService, ConfigService, threat) {
        ModelService.getModels({isGeneric:0}).then(function (data) {
            $scope.models = data.models;
        });

        ThreatService.getThemes().then(function (data) {
           $scope.listThemes = data['themes'];
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
            $scope.threat.a = ($scope.threat.a == 1);

        } else {
            $scope.threat = {
                mode: 0,
                code: '',
                c: false,
                i: false,
                a: false,
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

        $scope.$watch('language', function() {
          if ($scope.threat.theme) {
            $scope.themeSearchText = $scope.threat.theme['label' + $scope.language];
          }
        });

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

        $scope.createNewTheme = function (ev, theme, label) {
            theme = {
              ['label' + $scope.language] : label,
            };
            ThreatService.createTheme(theme,
                function (status) {
                theme.id = status.id;
                $scope.selectedThemeItemChange(theme);
                toastr.success(gettextCatalog.getString('The theme has been created successfully.',
                    {themeLabel: $scope._langField(theme,'label')}), gettextCatalog.getString('Creation successful'));
                }
            );
        };

        $scope.editTheme = function (ev, theme) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            ThreatService.getTheme(theme.id).then(function (themeData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ConfigService','theme', CreateThemeDialogCtrl],
                    templateUrl: 'views/anr/create.themes.html',
                    targetEvent: ev,
                    preserveScope: false,
                    multiple: true,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                      'theme': theme
                    }
                })
                    .then(function (theme) {
                        ThreatService.updateTheme(theme,
                            function () {
                                $scope.themeSearchText = theme['label' + $scope.language];
                                $scope.selectedThemeItemChange(theme);
                                toastr.success(gettextCatalog.getString('The theme has been edited successfully.',
                                    {themeLabel: $scope._langField(theme,'label')}), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.editTheme(ev, theme);
                            }
                        );
                    });
            });
        };

        $scope.deleteTheme= function (ev, theme) {
            var confirm = $mdDialog.confirm()
                .multiple(true)
                .title(gettextCatalog.getString('Are you sure you want to delete theme?',
                    {label: $scope._langField(theme,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                  ThreatService.deleteTheme(theme.id,
                      function () {
                        $scope.selectedThemeItemChange();
                         toastr.success(gettextCatalog.getString('The theme has been deleted.',
                         {label: $scope._langField(theme,'label')}), gettextCatalog.getString('Deletion successful'));
                      }
                  );
            });
        };

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

    function ImportThreatDialogCtrl($rootScope, $scope, $http, $mdDialog, ConfigService, ThreatService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        var mosp_query_organizations = 'organization';
        $http.jsonp($rootScope.mospApiUrl + mosp_query_organizations)
        .then(function(org) {
            var mosp_query_all_threats = 'json_object?q={"filters":[{"name":"schema","op":"has","val":{"name":"name","op":"eq","val": "Threats"}}]}&results_per_page=3000';
            $http.jsonp($rootScope.mospApiUrl + mosp_query_all_threats)
            .then(function(threats) {
                $scope.all_threats = threats.data.data.objects;
                var org_ids = Array.from(new Set($scope.all_threats.map(threat => threat.org_id)));
                $scope.organizations = org.data.data.objects.filter(org => org_ids.includes(org.id));
            });
        });

        $scope.selectOrganization = function() {
            // Retrieve the threats from the selected organization
            $scope.mosp_threats = $scope.all_threats.filter(
                threat => threat.org_id == $scope.organization.id &&
                !$rootScope.threats_uuid.includes(threat.json_object.uuid) &&
                threat.json_object.language == $scope.languages[$scope.language].toUpperCase()
            );
        }

        ThreatService.getThemes().then(function (data) {
            $scope.listThemes = data['themes'];
        });

        $scope.getMatches = function(searchText) {
            // filter on the name and and the theme
            return $scope.mosp_threats.filter(r => r['name'].toLowerCase().includes(searchText.toLowerCase()) ||
                    r['json_object']['theme'].toLowerCase().includes(searchText.toLowerCase()));
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.import = function() {
            var threat = $scope.threat.json_object;
            theme_id = $scope.listThemes.find(c => c['label' + $scope.language].toLowerCase().trim() === threat.theme.toLowerCase().trim() ).id;
            threat['theme'] = theme_id;
            for (var i = 1; i <=4; i++) {
                threat['label'+i] = threat.label;
                threat['description'+i] = threat.description;
            }
            $mdDialog.hide(threat);
        };
    }

    function CreateThemeDialogCtrl($scope, $mdDialog,  ConfigService, theme) {

      $scope.languages = ConfigService.getLanguages();
      $scope.language = $scope.getAnrLanguage();

        if (theme != undefined && theme != null) {
            $scope.theme = theme;
        } else {
            $scope.theme = {
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
            $mdDialog.hide($scope.theme);
        };
        $scope.createAndContinue = function() {
            $scope.category.cont = true;
            $mdDialog.hide($scope.theme);
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


    function ImportVulnerabilityDialogCtrl($rootScope, $scope, $http, $mdDialog, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        var mosp_query_organizations = 'organization';
        $http.jsonp($rootScope.mospApiUrl + mosp_query_organizations)
        .then(function(org) {
            var mosp_query_all_vulns = 'json_object?q={"filters":[{"name":"schema","op":"has","val":{"name":"name","op":"eq","val": "Vulnerabilities"}}]}&results_per_page=3000';
            $http.jsonp($rootScope.mospApiUrl + mosp_query_all_vulns)
            .then(function(vulns) {
                $scope.all_vulns = vulns.data.data.objects;
                var org_ids = Array.from(new Set($scope.all_vulns.map(vuln => vuln.org_id)));
                $scope.organizations = org.data.data.objects.filter(org => org_ids.includes(org.id));
            });
        });

        $scope.selectOrganization = function() {
            // Retrieve the vulnerabilities from the selected organization
            if ($scope.languages[$scope.language].toUpperCase() != 'EN') {
                $scope.mosp_vulnerabilities = $scope.all_vulns.filter(
                    vulnerability => vulnerability.org_id == $scope.organization.id &&
                    !$rootScope.vulnerabilities_uuid.includes(vulnerability.json_object.uuid) &&
                    vulnerability.json_object.language == $scope.languages[$scope.language].toUpperCase()
                );
            } else {
                $scope.mosp_vulnerabilities = $scope.all_vulns.filter(
                    vulnerability => vulnerability.org_id == $scope.organization.id &&
                    !$rootScope.vulnerabilities_uuid.includes(vulnerability.json_object.uuid)
                );
            }
        }

        /**
         * Returns a filtered list of referentials from MOSP with all the
         * vulnerabilites matching with 'searchText' as name.
         *
         * @param  searchText  the name of the vulnerability to search for
         * @return             the list of available vulnerabilites to import
         */
         $scope.getMatches = function(searchText) {
             return $scope.mosp_vulnerabilities.filter(r => r['name'].toLowerCase().includes(searchText.toLowerCase()));
         };

         $scope.cancel = function() {
             $mdDialog.cancel();
         };

         $scope.import = function() {
             var vuln = $scope.vulnerability.json_object;
             for (var i = 1; i <=4; i++) {
                 vuln['label'+i] = vuln.label;
                 vuln['description'+i] = vuln.description;
             }
             $mdDialog.hide(vuln);
         };
    }


    function ImportReferentialDialogCtrl($rootScope, $scope, $http, $mdDialog) {

        var mosp_query_organizations = 'organization';
        $http.jsonp($rootScope.mospApiUrl + mosp_query_organizations)
        .then(function(org) {
            var mosp_query_all_referentials = 'json_object?q={"filters":[{"name":"schema","op":"has","val":{"name":"name","op":"eq","val": "Security referentials"}}]}';
            $http.jsonp($rootScope.mospApiUrl + mosp_query_all_referentials)
            .then(function(ref) {
                $scope.all_referentials = ref.data.data.objects;
                var org_ids = Array.from(new Set($scope.all_referentials.map(ref => ref.org_id)));
                $scope.organizations = org.data.data.objects.filter(org => org_ids.includes(org.id));
            });
        });

        $scope.selectOrganization = function() {
            // Retrieve the security referentials from the selected organization
            $scope.mosp_referentials = $scope.all_referentials.filter(
                ref => ref.org_id == $scope.organization.id &&
                !$scope.referentials_uuid.includes(ref.json_object.uuid));
        }

       /**
        * Returns a filtered list of referentials from MOSP with all the
        * referentials matching with 'searchText' as name.
        *
        * @param  searchText  the name of the referential to search for
        * @return             the list of available referentials to import
        */
        $scope.getMatches = function(searchText) {
            return $scope.mosp_referentials.filter(r => r['name'].toLowerCase().includes(searchText.toLowerCase()));
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.import = function() {
            var ref_temp = $scope.mosp_referentials.find(r => r['id'] === $scope.referential.id);

            $scope.referential['uuid'] = ref_temp.json_object.uuid;
            for (var i = 1; i <=4; i++) {
                $scope.referential['label' + i] = ref_temp['name'];
            }

            var measures = ref_temp.json_object.measures

            $scope.categories = [];
            measures.map(function(measure) {
                var category = {};
                for (var i = 1; i <=4; i++) {
                    measure['label'+i] = measure.label;
                    category['label'+i] = measure.category;
                }
                measure['referential'] = ref_temp.json_object.uuid;
                category['referential'] = ref_temp.json_object.uuid;
                $scope.categories.push(category);
            })

            result = {
                referential: $scope.referential,
                categories: $scope.categories,
                measures: measures
            }

            $mdDialog.hide(result);
        };
    }

    function CreateReferentialDialogCtrl($scope, $mdDialog, ReferentialService, ConfigService, referential) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        var defaultLang = angular.copy($scope.language);

        if (referential != undefined && referential != null) {
            $scope.referential = referential;
            delete $scope.referential.measures;
        } else {
          $scope.referential = {
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
            for (var i = 1; i <=4; i++) {
              if ($scope.referential['label' + i] == '' && i != defaultLang) {
                $scope.referential['label' + i] = $scope.referential['label' + defaultLang];
              }
            }
            $mdDialog.hide($scope.referential);
        };
        $scope.createAndContinue = function () {
            for (var i = 1; i <=4; i++) {
              if ($scope.referential['label' + i] == '' && i != defaultLang) {
                $scope.referential['label' + i] = $scope.referential['label' + defaultLang];
              }
            }
            $scope.referential.cont = true;
            $mdDialog.hide($scope.referential);
        }
    }
    function MatchReferentialDialogCtrl($scope, $mdDialog, ReferentialService, MeasureService, ConfigService, MeasureMeasureService, $q, measures, referentials, referentialSelected) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = ConfigService.getDefaultLanguageIndex();
        $scope.measuresRefSelected = measures.measures;
        $scope.referentialsList = referentials;
        $scope.referentialSelected = referentialSelected;
        $scope.matchMeasures = [];
        $scope.matchRef_filter = '';

        $scope.referentialsList.referentials.forEach(function (ref){
          var promise = $q.defer();
          if (ref.uuid !== $scope.referentialSelected.uuid ) {
            $scope.matchMeasures[ref.uuid] = [];
            $scope.measuresRefSelected.forEach(function (measure){
              $scope.matchMeasures[ref.uuid][measure.uuid] = [];
              if (Array.isArray(measure.measuresLinked) && Array.isArray(ref.measures)) {
                measure.measuresLinked.forEach(function (measureLinked){
                  var measureFound = ref.measures.filter(ml => ml.uuid == measureLinked.uuid);
                  if (measureFound.length > 0) {
                    $scope.matchMeasures[ref.uuid][measure.uuid].push(measureLinked);
                  }
                })
              }
              promise.resolve($scope.matchMeasures[ref.uuid][measure.uuid]);
            });
            return promise.promise;
          }
        });

        $scope.queryMeasureSearch = function (query, referential, measureId ) {
            var promise = $q.defer();
            MeasureService.getMeasures({filter: query, referential: referential, order: 'code'}).then(function (e) {
              var filtered = [];
              for (var j = 0; j < e.measures.length; ++j) {
                  var found = false;
                  for (var i = 0; i < $scope.matchMeasures[referential][measureId].length; ++i) {

                      if ($scope.matchMeasures[referential][measureId][i].uuid == e.measures[j].uuid) {
                          found = true;
                          break;
                      }
                  }

                  if (!found) {
                      filtered.push(e.measures[j]);
                  }
              }

              promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.addMeasureLinked = function(fatherId,childId) {
          var measuremeasure  = {
              father: fatherId,
              child: childId,
          };
          MeasureMeasureService.createMeasureMeasure(measuremeasure);
        };

        $scope.deleteMeasureLinked = function(fatherId,childId) {
          var measuremeasure  = {
              father: fatherId,
              child: childId,
          };
          MeasureMeasureService.deleteMeasureMeasure(measuremeasure);
        };

        $scope.exportMatchRefs = function(){
            var csv = '';
            MeasureMeasureService.getMeasuresMeasures().then(function(data) {
              var measuresLinked = data.measuresmeasures;
              keys = ['father','child'];
              var csv = 'control,match\n';
              var uuids = $scope.measuresRefSelected.map(item => item.uuid);
              var measuresLinkedRefSelected = measuresLinked.filter(measure => uuids.includes(measure.father));

              measuresLinkedRefSelected.forEach(function(item) {
                  ctr = 0;
                  keys.forEach(function(key) {
                      if (ctr > 0) csv += ',';
                      csv += item[key];
                      ctr++;
                  });
                  csv += '\n';
              });

              data = encodeURI('data:text/csv;charset=UTF-8,\uFEFF' + csv);
              link = document.createElement('a');
              link.setAttribute('href', data);
              link.setAttribute('download', 'matchReferentials.csv');
              document.body.appendChild(link);
              link.click();
            })
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.matchMeasures);
        };
    }

    function CreateMeasureDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, SOACategoryService,
                                    MeasureService, ReferentialService, ConfigService, $q, measure, referential,
                                    anrId) {

        SOACategoryService.getCategories({order: $scope._langField('label'), referential: referential.uuid}).then(function (data) {
           $scope.listCategories = data['categories'];
        });
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.categorySearchText = '';
        $scope.RefSelected = referential.uuid;
        if (measure != undefined && measure != null) {
            $scope.measure = measure;
        } else {
            $scope.measure = {
                referential: referential,
                code: '',
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                category: '',
            };
        }

        $scope.$watch('language', function() {
          if ($scope.measure.category) {
            $scope.categorySearchText = $scope.measure.category['label' + $scope.language];
          }
        });

        $scope.queryCategorySearch = function (query) {
            var promise = $q.defer();
            SOACategoryService.getCategories({filter: query, order: $scope._langField('label'), referential: referential.uuid}).then(function (data) {
                promise.resolve(data['categories']);
            }, function () {
                promise.reject();
            });
            return promise.promise;
        };

        $scope.selectedCategoryItemChange = function (item) {
            $scope.measure.category = item;
        }

        $scope.createNewCategory = function (ev, referential, category, label) {
            category = {
              ['label' + $scope.language] : label,
              referential: referential
            };

            SOACategoryService.createCategory(category,
                function (status) {
                  category.id = status.id;
                  $scope.selectedCategoryItemChange(category);
                    toastr.success(gettextCatalog.getString('The category has been created successfully.',
                        {categoryLabel: $scope._langField(category,'label')}), gettextCatalog.getString('Creation successful'));
                }
            );
        };

        $scope.editCategory = function (ev, referential, category) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            SOACategoryService.getCategory(category.id).then(function (categoryData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'ConfigService','referential', 'category', 'anrId', CreateCategoryDialogCtrl],
                    templateUrl: 'views/anr/create.categories.html',
                    targetEvent: ev,
                    preserveScope: false,
                    multiple: true,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                      'referential': referential,
                      'category': categoryData,
                      'anrId' : anrId
                    }
                })
                    .then(function (category) {
                        SOACategoryService.updateCategory(category,
                            function () {
                                $scope.categorySearchText = category['label' + $scope.language];
                                $scope.selectedCategoryItemChange(category);
                                toastr.success(gettextCatalog.getString('The category has been edited successfully.',
                                    {categoryLabel: $scope._langField(category,'label')}), gettextCatalog.getString('Edition successful'));
                            },

                            function () {
                                $scope.editCategory(ev, referential, category);
                            }
                        );
                    });
            });
        };

        $scope.deleteCategory = function (ev, category) {
            var confirm = $mdDialog.confirm()
                .multiple(true)
                .title(gettextCatalog.getString('Are you sure you want to delete category?',
                    {label: $scope._langField(category,'label')}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                SOACategoryService.deleteCategory(category.id,
                   function () {
                     $scope.selectedCategoryItemChange();
                      toastr.success(gettextCatalog.getString('The category has been deleted.',
                      {label: $scope._langField(category,'label')}), gettextCatalog.getString('Deletion successful'));
                   }
                );
            });
        };

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

    function CreateCategoryDialogCtrl($scope, $mdDialog,  ConfigService, referential, category, anrId) {

      $scope.languages = ConfigService.getLanguages();
      $scope.language = $scope.getAnrLanguage();
      $scope.RefSelected = referential;

        if (category != undefined && category != null) {
            $scope.category = category;
            delete $scope.category.measures;
            delete $scope.category.referential;
        } else {
            $scope.category = {
              referential: referential,
              label1: '',
              label2: '',
              label3: '',
              label4: '',
            };
            $scope.category.referential.anr = anrId;
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


    function updateMeasuresAMVDialogCtrl($scope, $mdDialog, referentials) {

        $scope.referentials = referentials;
        $scope.fromReferential = [];
        $scope.toReferential = [];

        $scope.update = function (){
          var params = {
            fromReferential: $scope.fromReferential,
            toReferential: $scope.toReferential
          };
          $mdDialog.hide(params);
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };


    }

    function CreateAmvDialogCtrl($scope, $mdDialog, AssetService, ThreatService, VulnService,
                                MeasureService, ReferentialService, ConfigService, AmvService,
                                $q, amv, referentials) {
        $scope.languages = ConfigService.getLanguages();
        $scope.defaultLang = $scope.getAnrLanguage();
        $scope.amvReferentials = referentials;

        $scope.queryAmvs = function (asset_id) {
            AmvService.getAmvs({limit: 0, asset: asset_id, order: 'position', amvid: $scope.amv.uuid}).then(function (data) {
                $scope.asset_amvs = data.amvs;
            });
        };


        if (amv != undefined && amv != null) {
            $scope.amv = amv;
            if (amv.asset && amv.asset.uuid) {
                $scope.queryAmvs(amv.asset.uuid);
            }
            if (amv.previous && amv.previous.uuid) {
                $scope.amv.previous = $scope.amv.previous.uuid;
            }
            if (amv.measures.length == undefined) {
              $scope.amv.measures = [];
              referentials.forEach(function (ref){
                $scope.amv.measures[ref.uuid] = [];
              })
            } else {
              var measuresBackup = $scope.amv.measures;
              $scope.amv.measures = [];
              referentials.forEach(function (ref){
                $scope.amv.measures[ref.uuid] = measuresBackup.filter(function (measure) {
                    return (measure.referential.uuid == ref.uuid);
                })
              })
            }
        } else {
            $scope.amv = {
                asset: null,
                threat: null,
                vulnerability: null,
                measures: [],
                implicitPosition: 2,
                status: 1
            };
            referentials.forEach(function (ref){
              $scope.amv.measures[ref.uuid] = [];
            })
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
                $scope.queryAmvs(item.uuid);
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

        // Referentials

        $scope.selectAmvReferential = function (referential) {
            $scope.amv.referential = referential;
        }

        // Measures
        $scope.queryMeasureSearch = function (query) {
            var promise = $q.defer();
            MeasureService.getMeasures({filter: query, referential: $scope.amv.referential.uuid, order: 'code'}).then(function (e) {
              var filtered = [];
              for (var j = 0; j < e.measures.length; ++j) {
                  var found = false;
                  for (var i = 0; i < $scope.amv.measures[$scope.amv.referential.uuid].length; ++i) {

                      if ($scope.amv.measures[$scope.amv.referential.uuid][i].uuid == e.measures[j].uuid) {
                          found = true;
                          break;
                      }
                  }

                  if (!found) {
                      filtered.push(e.measures[j]);
                  }
              }

              promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {

            referentials.forEach(function (ref){
              var promise = $q.defer();
              if ($scope.amv.measures[ref.uuid] != undefined) {
                $scope.amv.measures[ref.uuid].forEach (function (measure) {
                  promise.resolve($scope.amv.measures.push(measure.uuid));
                })
              }
              return promise.promise;

            })

            if ($scope.amv.implicitPosition == 3 && !$scope.amv.previous) {
                $scope.amv.implicitPosition = 1;
            }
            delete $scope.amv.referential;
            $mdDialog.hide($scope.amv);
        };
        $scope.createAndContinue = function () {

            referentials.forEach(function (ref){
              var promise = $q.defer();
              if ($scope.amv.measures[ref.uuid] != undefined) {
                $scope.amv.measures[ref.uuid].forEach (function (measure) {
                  promise.resolve($scope.amv.measures.push(measure.uuid));
                })
              }
              return promise.promise;
            })

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

    function CreateRiskDialogCtrl($scope, $mdDialog, $q, ConfigService, TagService, MeasureService, risk, referentials) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.riskopReferentials = referentials;

        TagService.getTags().then(function (data) {
           $scope.listTags = data['tags'];
        });

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
            if (risk.measures.length == undefined) {
              $scope.risk.measures = [];
              referentials.forEach(function (ref){
                $scope.risk.measures[ref.uuid] = [];
              })
            } else {
              var measuresBackup = $scope.risk.measures;
              $scope.risk.measures = [];
              referentials.forEach(function (ref){
                $scope.risk.measures[ref.uuid] = measuresBackup.filter(function (measure) {
                    return (measure.referential.uuid == ref.uuid);
                })
              })
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
                measures: [],
                tags: [],
            };
            referentials.forEach(function (ref){
              $scope.risk.measures[ref.uuid] = [];
            })
        }

        $scope.selectRiskopReferential = function (referential) {
            $scope.risk.referential = referential;
        }

        // Measures
        $scope.queryMeasureSearch = function (query) {
            var promise = $q.defer();
            MeasureService.getMeasures({filter: query, referential: $scope.risk.referential.uuid, order: 'code'}).then(function (e) {
              var filtered = [];
              for (var j = 0; j < e.measures.length; ++j) {
                  var found = false;
                  for (var i = 0; i < $scope.risk.measures[$scope.risk.referential.uuid].length; ++i) {

                      if ($scope.risk.measures[$scope.risk.referential.uuid][i].uuid == e.measures[j].uuid) {
                          found = true;
                          break;
                      }
                  }

                  if (!found) {
                      filtered.push(e.measures[j]);
                  }
              }

              promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {

            referentials.forEach(function (ref){
              var promise = $q.defer();
              if ($scope.risk.measures[ref.uuid] != undefined) {
                $scope.risk.measures[ref.uuid].forEach (function (measure) {
                  promise.resolve($scope.risk.measures.push(measure.uuid));
                })
              }
              return promise.promise;

            })

            delete $scope.risk.referential;
            $mdDialog.hide($scope.risk);
        };

        $scope.createAndContinue = function() {
            $scope.risk.cont = true;

            referentials.forEach(function (ref){
              var promise = $q.defer();
              if ($scope.risk.measures[ref.uuid] != undefined) {
                $scope.risk.measures[ref.uuid].forEach (function (measure) {
                  promise.resolve($scope.risk.measures.push(measure.uuid));
                })
              }
              return promise.promise;

            })

            delete $scope.risk.referential;
            $mdDialog.hide($scope.risk);
        };
    }

    function ImportAmvDialogCtrl($rootScope, $scope, $http, $mdDialog, $q, ConfigService, AssetService, ThreatService, VulnService) {
            $scope.languages = ConfigService.getLanguages();
            $scope.language = $scope.getAnrLanguage();

            var mosp_query_organizations = 'organization';
            $http.jsonp($rootScope.mospApiUrl + mosp_query_organizations)
            .then(function(org) {
                var mosp_query_all_amvs = 'json_object?q={"filters":[{"name":"schema","op":"has","val":{"name":"name","op":"eq","val": "Risks"}}]}&results_per_page=3000';
                $http.jsonp($rootScope.mospApiUrl + mosp_query_all_amvs)
                .then(function(amvs) {
                    $scope.all_amvs = amvs.data.data.objects;
                    var org_ids = Array.from(new Set($scope.all_amvs.map(amv => amv.org_id)));
                    $scope.organizations = org.data.data.objects.filter(org => org_ids.includes(org.id));
                });
            });

            $scope.selectOrganization = function() {
                // Retrieve the amvs from the selected organization
                $scope.mosp_amvs = $scope.all_amvs.filter(
                    amv => amv.org_id == $scope.organization.id &&
                    !$rootScope.amvs_uuid.includes(amv.json_object.uuid)
                );
            }

            $scope.getMatches = function(searchText) {
                // filter on the description and and the name (for an AMV, generally an UUID)
                return $scope.mosp_amvs.filter(r => r['description'].toLowerCase().includes(searchText.toLowerCase()) ||
                                                r['name'].toLowerCase().includes(searchText.toLowerCase()));
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.getAsset = function (id) {
                var promise = $q.defer();
                AssetService.getAsset(id).then(function (e) {
                    promise.resolve(e);
                }, function (e) {
                    promise.reject(e);
                });
                return promise.promise;
            };

            $scope.getThreat = function (id) {
                var promise = $q.defer();
                ThreatService.getThreat(id).then(function (e) {
                    promise.resolve(e);
                }, function (e) {
                    promise.reject(e);
                });
                return promise.promise;
            };

            $scope.getVulnerability = function (id) {
                var promise = $q.defer();
                VulnService.getVuln(id).then(function (e) {
                    promise.resolve(e);
                }, function (e) {
                    promise.reject(e);
                });
                return promise.promise;
            };

            $scope.import = function() {
                var amv = $scope.amv.json_object;
                var result = {};
                result.amv = amv;

                $scope.getAsset(amv.asset).then(function(e) {
                    result.asset = e;
                    $scope.getThreat(amv.threat).then(function(e) {
                        result.threat = e;
                    }).then(function(e) {
                        $scope.getVulnerability(amv.vulnerability).then(function(e) {
                            result.vulnerability = e;
                            $mdDialog.hide(result);
                        })
                    })
                });
            };
        }

    function ImportFileDialogCtrl($scope, $mdDialog, AssetService, ThreatService, VulnService, MeasureService, SOACategoryService,
                                  TagService, RiskService, MeasureMeasureService, toastr, gettextCatalog, $q, tab, themes, categories, referential, tags) {

      $scope.tab = tab;
      $scope.guideVisible = false;
      $scope.language = $scope.getAnrLanguage();

      switch (tab) {
        case 'Asset types':
          var getService = AssetService.getAssets();
          var items = 'assets';
          break;
        case 'Threats':
          var getService = ThreatService.getThreats();
          var items = 'threats';
          var externalItem = 'theme';
          $scope.actualExternalItems = themes;
          var extItemLabel = gettextCatalog.getString('themes');
        break;
        case 'Vulnerabilties':
          var getService = VulnService.getVulns();
          var items = 'vulnerabilities'; break;
        case 'Controls':
          var getService = MeasureService.getMeasures({referential: referential});
          var items = 'measures';
          var externalItem = 'category';
          $scope.actualExternalItems = categories;
          var extItemLabel = gettextCatalog.getString('categories');
        break;
        case 'Categories':
          var getService = SOACategoryService.getCategories({referential: referential});
          var items = 'categories';
          break;
        case 'Tags':
          var getService = TagService.getTags();
          var items = 'tags'; break;
        case 'Operational risks':
          var getService = RiskService.getRisks();
          var externalItem = 'tags';
          $scope.actualExternalItems = tags;
          var extItemLabel = gettextCatalog.getString('tags');
          var items = 'risks'; break;
        case 'Matches':
          var getService = MeasureMeasureService.getMeasuresMeasures();
          var items = 'measuresmeasures';
          MeasureService.getMeasures().then(function (data) {
            $scope.allMeasures = data.measures;
          });
          break;
        default:
      }

      $scope.items = {
        'Asset types' :  {
            'code' : {
              'field' : 'code',
              'required' : true,
              'type' : 'text',
              'example' : 'C16, 123, CAZ, C-12'
            },
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('Network')
            },
            'description' : {
              'field' : 'description',
              'required' : false,
              'type' : 'text',
              'example' : gettextCatalog.getString('Any network hardware (router, switch, firewall, etc.)')
            },
            'type' : {
              'field' : 'type',
              'required' : true,
              'type' : '1,2',
              'example' : gettextCatalog.getString('\n1: primary asset\n2: secondary asset')
            }
        },
        'Threats' : {
            'code' : {
              'field' : 'code',
              'required' : true,
              'type' : 'text',
              'example' : 'C16, 123, CAZ, C-12'
            },
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('Fire')
            },
            'description' : {
              'field' : 'description',
              'required' : false,
              'type' : 'text',
              'example' : gettextCatalog.getString('Any situation that could facilitate the conflagration of premises or equipment.')
            },
            'c' : {
              'field' : 'c',
              'required' : false,
              'type' : 'Boolean',
              'example' : '0,1,false,true'
            },
            'i' : {
              'field' : 'i',
              'required' : false,
              'type' : 'Boolean',
              'example' : '0,1,false,true'
            },
            'a' : {
              'field' : 'a',
              'required' : false,
              'type' : 'Boolean',
              'example' : '0,1,false,true'
            },
            'theme' : {
              'field' : 'theme',
              'required' : true,
              'type' : 'text',
              'example' : $scope.actualExternalItems
            }
        },
        'Vulnerabilties' :  {
            'code' : {
              'field' : 'code',
              'required' : true,
              'type' : 'text',
              'example' : 'C16, 123, CAZ, C-12'
            },
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('No IT charter specifying the rules of use')
            },
            'description' : {
              'field' : 'description',
              'required' : false,
              'type' : 'text',
              'example' : gettextCatalog.getString('IT charter Conditions of use General terms and conditions')
            }
        },
        'Controls' :  {
            'code' : {
              'field' : 'code',
              'required' : true,
              'type' : 'text',
              'example' : 'C16, 123, CAZ, C-12'
            },
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('Access control policy')
            },
            'category' : {
              'field' : 'category',
              'required' : true,
              'type' : 'text',
              'example' : $scope.actualExternalItems
            }
        },
        'Categories' :  {
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('Operations security')
            },
        },
        'Tags' :  {
            'code' : {
              'field' : 'code',
              'required' : true,
              'type' : 'text',
              'example' : 'C16, 123, CAZ, C-12'
            },
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('Governance')
            }
        },
        'Operational risks' :  {
            'code' : {
              'field' : 'code',
              'required' : true,
              'type' : 'text',
              'example' : 'C16, 123, CAZ, C-12'
            },
            'label' : {
              'field' : 'label',
              'required' : true,
              'type' : 'text',
              'example' : gettextCatalog.getString('The applicable legal and regulatory requirements are not determined, understood and consistently met')
            },
            'description' : {
              'field' : 'description',
              'required' : false,
              'type' : 'text',
              'example' : gettextCatalog.getString('Product Compliance Customer agreement')
            },
            'tags' : {
              'field' : 'tags',
              'required' : false,
              'type' : 'text',
              'example' : gettextCatalog.getString('Separed by /') + $scope.actualExternalItems
            }
        },
        'Matches' :  {
            'control' : {
              'field' : 'control',
              'required' : true,
              'type' : 'uuid',
              'example' : ''
            },
            'match' : {
              'field' : 'match',
              'required' : true,
              'type' : 'uuid',
              'example' : ''
            }
        }
      };

      $scope.parseFile = function (fileContent) {
        $scope.check = false;
        if (typeof fileContent === 'object') {
          if (Array.isArray(fileContent)) {
            var fileContentJson = {data : fileContent };
            $scope.importData = $scope.checkFile(fileContentJson);
          } else {
              var alert = $mdDialog.alert()
                  .multiple(true)
                  .title(gettextCatalog.getString('File error'))
                  .textContent(gettextCatalog.getString('Wrong schema'))
                  .theme('light')
                  .ok(gettextCatalog.getString('Cancel'))
              $mdDialog.show(alert);
              $scope.importData = [];
              $scope.check = true;
          }
        } else {
            Papa.parse(fileContent, {
                              header: true,
                              skipEmptyLines: true,
                              trimHeaders : true,
                              beforeFirstChunk: function( chunk ) {
                                var rows = chunk.split( /\r\n|\r|\n/ );
                                rows[0] = rows[0].toLowerCase();
                                return rows.join( '\n' );
                              },
                              complete: function(importData) {
                                        $scope.importData = $scope.checkFile(importData);
                              }
                      });
        }
      };

      $scope.getItems = function (){
        var promise = $q.defer();
        getService.then(function (e) {
            promise.resolve(e[items]);
        }, function (e) {
            promise.reject(e);
        });
          return promise.promise
      };

      $scope.createThemes = async function () {
          var promise = $q.defer();
          var themesData = {};
          if ($scope.extItemToCreate && $scope.extItemToCreate.length > 0) {
             for (let i = 0; i < $scope.extItemToCreate.length; i++) {
                themesData[i] = {
                ['label' + $scope.language] : $scope.extItemToCreate[i]
                };
             }

             ThreatService.createTheme(themesData, function(){
                ThreatService.getThemes().then(function (e) {
                    promise.resolve(e.themes);
                }, function (e) {
                    promise.reject();
                });
             });
          }else {
            ThreatService.getThemes().then(function (e) {
                promise.resolve(e.themes);
            }, function (e) {
                promise.reject();
            });
          }
          return promise.promise;
      };

      $scope.createCategories = function () {
          var promise = $q.defer();
          var categoryData = {};
          if ($scope.extItemToCreate && $scope.extItemToCreate.length > 0) {
            for (let i = 0; i < $scope.extItemToCreate.length; i++) {
               categoryData[i] = {
                 referential: referential,
                 label1: '',
                 label2: '',
                 label3: '',
                 label4: '',
               };
               categoryData[i]['label' + $scope.language] = $scope.extItemToCreate[i];
            }
            SOACategoryService.createCategory(categoryData, function(){
               SOACategoryService.getCategories({referential: referential}).then(function (e) {
                   promise.resolve(e.categories);
               }, function (e) {
                   promise.reject();
               });
            });
          }else {
            SOACategoryService.getCategories({referential: referential}).then(function (e) {
                promise.resolve(e.categories);
            }, function (e) {
                promise.reject();
            });
          }
          return promise.promise;
      };

      $scope.createTags = function () {
          var promise = $q.defer();
          var tagsData = {};
          if ($scope.extItemToCreate && $scope.extItemToCreate.length > 0) {
            for (let i = 0; i < $scope.extItemToCreate.length; i++) {
               tagsData[i] = {
               ['code'] : $scope.extItemToCreate[i] + Math.floor(Math.random() * 1000),
               ['label' + $scope.language] : $scope.extItemToCreate[i]
               };
            }
            TagService.createTag(tagsData, function(){
               TagService.getTags().then(function (e) {
                   promise.resolve(e.tags);
               }, function (e) {
                   promise.reject();
               });
            });
          }else {
            TagService.getTags().then(function (e) {
                promise.resolve(e.tags);
            }, function (e) {
                promise.reject();
            });
          }
          return promise.promise;
      };

      $scope.checkFile = function (file) {
        $scope.extItemToCreate = [];
        $scope.getItems().then(async function(items){

          var requiredFields = [];
          for(var index in $scope.items[tab]) {
            if ($scope.items[tab][index]['required']) {
              requiredFields.push($scope.items[tab][index]['field']);
            }
          }
          if (!file.meta || file.meta.fields.some(rf=> requiredFields.includes(rf)) && file.data.length > 0) {
              if (externalItem) {
                if (externalItem == 'tags') {
                  var tags = [];
                  file.data.forEach(function(list){
                    if (list['tags']) {
                      var tag = list['tags'].toString().split("/");
                      tag.forEach(function(t){
                        tags.push(t.trim());
                      })
                    }
                  });
                  var uniqueLabels = new Set(tags);
                }else{
                  var uniqueLabels = new Set(file.data.map(item => item[externalItem].trim()));
                }

                for (let label of uniqueLabels)
                  if(label && !$scope.actualExternalItems.find(ei=> ei['label' + $scope.language].toLowerCase().trim() === label.toLowerCase().trim())){
                    $scope.extItemToCreate.push(label.trim());
                  }
              }
              for (var i = 0; i < file.data.length; i++) {
                file.data[i].error = '';
                file.data[i].alert = false;

                if (requiredFields.includes('code')) {
                  var codes = items.map(item => item.code.toLowerCase());
                  if (file.data[i]['code'] && codes.includes(file.data[i]['code'].toLowerCase().trim())) {
                      file.data[i].error += gettextCatalog.getString('code is already in use') + "\n";
                      $scope.check = true;
                  }else {
                    codes.push(file.data[i]['code'].toLowerCase());
                  }
                }

                if (requiredFields.includes('match') && file.data[i]['control'] && file.data[i]['match']) {
                  var matches = items.map(item => item.father.toLowerCase() + item.child.toLowerCase());
                  var uuids = $scope.allMeasures.map(item => item.uuid);

                  if (!uuids.includes(file.data[i]['control'].toLowerCase().trim())) {
                    file.data[i]['control'] = '-';
                    file.data[i].error += gettextCatalog.getString('control does not exist') + "\n";
                    $scope.check = true;
                  }
                  if (!uuids.includes(file.data[i]['match'].toLowerCase().trim())) {
                    file.data[i]['match'] = '-';
                    file.data[i].error += gettextCatalog.getString('match does not exist') + "\n";
                    $scope.check = true;
                  }
                  if (matches.includes(file.data[i]['control'].toLowerCase().trim() + file.data[i]['match'].toLowerCase().trim())) {
                      var measure = $scope.allMeasures.filter(measure => measure.uuid == file.data[i]['control'].toLowerCase().trim())
                      file.data[i]['father'] = file.data[i]['control'];
                      file.data[i]['control'] = measure[0].referential['label' + $scope.language] + " : " + measure[0].code + " - " + measure[0]['label' + $scope.language];

                      var measure = $scope.allMeasures.filter(measure => measure.uuid == file.data[i]['match'].toLowerCase().trim())
                      file.data[i]['child'] = file.data[i]['match'];
                      file.data[i]['match'] = measure[0].referential['label' + $scope.language] + " : " + measure[0].code + " - " + measure[0]['label' + $scope.language];
                      file.data[i].error += gettextCatalog.getString('this matching is already in use') + "\n";
                      $scope.check = true;
                  }else {
                    var measure = $scope.allMeasures.filter(measure => measure.uuid == file.data[i]['control'].toLowerCase().trim())
                    if (measure.length > 0) {
                      file.data[i]['father'] = file.data[i]['control'];
                      file.data[i]['control'] = measure[0].referential['label' + $scope.language] + " : " + measure[0].code + " - " + measure[0]['label' + $scope.language];
                    }

                    var measure = $scope.allMeasures.filter(measure => measure.uuid == file.data[i]['match'].toLowerCase().trim())
                    if (measure.length > 0) {
                      file.data[i]['child'] = file.data[i]['match'];
                      file.data[i]['match'] = measure[0].referential['label' + $scope.language] + " : " + measure[0].code + " - " + measure[0]['label' + $scope.language];
                    }
                  }
                }

                for (var j = 0; j < requiredFields.length; j++) {
                  if (!file.data[i][requiredFields[j]]) {
                    file.data[i].error += requiredFields[j] + " " + gettextCatalog.getString('is mandatory') + "\n";
                    $scope.check = true;
                  }
                }
                if (!$scope.check && $scope.extItemToCreate.length > 0 && $scope.extItemToCreate.includes(file.data[i][externalItem])) {
                    file.data[i].alert = true;
                }

              }
              if (!$scope.check && $scope.extItemToCreate.length > 0) {
                var confirm = $mdDialog.confirm()
                    .multiple(true)
                    .title(gettextCatalog.getString('New {{extItemLabel}}',
                            {extItemLabel: extItemLabel}))
                    .textContent(gettextCatalog.getString('Do you want to create {{count}} new {{extItemLabel}} ?',
                                  {count: $scope.extItemToCreate.length, extItemLabel: extItemLabel}) + '\n\r\n\r' +
                                   $scope.extItemToCreate.toString().replace(/,/g,'\n\r'))
                    .theme('light')
                    .ok(gettextCatalog.getString('Create & Import'))
                    .cancel(gettextCatalog.getString('Cancel'));
                $mdDialog.show(confirm).then(function() {
                  $scope.uploadFile();
                });
              }
          } else {
            var alert = $mdDialog.alert()
                .multiple(true)
                .title(gettextCatalog.getString('File error'))
                .textContent(gettextCatalog.getString('Wrong schema'))
                .theme('light')
                .ok(gettextCatalog.getString('Cancel'))
            $mdDialog.show(alert);
            $scope.importData = [];
            $scope.check = true;
          }
        });
        return file.data;
      };

      $scope.uploadFile = async function () {

        var itemsToImport = $scope.importData.length;
        var itemFields= [];
        switch (tab) {
          case 'Threats':
            $scope.getThemes = await $scope.createThemes();
            break;
          case 'Controls':
            itemFields.push('uuid');
            $scope.getCategories = await $scope.createCategories();
            break;
          case 'Operational risks':
            $scope.getTags = await $scope.createTags();
            break;
            case 'Matches':
              itemFields.push('father','child');
              break;
          default:
        }
        var cia = ['c','i','a'];
        for(var index in $scope.items[tab]) {
            itemFields.push($scope.items[tab][index]['field']);
        }

        await $scope.importData.forEach(function(postData){
          var postDataKeys = Object.keys(postData);

          for (let pdk of postDataKeys){
            if(!itemFields.includes(pdk.toLowerCase())){
              delete postData[pdk];
            }
          }
          if (postData['label']) {
            postData['label' + $scope.language] = postData['label'];
            delete postData['label'];
          }
          if (postData['description']) {
            postData['description' + $scope.language] = postData['description'];
            delete postData['description'];
          }
          if (postData['theme']) {
            postData.theme = $scope.getThemes.find(t => t['label' + $scope.language].toLowerCase().trim() === postData.theme.toLowerCase().trim()).id;
          }

          if (tab == 'Threats') {
            for (let i = 0; i < cia.length; i++) {
              if (!postData[cia[i]] || postData[cia[i]] == 0 || postData[cia[i]].toLowerCase() == 'false' ) {
                postData[cia[i]] = false;
              } else {
                postData[cia[i]] = true;
              }
            }
          }
          if (tab == 'Controls') {
            postData.referential = referential;
          }
          if (tab == 'Categories') {
            postData.referential = referential;
          }
          if (postData['category']) {
            postData.category = $scope.getCategories.find(c => c['label' + $scope.language].toLowerCase().trim() === postData.category.toLowerCase().trim()).id;
          }
          if (postData['tags']) {
            var tag = postData.tags.toString().split("/");
            var tagsId = [];
            tag.forEach(function(tag){
              tagsId.push($scope.getTags.find(t => t['label' + $scope.language].toLowerCase().trim() === tag.toLowerCase().trim()).id);
            })
            postData.tags = tagsId;
          }
        });

        $mdDialog.hide($scope.importData);

      };

      $scope.downloadExempleFile = function(){

        var fields = [];
        for(var index in $scope.items[tab]) {
          if ($scope.items[tab][index]['field']) {
            fields.push($scope.items[tab][index]['field']);
          }
        }
        data = encodeURI('data:text/csv;charset=UTF-8,\uFEFF' + fields.join());
        link = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', 'ExampleFile.csv');
        document.body.appendChild(link);
        link.click();
      }

      $scope.toggleGuide = function () {
          $scope.guideVisible = !$scope.guideVisible;
      };

      $scope.cancel = function() {
        $mdDialog.cancel();
      };
    }
})();

(function () {

    angular
        .module('AnrModule')
        .controller('AnrObjectInstanceCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', 'DownloadService', 'TableHelperService', '$http',
            'ModelService', 'ObjlibService', '$stateParams', 'AnrService', '$rootScope', '$timeout', '$location', 'InstanceService',
            'MetadataInstanceService', '$q', '$sce',
            AnrObjectInstanceCtrl
        ]);

    /**
     * ANR > OBJECT INSTANCE
     */
    function AnrObjectInstanceCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, DownloadService,
                                            TableHelperService, $http, ModelService, ObjlibService, $stateParams, AnrService,
                                            $rootScope, $timeout, $location, InstanceService, MetadataInstanceService, $q, $sce) {

        $scope.instance = {};
        $scope.resetSheet(true);
        $scope.resetOpSheet(true);

        $rootScope.anr_selected_instance_id = $stateParams.instId;
        $rootScope.anr_selected_object_id = null;
        $scope.instmode = 'inst';

        var isInstanceLoading = true;
        var tmpCurrentTab = $scope.ToolsAnrService.currentTab;

        $scope.risks = undefined;
        $scope.oprisks = undefined;
        $scope.oprisks_total = 0;

        $scope.updateInstance = function (cb) {
            AnrService.getInstance($scope.model.anr.id, $stateParams.instId).then(function (data) {
                // Filter out C/I/D consequences
                var validCons = [];
                for (var i = 0; i < data.consequences.length; ++i) {
                    if (data.consequences[i].scaleImpactType > 3) {
                        validCons.push(data.consequences[i]);
                    }
                }

                data.consequences = validCons;

                $scope.instance = data;
                if(data.asset.type == 1 && tmpCurrentTab == 2){
                    $scope.ToolsAnrService.currentTab = tmpCurrentTab;
                }
                isInstanceLoading = false;

                $scope.updateInstanceRisks();
                if ($scope.instance.asset.type == 1) {
                    $scope.updateInstanceRisksOp();
                }

                if (cb) {
                    cb();
                }
            });
        };
        $scope.updateInstance();

        $scope.updateInstanceRisks = function () {
            $scope.anr_risks_table_loading = true;

            /*if ($scope.instance.asset.type == 2) {
                $scope.risks_filters.limit = 0;
            }*/

            AnrService.getInstanceRisks($scope.model.anr.id, $scope.instance.id, $scope.risks_filters).then(function(data) {
                if (!$scope.risks || data.risks.length != $scope.risks.length) {
                    $scope.risks_total = data.count;
                    $scope.risks = data.risks; // for the _table_risks.html partial
                } else {
                    // patch up only if we already have a risks table
                    // if this cause a problem, add a flag to updateInstance so that we patch only in the risks
                    // table callback, and do a full refresh otherwise
                    $scope.risks_total = data.count;
                    for (var i = 0; i < $scope.risks.length; ++i) {
                        for (var j in $scope.risks[i]) {
                            $scope.risks[i][j] = data.risks[i][j];
                        }
                    }
                }

                $scope.anr_risks_table_loading = false;
            });

        };

        $scope.updateInstanceRisksOp = function () {
            $scope.anr_risks_op_table_loading = true;

            AnrService.getInstanceRisksOp($scope.model.anr.id, $scope.instance.id, $scope.risks_op_filters).then(function(data) {
                if (!$scope.oprisks || data.length != $scope.oprisks.length) {
                    $scope.oprisks_total = data.count;
                    $scope.oprisks = data.oprisks; // for the _table_risks_op.html partial
                } else {
                    // patch up only if we already have a risks table
                    // if this cause a problem, add a flag to updateInstance so that we patch only in the risks
                    // table callback, and do a full refresh otherwise
                    $scope.oprisks_total = data.count;
                    for (var i = 0; i < $scope.oprisks.length; ++i) {
                        for (var j in $scope.oprisks[i]) {
                            $scope.oprisks[i][j] = data.oprisks[i][j];
                        }
                    }
                }

                $scope.anr_risks_op_table_loading = false;
            });

        };

        $scope.$on('risks-table-filters-changed', function () {
            $scope.updateInstanceRisks();
        });

        $scope.$on('risks-op-table-filters-changed', function () {
            $scope.updateInstanceRisksOp()
        });

        $scope.editInstanceDetails = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AnrService', 'instance', 'scales', 'scaleCommCache', CreateInstanceDialogCtrl],
                templateUrl: 'views/anr/create.instance.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    instance: angular.copy($scope.instance),
                    scales: $scope.scales,
                    scaleCommCache: $scope.scaleCommCache
                }
            })
                .then(function (instance) {
                    if (instance && instance.anr) {
                        $scope.instance_updating = true;
                        AnrService.updateInstance($scope.instance.anr.id, instance, function () {
                            $scope.updateInstance();
                            $scope.instance_updating = false;
                            if ($scope.updateAnrRisksTable) {
                                $scope.updateAnrRisksTable();
                            }
                            if ($scope.updateAnrRisksOpTable) {
                                $scope.updateAnrRisksOpTable();
                            }
                            toastr.success(gettextCatalog.getString("The asset has been edited"), gettextCatalog.getString("Edition successful"));
                        });
                    }
                }, function () {
                  $scope.updateInstance();
                });
        };

        $scope.exportInstance = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'mode', ExportInstanceDialog],
                templateUrl: 'views/anr/export.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    mode: 'instance'
                }
            })
                .then(function (exports) {
                    var cliAnr = '';
                    var method = $http.get;
                    if ($scope.OFFICE_MODE == 'FO') {
                        cliAnr = 'client-';
                        method = $http.post;
                    }
                    method('api/'+cliAnr+'anr/' + $scope.model.anr.id + '/instances/' + $scope.instance.id + '/export', {id: $scope.instance.id, password: exports.password, assessments: exports.assessments, controls: exports.controls, recommendations: exports.recommendations, soas: exports.soas}).then(function (data) {
                        var contentD = data.headers('Content-Disposition'),
                            contentT = data.headers('Content-Type');
                        contentD = contentD.substring(0,contentD.length-1).split('filename="');
                        contentD = contentD[contentD.length-1];
                        if (exports.password == '') {
                            DownloadService.downloadJSON(data.data, contentD);
                        } else {
                            DownloadService.downloadBlob(data.data, contentD, contentT);
                        }
                        toastr.success(gettextCatalog.getString('The asset has been exported successfully.'), gettextCatalog.getString('Export successful'));
                    })
                }, function (reject) {
                  $scope.handleRejectionDialog(reject);
                });
        };

        $scope.contextInstance = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'gettextCatalog', 'MetadataInstanceService', 'instance', contextInstanceDialog],
                templateUrl: 'views/anr/context.instance.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    instance : $scope.instance,
                }
            })
        };

        $scope.detachInstance = function (ev, instance) {
            var onrecord = false;
            if(instance == undefined){
                instance = $scope.instance;
                onrecord = true;
            }
            InstanceService.detach($scope, ev, instance.id, function(){
                $scope.instance.instances.splice($scope.instance.instances.indexOf(instance), 1);
                $scope.updateModel();

                if ($scope.OFFICE_MODE == 'BO') {
                    $location.path('/backoffice/kb/models/' + $scope.model.id);
                } else {
                    $location.path('/client/project/' + $scope.model.anr.id + '/anr');
                }
            }, onrecord);
        };

        $scope.showObjectInLibrary = function (objid) {
            if ($scope.OFFICE_MODE == 'BO') {
                $location.path('/backoffice/kb/models/' + $scope.model.id + '/object/' + objid);
                if ($rootScope.hookUpdateObjlib != undefined) {
                    $rootScope.hookUpdateObjlib();
                }
            } else {
                $location.path('/client/project/' + $scope.model.anr.id + '/anr/object/' + objid);
            }

        };

        $scope.createSpecRiskOp = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'RiskService','$q', CreateSpecRiskOPDialog],
                templateUrl: 'views/anr/create.specriskop.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            }).then(function (risk) {
                risk.instance = $stateParams.instId;
                risk.specific = 1;
                if(typeof risk.risk !== "undefined")
                    risk.risk = risk.risk.id;

                AnrService.createInstanceOpRisk($scope.model.anr.id, risk, function () {
                    toastr.success(gettextCatalog.getString("The specific operational risk has been successfully created"));
                    $scope.updateInstanceRisksOp();
                    if ($scope.updateAnrRisksOpTable) {
                        $scope.updateAnrRisksOpTable();
                    }
                });
            }, function (reject) {
              $scope.handleRejectionDialog(reject);
            });
        }

        $scope.createSpecRisk = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ThreatService', 'VulnService', '$q', CreateSpecRiskDialog],
                templateUrl: 'views/anr/create.specrisk.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            }).then(function (risk) {
                risk.instance = $stateParams.instId;
                risk.specific = 1;
                risk.threat = risk.threat.uuid;
                risk.vulnerability = risk.vulnerability.uuid;
                AnrService.createInstanceRisk($scope.model.anr.id, risk, function () {
                    toastr.success(gettextCatalog.getString("The specific risk has been successfully created"));
                    $scope.updateInstanceRisks();
                    if ($scope.updateAnrRisksTable) {
                        $scope.updateAnrRisksTable();
                    }
                });
            }, function (reject) {
              $scope.handleRejectionDialog(reject);
            });
        }

        $scope.deleteSpecRisk = function (ev, risk) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Delete specific information risk'))
                .textContent(gettextCatalog.getString('The selected specific information risk will be permanently deleted. Are you sure?'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function () {
                AnrService.deleteInstanceRisk($scope.model.anr.id, risk.id, function () {
                    toastr.success(gettextCatalog.getString("The specific information risk has been successfully deleted"));
                    $scope.updateInstanceRisks();
                    if ($scope.updateAnrRisksTable) {
                        $scope.updateAnrRisksTable();
                    }
                });
            }, function () {
                // Cancel
            })
        }

        $scope.deleteSpecOpRisk = function (ev, risk) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Delete specific operational risk'))
                .textContent(gettextCatalog.getString('The selected specific operational risk will be permanently deleted. Are you sure?'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function () {
                AnrService.deleteInstanceOpRisk($scope.model.anr.id, risk.id, function () {
                    toastr.success(gettextCatalog.getString("The specific operational risk has been successfully deleted"));
                    $scope.updateInstanceRisksOp();
                    if ($scope.updateAnrRisksOpTable) {
                        $scope.updateAnrRisksOpTable();
                    }
                });
            }, function () {
                // Cancel
            })
        }

        $scope.getEveryScaleComm = function (instance, letter) {
            var keys = Object.keys($scope.scaleCommCache);
            var output = '<table><tbody>';

            for (var i = 0; i < keys.length; ++i) {
                var key = keys[i];
                if (key < 3) {
                    continue;
                }

                var scaleType = $scope.scales_types[(letter == 'c' ? 0 : (letter == 'i' ? 1 : 2))];
                var scaleComm = $scope.scaleCommCache[key];

                if (scaleType && !scaleType.isHidden) {
                    for (var j = 0; j < instance.consequences.length; ++j) {
                        var cons = instance.consequences[j];

                        if (cons.scaleImpactType == key && cons[letter + '_risk'] != -1) {
                            output = output + "<tr><td class='txtright bold texttop align-top' style='vertical-align: top'>" + $scope._langField(cons,'scaleImpactTypeDescription') + "</td> <td class='bold md-padding-left md-padding-right' style='vertical-align: top'>" + cons[letter + '_risk'] + "</td> <td>" + scaleComm[cons[letter + '_risk']] + '</td></tr>';
                            break;
                        }
                    }

                }
            }

            return $sce.trustAsHtml(output + '</tbody></table>');
        };

        $scope.$on('instance-moved', function (unused, instance_id) {
            $scope.updateInstance();
        })

        $scope.$on('object-instancied', function () {
            $scope.updateInstance();
        })

        $scope.$on('risks-table-edited', function () {
            $scope.updateInstance();
        });

        $scope.$on('scales-impacts-type-changed', function () {
            $scope.updateInstance();
        });

        $scope.$on('scale-changed', function () {
            $scope.updateInstance(function () {
                if ($scope.sheet_risk) {
                    $scope.openRiskSheet($scope.sheet_risk);
                }
            })
        });
    }

    function ExportInstanceDialog($scope, $mdDialog, mode) {
        $scope.mode = mode;
        $scope.exportData = {
            password: '',
            simple_mode: true,
            assessments: 0,
            controls: true,
            recommendations: true,
            soas: true
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.exportData);
        };
    }


    function contextInstanceDialog($scope, $mdDialog, gettextCatalog, MetadataInstanceService, instance) {
        $scope.languageCode = $scope.getLanguageCode($scope.getAnrLanguage());
        updateMetadatas();

        $scope.updateInstanceMetadata = function(metadata, comment) {
            if (metadata.instanceMetadata.id) {
                MetadataInstanceService.updateInstanceMetadata(instance.id,metadata.instanceMetadata);
            } else {
                metadata.instanceMetadata = {
                    [$scope.languageCode] : comment
                };
                MetadataInstanceService.createIntanceMetadata({instId: instance.id, metadata: [metadata]});
            }
        }

        $scope.deleteMetadata = function (ev, metadata) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the asset context field?'))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .multiple(true)
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                MetadataInstanceService.deleteMetadata(
                    metadata.id,
                    null,
                    function(){
                        updateMetadatas();
                    }
                );
            });
        }

        $scope.addMetadata = function(ev) {
            let fieldMetadata = $mdDialog.prompt()
                .title(gettextCatalog.getString('Field label'))
                .placeholder(gettextCatalog.getString('Label'))
                .ariaLabel(gettextCatalog.getString('Field label'))
                .theme('light')
                .targetEvent(ev)
                .required(true)
                .ok(gettextCatalog.getString('Create'))
                .cancel(gettextCatalog.getString('Cancel'));


            $mdDialog.show(
                fieldMetadata
                .multiple(true)
            )
            .then(function (fieldMetadata) {
                metadatas = {
                    [$scope.languageCode] : fieldMetadata
                };
                MetadataInstanceService.createMetadata(
                    [metadatas],
                    function(){
                        updateMetadatas();
                    }
                );
            }, function (reject) {
              $scope.handleRejectionDialog(reject);
            });
        }

        $scope.editMetadata = function(ev,metadata) {
            let fieldMetadata = $mdDialog.prompt()
                .title(gettextCatalog.getString('Field label'))
                .placeholder(gettextCatalog.getString('Label'))
                .ariaLabel(gettextCatalog.getString('Field label'))
                .theme('light')
                .targetEvent(ev)
                .required(true)
                .ok(gettextCatalog.getString('Save'))
                .cancel(gettextCatalog.getString('Cancel'));


            $mdDialog.show(
                fieldMetadata
                .multiple(true)
            )
            .then(function (fieldMetadata) {
                metadata[$scope.languageCode] = fieldMetadata;
                MetadataInstanceService.updateMetadata(
                    null,
                    metadata,
                    function(){
                        updateMetadatas();
                    }
                )
            }, function (reject) {
              $scope.handleRejectionDialog(reject);
            });
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        function updateMetadatas(){
            MetadataInstanceService.getInstanceMetadatas({instId:instance.id})
                .then(function(data){
                    $scope.metadatas = data.data;
                }
            );
        }
    }

    function CreateInstanceDialogCtrl($scope, $mdDialog, toastr, gettextCatalog, AnrService, instance, scales, scaleCommCache) {
        $scope.instance = instance;
        $scope.scales = scales;
        $scope.scaleCommCache = scaleCommCache;
        $scope.tooltipScale = [];

        for (var i = 1; i <= Object.keys(scaleCommCache).length; i++) {
            $scope.tooltipScale[i] = '';
            for (var j = $scope.scales.impacts.min; j <= $scope.scales.impacts.max; j++) {
              $scope.tooltipScale[i] += j + ' : ' + scaleCommCache[i][j] + "\n";
            }
        }

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.create = function () {
            $mdDialog.hide($scope.instance);
        }

        $scope.setConsequenceVisibility = function (id, visible) {
            AnrService.patchInstanceConsequence($scope.instance.anr.id, id, {isHidden: visible ? 0 : 1}, function () {
                for (var i = 0; i < $scope.instance.consequences.length; ++i) {
                    if ($scope.instance.consequences[i].id == id) {
                        $scope.instance.consequences[i]['c_risk'] = -1;//pour le recalcul
                        $scope.calculeImpact('c');
                        $scope.instance.consequences[i]['i_risk'] = -1;//pour le recalcul
                        $scope.calculeImpact('i');
                        $scope.instance.consequences[i]['d_risk'] = -1;//pour le recalcul
                        $scope.calculeImpact('d');
                        $scope.instance.consequences[i].isHidden = !visible;
                        toastr.success(gettextCatalog.getString("The CID values have been successfully hidden, the impact has been re-evaluated"));
                        break;
                    }
                }
            });
        };

        $scope.calculeImpact = function(type){
            var values = [];
            for(i=0; i< $scope.instance.consequences.length; i++){
                var cons = $scope.instance.consequences[i];
                if( ! cons.is_hidden ){
                    values.push(parseInt(cons[type+'_risk']));
                }
            }

            return $scope.instance[type] = Math.max.apply(null, values);
        }
    }

    function CreateSpecRiskOPDialog($scope, $mdDialog, RiskService, $q) {
        RiskService.getRisks({limit: 0}).then(function (data) {
            $scope.risks = data.risks;
        });

        $scope.create = function () {
            $mdDialog.hide($scope.specrisk);
        }

        $scope.selectedRiskItemChange = function (item) {
            if (item) {
                $scope.specrisk.threat = item;
              }
        }

        $scope.queryRiskSearch = function (query) {
            var promise = $q.defer();
            RiskService.getRisks({filter: query}).then(function (e) {
                promise.resolve(e.risks);
              }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    }

    function CreateSpecRiskDialog($scope, $mdDialog, ThreatService, VulnService, $q) {
        ThreatService.getThreats({limit: 0}).then(function (data) {
            $scope.threats = data.threats;
        });

        VulnService.getVulns({limit: 0}).then(function (data) {
            $scope.vulns = data.vulnerabilities;
        });

        $scope.create = function () {
            $mdDialog.hide($scope.specrisk);
        }

        $scope.selectedVulnItemChange = function (item) {
            if (item) {
                $scope.specrisk.vulnerability = item;
              }
        }
        $scope.selectedThreatItemChange = function (item) {
            if (item) {
                $scope.specrisk.threat = item;
              }
        }

        $scope.queryVulnSearch = function (query) {
            var promise = $q.defer();
            VulnService.getVulns({filter: query}).then(function (e) {
                promise.resolve(e.vulnerabilities);
              }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };
        $scope.queryThreatSearch = function (query) {
            var promise = $q.defer();
            ThreatService.getThreats({filter: query, status: 1}).then(function (e) {
                promise.resolve(e.threats);
              }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    }
})();

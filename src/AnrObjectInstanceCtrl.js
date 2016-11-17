(function () {

    angular
        .module('AnrModule')
        .controller('AnrObjectInstanceCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', 'DownloadService', 'TableHelperService', '$http',
            'ModelService', 'ObjlibService', '$stateParams', 'AnrService', '$rootScope', '$timeout', '$location', 'InstanceService', '$q',
            AnrObjectInstanceCtrl
        ]);

    /**
     * ANR > OBJECT INSTANCE
     */
    function AnrObjectInstanceCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, DownloadService,
                                            TableHelperService, $http, ModelService, ObjlibService, $stateParams, AnrService,
                                            $rootScope, $timeout, $location, InstanceService, $q) {

        $scope.instance = {};
        $scope.resetSheet();

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

                $scope.oprisks = [];

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

            if ($scope.instance.asset.type == 2) {
                $scope.risks_filters.limit = 0;
            }

            AnrService.getInstanceRisks($scope.model.anr.id, $scope.instance.id, $scope.risks_filters).then(function(data) {
                if (!$scope.risks || data.length != $scope.risks.length) {
                    $scope.risks_total = data.count;
                    $scope.risks = data.risks; // for the _table_risks.html partial
                } else {
                    // patch up only if we already have a risks table
                    // if this cause a problem, add a flag to updateInstance so that we patch only in the risks
                    // table callback, and do a full refresh otherwise
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

        $scope.editInstanceDetails = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AnrService', 'instance', 'scales', 'scaleCommCache', CreateInstanceDialogCtrl],
                templateUrl: '/views/anr/create.instance.html',
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
                            toastr.success(gettextCatalog.getString("The instance details have been updated"), gettextCatalog.getString("Update successful"));
                        });
                    }
                });
        };

        $scope.exportInstance = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'mode', ExportInstanceDialog],
                templateUrl: '/views/dialogs/export.objlibs.html',
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
                    $http.get('/api/anr/' + $scope.model.anr.id + '/objects/' + $scope.instance.id + '/export', {id: $scope.instance.id, password: exports.password, assessments: exports.assessments}).then(function (data) {
                        DownloadService.downloadBlob(data.data, 'instance.bin');
                        toastr.success(gettextCatalog.getString('The instance has been exported successfully.'), gettextCatalog.getString('Export successful'));
                    })
                });
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
            }, onrecord);
        };

        $scope.showObjectInLibrary = function (objid) {
            $location.path('/backoffice/kb/models/'+$scope.model.id+'/object/'+objid);
            if($rootScope.hookUpdateObjlib != undefined){
                $rootScope.hookUpdateObjlib();
            }

        };

        $scope.$on('instance-moved', function (unused, instance_id) {
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
        $scope.export = {
            password: null
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.export);
        };

    }

    function CreateInstanceDialogCtrl($scope, $mdDialog, AnrService, instance, scales, scaleCommCache) {
        $scope.instance = instance;
        $scope.scales = scales;
        $scope.scaleCommCache = scaleCommCache;

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

})();

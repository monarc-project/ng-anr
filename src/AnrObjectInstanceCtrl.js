(function () {

    angular
        .module('AnrModule')
        .controller('AnrObjectInstanceCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', 'TableHelperService',
            'ModelService', 'ObjlibService', '$stateParams', 'AnrService', '$rootScope', '$timeout', '$location', 'InstanceService',
            AnrObjectInstanceCtrl
        ]);

    /**
     * ANR > OBJECT INSTANCE
     */
    function AnrObjectInstanceCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state,
                                            TableHelperService, ModelService, ObjlibService, $stateParams, AnrService,
                                            $rootScope, $timeout, $location, InstanceService) {

        $scope.instance = {};

        $rootScope.anr_selected_instance_id = $stateParams.instId;
        $rootScope.anr_selected_object_id = null;
        $scope.instmode = 'inst';

        var isInstanceLoading = true;
        var tmpCurrentTab = $scope.ToolsAnrService.currentTab;

        $scope.updateInstance = function () {
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
                if($scope.instance.asset.type == 1){
                    $scope.oprisks = $scope.instance.oprisks;//for the _table_risks_op.html partial
                }
            });
        };
        $scope.updateInstance();

        $scope.$watch('instance.risks', function (newValue, oldValue) {
            if (!isInstanceLoading && oldValue !== undefined) {
                for (var i = 0; i < newValue.length; ++i) {
                    var newItem = newValue[i];
                    var oldItem = oldValue[i];

                    if (!angular.equals(newItem, oldItem)) {
                        // This risk changed, update it
                        AnrService.updateInstanceRisk($scope.model.anr.id, newItem.id, newItem);
                    }
                }

                // Update the whole table
                $timeout($scope.updateInstance, 500);
            }
        }, true);

        $scope.$watch('instance.oprisks', function (newValue, oldValue) {
            if (!isInstanceLoading && oldValue !== undefined) {
                for (var i = 0; i < newValue.length; ++i) {
                    var newItem = newValue[i];
                    var oldItem = oldValue[i];

                    if (!angular.equals(newItem, oldItem)) {
                        // This OP risk changed, update it
                        AnrService.updateInstanceOpRisk($scope.model.anr.id, newItem.id, newItem);
                    }
                }

                // Update the whole table
                $timeout($scope.updateInstance, 500);
            }
        }, true);


        $scope.openRiskSheet = function (risk) {
            $scope.sheet_risk = risk;

            var reducAmount = [];
            if($scope.scales.vulns != undefined){
                for(var i = $scope.scales.vulns.min; i <= $scope.scales.vulns.max; i++){
                    reducAmount.push(i);
                    if(risk.vulnerabilityRate != '-1' && i == risk.vulnerabilityRate){
                        break;
                    }
                }
            }
            $scope.reducAmount = reducAmount;
        };

        $scope.resetSheet = function () {
            $scope.sheet_risk = undefined;
        };


        $scope.openOpRiskSheet = function (risk) {
            $scope.opsheet_risk = risk;
        };

        $scope.resetOpSheet = function () {
            $scope.opsheet_risk = undefined;
        };


        $scope.editInstanceDetails = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AnrService', 'instance', CreateInstanceDialogCtrl],
                templateUrl: '/views/anr/create.instance.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: true,
                fullscreen: useFullScreen,
                locals: {
                    instance: $scope.instance
                }
            })
                .then(function (instance) {
                    if (instance && instance.anr) {
                        AnrService.updateInstance($scope.instance.anr.id, instance, function () {
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
                clickOutsideToClose: true,
                fullscreen: useFullScreen,
                locals: {
                    mode: 'instance'
                }
            })
                .then(function (exports) {
                    $http.post('/api/instances-export', {id: $scope.instance.id, password: exports.password, assessments: exports.assessments}).then(function (data) {
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
            }, onrecord);
        };



        $scope.saveRiskSheet = function (sheet) {
            AnrService.updateInstanceRisk($scope.instance.anr.id, sheet.id, sheet, function () {
                toastr.success(gettextCatalog.getString('The risk sheet changes have been saved successfully'), gettextCatalog.getString('Save successful'));
            })
        };

        $scope.saveOpRiskSheet = function (sheet) {
            AnrService.updateInstanceOpRisk($scope.instance.anr.id, sheet.id, sheet, function () {
                toastr.success(gettextCatalog.getString('The operational risk sheet changes have been saved successfully'), gettextCatalog.getString('Save successful'));
            })
        };

        $scope.showObjectInLibrary = function (objid) {
            $location.path('/backoffice/kb/models/'+$scope.model.id+'/object/'+objid);
            if($rootScope.hookUpdateObjlib != undefined){
                $rootScope.hookUpdateObjlib();
            }

        }
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

    function CreateInstanceDialogCtrl($scope, $mdDialog, AnrService, instance) {
        $scope.instance = instance;

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

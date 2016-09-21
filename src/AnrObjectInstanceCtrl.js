(function () {

    angular
        .module('AnrModule')
        .controller('AnrObjectInstanceCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', 'TableHelperService',
            'ModelService', 'ObjlibService', '$stateParams', 'AnrService', '$rootScope', '$timeout',
            AnrObjectInstanceCtrl
        ]);

    /**
     * ANR > OBJECT INSTANCE
     */
    function AnrObjectInstanceCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state,
                                            TableHelperService, ModelService, ObjlibService, $stateParams, AnrService,
                                            $rootScope, $timeout) {

        $scope.instance = {};

        $rootScope.anr_selected_instance_id = $stateParams.instId;


        var isInstanceLoading = true;

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
                isInstanceLoading = false;
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

        $scope.detachInstance = function (ev) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to detach this instance?'))
                .textContent(gettextCatalog.getString('This instance and all its children will be removed from the risk analysis. This operation cannot be undone.'))
                .ariaLabel('Detach instance')
                .targetEvent(ev)
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                AnrService.deleteInstance($scope.model.anr.id, $stateParams.instId, function () {
                    $scope.updateInstances();
                });
                $state.transitionTo('main.kb_mgmt.models.details', {modelId: $scope.model.id});
            });
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
    }

})();
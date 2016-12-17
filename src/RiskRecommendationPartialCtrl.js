(function () {

    angular
        .module('AnrModule')
        .controller('RiskRecommendationPartialCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', 'gettextCatalog', '$state', '$q', '$attrs',
            'ClientRecommandationService',
            RiskRecommendationPartialCtrl
        ]);

    function RiskRecommendationPartialCtrl($scope, toastr, $mdMedia, $mdDialog, $stateParams, gettextCatalog, $state,
                                     $q, $attrs, ClientRecommandationService) {
        var riskMode = $attrs.monarcMode; // information / operational
        var isOpRiskMode = (riskMode == 'operational');
        var riskId = (isOpRiskMode ? $scope.opsheet_risk.id : $scope.sheet_risk.id);

        $scope.createRecommandation = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', CreateRecommandationDialog],
                templateUrl: '/views/anr/create.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            }).then(function (rec) {
                rec.anr = $scope.model.anr.id;
                ClientRecommandationService.createRecommandation(rec, function (data) {
                    toastr.success(gettextCatalog.getString("The recommendation has been created successfully"));

                    ClientRecommandationService.attachToRisk($scope.model.anr.id, data.id, riskId, isOpRiskMode,
                        function () {
                            toastr.success(gettextCatalog.getString("The recommandation has been attached to this risk."));
                            updateRecommandations();
                        });
                })
            });
        }

        $scope.editRecommandation = function (ev, rec) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            var srcRec = rec;

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'rec', CreateRecommandationDialog],
                templateUrl: '/views/anr/create.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    rec: angular.copy(rec.recommandation)
                }
            }).then(function (rec) {
                if (rec === false) {
                    ClientRecommandationService.deleteRecommandation({anr: $scope.model.anr.id, id: srcRec.recommandation.id}, function () {
                        toastr.success(gettextCatalog.getString("The recommendation has been deleted successfully"));
                        updateRecommandations();
                    });
                } else {
                    rec.anr = $scope.model.anr.id;
                    ClientRecommandationService.updateRecommandation(rec, function () {
                        toastr.success(gettextCatalog.getString("The recommendation has been updated successfully"));
                        updateRecommandations();
                    });
                }
            });
        }

        $scope.queryRecSearch = function (query) {
            var q = $q.defer();
            ClientRecommandationService.getRecommandations({anr: $scope.model.anr.id, filter: query}).then(function (data) {
                q.resolve(data.recommandations);
            }, function () {
                q.reject();
            });

            return q.promise;
        };

        $scope.rec_edit = {
            rec: null
        };

        $scope.attachRecommandation = function () {
            ClientRecommandationService.attachToRisk($scope.model.anr.id, $scope.rec_edit.rec.id, riskId, isOpRiskMode,
                function () {
                    toastr.success(gettextCatalog.getString("The recommandation has been attached to this risk."));
                    $scope.rec_edit.rec = null;
                    updateRecommandations();
                });
        };

        $scope.detachRecommandation = function (ev, recommandation) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to detach recommendation "{{ code }}"?',
                    {code: recommandation.recommandation.code}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                ClientRecommandationService.detachFromRisk($scope.model.anr.id, recommandation.id,
                    function () {
                        updateRecommandations();
                        toastr.success(gettextCatalog.getString('The recommendation has been detached.'),
                            gettextCatalog.getString('Operation successful'));
                    }
                );
            });
        }

        $scope.attachMeasureToRecommandation = function (ev, recommandation) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'MeasureService', MeasureRecommandationAttachDialog],
                templateUrl: '/views/anr/create.recommandation-measure.html',
                preserveScope: false,
                targetEvent: ev,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            }).then(function (measure_id) {
                ClientRecommandationService.attachMeasureToRecommandation($scope.model.anr.id, recommandation.recommandation.id, measure_id, function () {
                    toastr.success(gettextCatalog.getString("Measure attached to recommendation"));
                    updateRecommandations();
                });
            });
        };

        $scope.detachMeasureFromRecommandation = function (ev, recommandation, measure) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to detach measure {{measure}} recommendation "{{ code }}"?',
                    {measure: measure.code, code: recommandation.recommandation.code}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                ClientRecommandationService.detachMeasureFromRecommandation($scope.model.anr.id, measure.id,
                    function () {
                        updateRecommandations();
                        toastr.success(gettextCatalog.getString('The measure has been detached.'),
                            gettextCatalog.getString('Operation successful'));
                    }
                );
            });
        }

        var updateRecommandations = function () {
            ClientRecommandationService.getRiskRecommandations($scope.model.anr.id, riskId, isOpRiskMode).then(function (data) {
                $scope.recommandations = data['recommandations-risks'];
            })
        };

        updateRecommandations();
    }


    function CreateRecommandationDialog($scope, $mdDialog, rec) {
        $scope.recommandation = rec;
        $scope.deleteConfirmation = false;

        $scope.delete = function () {
            $scope.deleteConfirmation = true;
        };

        $scope.deleteConfirm = function () {
            $mdDialog.hide(false);
        };

        $scope.create = function () {
            $mdDialog.hide($scope.recommandation);
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    }

    function MeasureRecommandationAttachDialog($scope, $mdDialog, $q, MeasureService) {
        $scope.rec = {
            measure: null
        };

        $scope.queryMeasureSearch = function (query) {
            var promise = $q.defer();
            MeasureService.getMeasures({filter: query}).then(function (e) {
                promise.resolve(e.measures);
            }, function (e) {
                promise.reject(e);
            });

            return promise.promise;
        };

        $scope.create = function () {
            if ($scope.rec.measure) {
                $mdDialog.hide($scope.rec.measure.id);
            }
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        }
    };

})();

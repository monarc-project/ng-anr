(function () {

    angular
        .module('AnrModule')
        .controller('RiskRecommendationPartialCtrl', [
            '$scope', '$rootScope', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', 'gettextCatalog', '$state', '$q', '$attrs',
            '$timeout', 'ClientRecommandationService',
            RiskRecommendationPartialCtrl
        ]);

    function RiskRecommendationPartialCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, $stateParams, gettextCatalog,
                                            $state, $q, $attrs, $timeout, ClientRecommandationService) {
        var riskMode = $attrs.monarcMode; // information / operational
        var isOpRiskMode = (riskMode == 'operational');
        var riskId = (isOpRiskMode ? $stateParams.riskopId : $stateParams.riskId);
        var updateDebounce = false;

        $scope.createRecommandation = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ClientRecommandationService', 'gettextCatalog', 'toastr', '$q','anrId', CreateRecommandationDialog],
                templateUrl: 'views/anr/create.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    anrId: $scope.model.anr.id
                }
            }).then(function (rec) {
                rec.recommandation.anr = $scope.model.anr.id;
                ClientRecommandationService.createRecommandation(rec.recommandation, function (data) {
                    toastr.success(gettextCatalog.getString("The recommendation has been created successfully"));

                    ClientRecommandationService.attachToRisk($scope.model.anr.id, data.id, riskId, isOpRiskMode,
                        function () {
                            toastr.success(gettextCatalog.getString("The recommendation has been attached to this risk."));
                            updateRecommandations();
                        });
                })
            });
        }

        $scope.editRecommandation = function (ev, rec) {
            ev.preventDefault();
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ClientRecommandationService', 'gettextCatalog', 'toastr', '$q', 'anrId',
                            'rec' , 'detachRecommandation', 'copyRecommandation', 'deleteRecommandation', 'rwd', CreateRecommandationDialog],
                templateUrl: 'views/anr/create.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    ClientRecommandationService: ClientRecommandationService,
                    rec: rec,
                    anrId: $scope.model.anr.id,
                    detachRecommandation: $scope.detachRecommandation,
                    copyRecommandation: $scope.copyRecommandation,
                    deleteRecommandation: $scope.deleteRecommandation,
                    rwd: $scope.model.anr.rwd
                }
            }).then(function () {
                rec.recommandation.anr = $scope.model.anr.id;
                ClientRecommandationService.updateRecommandation(rec.recommandation, function () {
                    toastr.success(gettextCatalog.getString("The recommendation has been edited successfully"));
                    updateRecommandations();
                });
            });
        }

        $scope.queryRecSearch = function (query) {
            var q = $q.defer();
            ClientRecommandationService.getRecommandations({anr: $scope.model.anr.id, order: 'code', filter: query}).then(function (data) {
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
            ClientRecommandationService.attachToRisk($scope.model.anr.id, $scope.rec_edit.rec.uuid, riskId, isOpRiskMode,
                function () {
                    toastr.success(gettextCatalog.getString("The recommendation has been attached to this risk."));
                    $scope.rec_edit.rec = null;
                    updateRecommandations();
                });
        };

        $scope.detachRecommandation = function (ev, recommandation) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to detach recommendation ?',
                    {code: recommandation.recommandation.code}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
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
            },function(){
                $scope.editRecommandation(ev,recommandation);
            });
        }

        $scope.copyRecommandation = function (ev, recommandation) {
            reco = recommandation.recommandation ? recommandation.recommandation : recommandation;
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to copy the recommendation?',
                    {code: reco.code}))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Copy'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function() {
                reco.anr = $scope.model.anr.id;
                ClientRecommandationService.copyRecommandation(reco, function (data) {
                    toastr.success(gettextCatalog.getString("The recommendation has been copied successfully"));

                    ClientRecommandationService.attachToRisk($scope.model.anr.id, data.id, riskId, isOpRiskMode,
                        function () {
                            updateRecommandations();
                            toastr.success(gettextCatalog.getString("The recommendation has been attached to this risk."));
                        });
                })
            },function(){
                $scope.editRecommandation(ev,recommandation);
            });
        }

        $scope.deleteRecommandation = function(ev, recommandation){
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete recommendation?',
                    {code: recommandation.recommandation.code}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                ClientRecommandationService.deleteRecommandation({anr: $scope.model.anr.id, id: recommandation.recommandation.uuid},
                    function () {
                        updateRecommandations();
                        toastr.success(gettextCatalog.getString('The recommendation has been deleted successfully'),
                            gettextCatalog.getString('Operation successful'));
                    }
                );
            },function(){
                $scope.editRecommandation(ev,recommandation);
            });
        }

        var updateRecommandations = function () {
            // We need to debounce the update here as the view uses twice the controller. The data is shared
            // through the broadcast event, but we have no way to know which controller will take care of the actual
            // API request. The first one will "lock" updateDebounce in the scope, and the other one will skip
            // the request.
            if (!$rootScope.updateDebounce) {
                $rootScope.updateDebounce = true;

                ClientRecommandationService.getRiskRecommandations($scope.model.anr.id, riskId, isOpRiskMode).then(function (data) {
                    $scope.recommandations = data['recommandations-risks'];
                    $rootScope.$broadcast('recommandations-loaded', $scope.recommandations);
                    $timeout(function () {
                        $rootScope.updateDebounce = false;
                    })
                })
            }
        };

        $rootScope.$on('recommandations-loaded', function (ev, recs) {
            $scope.recommandations = recs;
        })

        $timeout(function () {
            updateRecommandations();
        })

    }

    function CreateRecommandationDialog($scope, $mdDialog, ClientRecommandationService, gettextCatalog, toastr, $q, anrId,
                                        rec, detachRecommandation, copyRecommandation, deleteRecommandation, rwd) {
        $scope.language = $scope.getAnrLanguage();
        $scope.recommendationSet = null;
        $scope.recommandation = rec;
        $scope.deleteConfirmation = false;
        $scope.detachRecommandation = detachRecommandation;
        $scope.copyRecommandation = copyRecommandation;
        $scope.deleteRecommandation = deleteRecommandation;
        $scope.isAnrReadOnly = !rwd;

        $scope.loadOptions = function(ev, anrID) {
            ClientRecommandationService.getRecommandations({anr: anrId}).then(function (data) {
                $scope.options = data.recommandations;
            });
            return $scope.options;
        };
        $scope.queryRecommendationSetSearch = function (query) {
            var promise = $q.defer();
              ClientRecommandationService.getRecommandationsSets({filter: query, anr: anrId }).then(function (data) {
                promise.resolve(data['recommandations-sets']);
            }, function () {
                promise.reject();
            });
            return promise.promise;
        };

        $scope.selectedRecommendationSetItemChange = function (item) {
            $scope.recommendationSet = item;
        }

        $scope.createNewRecommendationSet = function (ev, recommendationSetlabel) {
          var recommendationSet = {};
          recommendationSet['anr'] = anrId;
          for (var i = 1; i <=4; i++) {
            recommendationSet['label' + i] =  recommendationSetlabel;
          }

          ClientRecommandationService.createRecommandationSet(recommendationSet,
            function (status) {
              recommendationSet.uuid = status.id;
              $scope.selectedRecommendationSetItemChange(recommendationSet);
              toastr.success(gettextCatalog.getString('The recommendation set has been created successfully.'), gettextCatalog.getString('Creation successful'));
            }
          );
        };

        $scope.setSelectedRecommendation = function(ev, selectedRec) {
            if (selectedRec !== undefined) {
                $scope.recommandation = selectedRec;
                $scope.recommandation['recommandation'] = {};
                $scope.recommandation['recommandation']['code'] = selectedRec.code;
                $scope.recommandation['recommandation']['importance'] = selectedRec.importance;
                $scope.recommandation['recommandation']['description'] = selectedRec.description;
            }
        };

        $scope.delete = function () {
            $scope.deleteConfirmation = true;
        };

        $scope.deleteConfirm = function () {
            $mdDialog.hide(false);
        };

        $scope.create = function () {
            if ($scope.recommendationSet == null) {
                $scope.recommendationSet = $scope.recommandation.recommandation.recommandationSet;
            }
            $scope.recommandation['recommandation']['recommandationSet'] = $scope.recommendationSet.uuid;
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

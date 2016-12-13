(function () {

    angular
        .module('AnrModule')
        .controller('AnrRisksPlanCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', 'TreatmentPlanService',
            'ClientRecommandationService', '$q',
            AnrRisksPlanCtrl
        ]);

    /**
     * ANR > RISKS PLAN PROCESSING
     */
    function AnrRisksPlanCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, TreatmentPlanService,
                              ClientRecommandationService, $q) {
        TreatmentPlanService.getTreatmentPlans({anr: $scope.model.anr.id}).then(function (data) {
            $scope.recommendations = data['recommandations-risks'];
        });

        $scope.onTableEdited = function (model, name) {
            var promise = $q.defer();
            
            var params = {
                anr: $scope.model.anr.id,
                id: model.id,
            };

            params[name] = model[name];

            ClientRecommandationService.updateRecommandation(params, function () {
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        };
    }

})();

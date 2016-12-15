(function () {

    angular
        .module('AnrModule')
        .controller('AnrRisksPlanHistoryCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', 'gettextCatalog', '$state', 'TreatmentPlanService',
            'ClientRecommandationService', '$q',
            AnrRisksPlanHistoryCtrl
        ]);

    /**
     * ANR > RISKS PLAN PROCESSING > HISTORY
     */
    function AnrRisksPlanHistoryCtrl($scope, toastr, $mdMedia, $mdDialog, $stateParams, gettextCatalog, $state,
                                   TreatmentPlanService, ClientRecommandationService, $q) {

        $scope.backToList = function () {
            $state.transitionTo('main.project.anr.risksplan', {modelId: $stateParams.modelId});
        };

    }

})();

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

        $scope.formatDate = function (param) {
            if (param != null) {
                return param.substr(0, 10);
            }
        };

        $scope.treatmentStr = function (treatment) {
            switch (parseInt(treatment)) {
                case 1: return 'Reduction';
                case 2: return 'Denied';
                case 3: return 'Accepted';
                case 4: return 'Shared';
                default: return 'Not processed';
            }
        };

        ClientRecommandationService.getRecommandationHistory($stateParams.modelId).then(function (data) {
            $scope.history = data['recommandations-historics'];
                                
        })
                
                
    }

})();


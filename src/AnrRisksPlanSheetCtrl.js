(function () {

    angular
        .module('AnrModule')
        .controller('AnrRisksPlanSheetCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', 'gettextCatalog', '$state', 'TreatmentPlanService',
            'ClientRecommandationService', '$q',
            AnrRisksPlanSheetCtrl
        ]);

    /**
     * ANR > RISKS PLAN PROCESSING
     */
    function AnrRisksPlanSheetCtrl($scope, toastr, $mdMedia, $mdDialog, $stateParams, gettextCatalog, $state,
                                   TreatmentPlanService, ClientRecommandationService, $q) {

        $scope.backToList = function () {
            $state.transitionTo('main.project.anr.risksplan', {modelId: $stateParams.modelId});
        };

        $scope.validate = function (ev, measure) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'recommendation', 'measure', ValidateMeasureDialog],
                templateUrl: '/views/anr/validate.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    recommendation: $scope.rec,
                    measure: measure
                }
            }).then(function (exports) {

            });
        };

    }


    function ValidateMeasureDialog($scope, $mdDialog, recommendation, measure) {
        $scope.create = function () {
            $mdDialog.hide($scope.valid);
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        }
    }

})();

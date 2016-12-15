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

        ClientRecommandationService.getRecommandation($stateParams.modelId, $stateParams.recId).then(function (data) {
            $scope.rec = data;
        });
        ClientRecommandationService.getRecommandationRisks($stateParams.modelId, $stateParams.recId).then(function (data) {
            $scope.risks = data['recommandations-risks'];
        })
        
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

        $scope.onTableEdited = function (field, name) {
            var params = {};
            params[name] = field[name];

            ClientRecommandationService.updateRecommandationRisk($scope.model.anr.id, field.id, params, function () {

            });
            console.log(field);
            console.log(name);
            return true;
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

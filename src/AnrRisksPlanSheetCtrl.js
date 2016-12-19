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

        $scope.rec_risks = [];

        var updateRecs = function () {
            ClientRecommandationService.getRecommandation($stateParams.modelId, $stateParams.recId).then(function (data) {
                $scope.rec = data;
            });
            ClientRecommandationService.getRecommandationRisks($stateParams.modelId, $stateParams.recId).then(function (data) {
                $scope.rec_risks = data['recommandations-risks'];
            })
        }

        updateRecs();
        
        $scope.backToList = function () {
            $state.transitionTo('main.project.anr.risksplan', {modelId: $stateParams.modelId});
        };

        $scope.validate = function (ev, risk) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'recommendation', 'risk', ValidateMeasureDialog],
                templateUrl: '/views/anr/validate.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    recommendation: $scope.rec,
                    risk: risk
                }
            }).then(function (impl) {
                ClientRecommandationService.validateRecommandationRisk($scope.model.anr.id, risk.id, impl, function () {
                    toastr.success(gettextCatalog.getString("The recommendation has been successfully validated."));
                    updateRecs();
                })
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


    function ValidateMeasureDialog($scope, $mdDialog, recommendation, risk) {
        $scope.rec = recommendation;
        $scope.risk = risk;
        $scope.impl = {comment: null};

        $scope.create = function () {
            $mdDialog.hide($scope.impl);
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        }
    }

})();

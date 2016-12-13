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

    }

})();

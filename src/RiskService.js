(function () {

    angular
        .module('AnrModule')
        .factory('RiskService', [ '$resource', '$rootScope', 'MassDeleteService', RiskService ]);

    function RiskService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.RiskResource = $resource('api/' + anr + 'rolf-risks/:riskId', {
                    riskId: '@id',
                    urlAnrId: $rootScope.getUrlAnrId()
                },
                {
                    'update': {
                        method: 'PUT'
                    },
                    'patch': {
                        method: 'PATCH'
                    },
                    'query': {
                        isArray: false
                    }
                });
        }
        makeResource();

        var getRisks = function (params) {
            return self.RiskResource.query(params).$promise;
        };

        var getRisk = function (id) {
            return self.RiskResource.query({riskId: id}).$promise;
        };

        var createRisk = function (params, success, error) {
            console.log(params);
            new self.RiskResource(params).$save(success, error);
        };

        var updateRisk = function (params, success, error) {
            self.RiskResource.update(params, success, error);
        };

        var deleteRisk = function (id, success, error) {
            self.RiskResource.delete({riskId: id}, success, error);
        };

        var deleteMassRisk = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/rolf-risks', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/rolf-risks', ids, success, error);
            }
        };

        var patchRisks = function (params, success, error) {
            self.RiskResource.patch(params, success, error);
        };

        return {
            makeResource: makeResource,
            getRisks: getRisks,
            getRisk: getRisk,
            createRisk: createRisk,
            deleteRisk: deleteRisk,
            deleteMassRisk: deleteMassRisk,
            updateRisk: updateRisk,
            patchRisks: patchRisks
        };
    }

})
();

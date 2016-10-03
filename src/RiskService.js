(function () {

    angular
        .module('BackofficeApp')
        .factory('RiskService', [ '$resource', 'MassDeleteService', RiskService ]);

    function RiskService($resource, MassDeleteService) {
        var self = this;

        self.RiskResource = $resource('/api/rolf-risks/:riskId', { riskId: '@id' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        var getRisks = function (params) {
            return self.RiskResource.query(params).$promise;
        };

        var getRisk = function (id) {
            return self.RiskResource.query({riskId: id}).$promise;
        };

        var createRisk = function (params, success, error) {
            new self.RiskResource(params).$save(success, error);
        };

        var updateRisk = function (params, success, error) {
            self.RiskResource.update(params, success, error);
        };

        var deleteRisk = function (id, success, error) {
            self.RiskResource.delete({riskId: id}, success, error);
        };

        var deleteMassRisk = function (ids, success, error) {
            MassDeleteService.deleteMass('/api/rolf-risks', ids, success, error);
        };

        return {
            getRisks: getRisks,
            getRisk: getRisk,
            createRisk: createRisk,
            deleteRisk: deleteRisk,
            deleteMassRisk: deleteMassRisk,
            updateRisk: updateRisk
        };
    }

})
();
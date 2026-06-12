(function () {

    angular
        .module('AnrModule')
        .factory('RiskSourceService', ['$resource', '$rootScope', RiskSourceService]);

    function RiskSourceService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.RiskSourceResource = $resource('api/' + anr + 'risk-sources/:riskSourceId', {
                    riskSourceId: '@id',
                    urlAnrId: function () { return $rootScope.getUrlAnrId(); }
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
        };
        makeResource();

        var getRiskSources = function (params) {
            return self.RiskSourceResource.query(params).$promise;
        };

        var getRiskSource = function (id) {
            return self.RiskSourceResource.query({riskSourceId: id}).$promise;
        };

        var createRiskSource = function (params, success, error) {
            new self.RiskSourceResource(params).$save(success, error);
        };

        var updateRiskSource = function (params, success, error) {
            self.RiskSourceResource.update(params, success, error);
        };

        var deleteRiskSource = function (id, success, error) {
            self.RiskSourceResource.delete({riskSourceId: id}, success, error);
        };

        return {
            makeResource: makeResource,
            getRiskSources: getRiskSources,
            getRiskSource: getRiskSource,
            createRiskSource: createRiskSource,
            updateRiskSource: updateRiskSource,
            deleteRiskSource: deleteRiskSource
        };
    }

})();

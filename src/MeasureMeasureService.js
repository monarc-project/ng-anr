(function () {

    angular
        .module('AnrModule')
        .factory('MeasureMeasureService', [ '$resource', '$rootScope', 'MassDeleteService', MeasureMeasureService ]);

    function MeasureMeasureService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.MeasureResource = $resource('api/' + anr + 'measuresmeasures/:measuremeasureId', {
                    measuremeasureId: '@id',
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

        var getMeasuresMeasures = function (params) {
            return self.MeasureResource.query(params).$promise;
        };

        var createMeasureMeasure = function (params, success, error) {
          return new self.MeasureResource(params).$save(success, error);
        };

        var deleteMeasureMeasure = function (params, success, error) {
            self.MeasureResource.delete(params, success, error);
        };

        return {
            makeResource: makeResource,
            getMeasuresMeasures: getMeasuresMeasures,
            createMeasureMeasure: createMeasureMeasure,
            deleteMeasureMeasure: deleteMeasureMeasure,
        };
    }
})();

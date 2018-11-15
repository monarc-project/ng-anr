(function () {

    angular
        .module('AnrModule')
        .factory('MeasureMeasureService', [ '$resource', '$rootScope', 'MassDeleteService', MeasureMeasureService ]);

    function MeasureMeasureService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.MeasureResource = $resource('api/' + anr + 'measuremeasure/:measuremeasureId', {
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

        var getMeasureMeasure = function (id) {
            return self.MeasureResource.query({measuremeasureId: id}).$promise;
        };

        var createMeasureMeasure = function (params, success, error) {
          return  new self.MeasureResource(params).$save(success, error);
        };

        var updateMeasureMeasure = function (params, success, error) {
            self.MeasureResource.update(params, success, error);
        };

        var deleteMeasureMeasure = function (id, success, error) {
            self.MeasureResource.delete({measuremeasureId: id}, success, error);
        };

        var deleteMassMeasureMeasure = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/measures', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/measures', ids, success, error);
            }
        }

        var patchMeasureMeasure = function (id, params, success, error) {
            self.MeasureResource.patch({measuremeasureId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getMeasuresMeasures: getMeasuresMeasures,
            getMeasureMeasure: getMeasureMeasure,
            createMeasureMeasure: createMeasureMeasure,
            deleteMeasureMeasure: deleteMeasureMeasure,
            deleteMassMeasureMeasure: deleteMassMeasureMeasure,
            updateMeasureMeasure: updateMeasureMeasure,
            patchMeasureMeasure: patchMeasureMeasure
        };
    }

})
();

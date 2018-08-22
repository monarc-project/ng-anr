(function () {

    angular
        .module('AnrModule')
        .factory('MeasureService', [ '$resource', '$rootScope', 'MassDeleteService', MeasureService ]);

    function MeasureService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.MeasureResource = $resource('api/' + anr + 'measures/:measureId', {
                    measureId: '@id',
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

        var getMeasures = function (params) {
            return self.MeasureResource.query(params).$promise;
        };

        var getMeasure = function (id) {
            return self.MeasureResource.query({measureId: id}).$promise;
        };

        var createMeasure = function (params, success, error) {
          return  new self.MeasureResource(params).$save(success, error);
        };

        var updateMeasure = function (params, success, error) {
            self.MeasureResource.update(params, success, error);
        };

        var deleteMeasure = function (id, success, error) {
            self.MeasureResource.delete({measureId: id}, success, error);
        };

        var deleteMassMeasure = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/measures', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/measures', ids, success, error);
            }
        }

        var patchMeasure = function (id, params, success, error) {
            self.MeasureResource.patch({measureId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getMeasures: getMeasures,
            getMeasure: getMeasure,
            createMeasure: createMeasure,
            deleteMeasure: deleteMeasure,
            deleteMassMeasure: deleteMassMeasure,
            updateMeasure: updateMeasure,
            patchMeasure: patchMeasure
        };
    }

})
();

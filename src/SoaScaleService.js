(function () {

    angular
        .module('AnrModule')
        .factory('SoaScaleService', [ '$resource', '$rootScope', SoaScaleService ]);

    function SoaScaleService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId" : "anr/:anrId";

        var makeResource = function () {

            self.SoaScaleResource = $resource(
                'api/' + anr + '/soa-scale/:soaScaleId',
                {
                    metadataId: '@id',
                    urlAnrId: $rootScope.getUrlAnrId(),
                    anrId: '@anrId'
                },
                {
                    'update': {
                        method: 'PUT'
                    },
                    'query': {
                        isArray: false
                    }
                }
            );
        }

        makeResource();

        var getSoaScales = function (params) {
            return self.SoaScaleResource.query(params).$promise;
        };

        var getSoaScale = function (id, anrId, language) {
            return self.SoaScaleResource.query({soaScaleId: id, anrId:anrId, language:language}).$promise;
        };

        var createSoaScale = function (params, success, error) {
          return  new self.SoaScaleResource(params).$save(success, error);
        };

        var updateSoaScale = function (anrId, params, success, error) {
            self.SoaScaleResource.update({anrId:anrId}, params, success, error);
        };

        var deleteSoaScale = function (id, anrId, success, error) {
            self.SoaScaleResource.delete({metadataId: id, anrId:anrId}, success, error);
        };


        return {

            makeResource:makeResource,

            getSoaScales: getSoaScales,
            getSoaScale: getSoaScale,
            createSoaScale: createSoaScale,
            updateSoaScale: updateSoaScale,
            deleteSoaScale: deleteSoaScale,
        };
    }

})
();

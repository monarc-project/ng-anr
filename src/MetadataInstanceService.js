(function () {

    angular
        .module('AnrModule')
        .factory('MetadataInstanceService', [ '$resource', '$rootScope', MetadataInstanceService ]);

    function MetadataInstanceService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId" : "anr/:anrId";

        var makeResource = function () {
            self.MetadataInstanceResource = $resource('api/' + anr + '/metadatas-on-instances/:metadataId', {
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
                });
        }
        makeResource();

        var getMetadatas = function (params) {
            return self.MetadataInstanceResource.query(params).$promise;
        };

        var getMetadata = function (id, anrId, language) {
            return self.MetadataInstanceResource.query({metadataId: id, anrId:anrId, language:language}).$promise;
        };

        var createMetadata = function (params, success, error) {
          return  new self.MetadataInstanceResource(params).$save(success, error);
        };

        var updateMetadata = function (anrId, params, success, error) {
            self.MetadataInstanceResource.update({anrId:anrId}, params, success, error);
        };

        var deleteMetadata = function (id, anrId, success, error) {
            self.MetadataInstanceResource.delete({metadataId: id, anrId:anrId}, success, error);
        };

        return {
            makeResource: makeResource,
            getMetadatas: getMetadatas,
            getMetadata: getMetadata,
            createMetadata: createMetadata,
            updateMetadata: updateMetadata,
            deleteMetadata: deleteMetadata,
        };
    }

})
();

(function () {

    angular
        .module('AnrModule')
        .factory('MetadataInstanceService', [ '$resource', '$rootScope', MetadataInstanceService ]);

    function MetadataInstanceService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId" : "anr/:anrId";

        self.FieldMetadataResource = $resource(
            'api/' + anr + '/metadatas-on-instances/:metadataId',
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

        self.InstanceMetadataResource = $resource(
            'api/' + anr + '/instances/:instId/instances_metadatas/:id',
            {
                id: '@id',
                urlAnrId: $rootScope.getUrlAnrId(),
                anrId: '@anrId',
                instId: '@instId',
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

        var getMetadatas = function (params) {
            return self.FieldMetadataResource.query(params).$promise;
        };

        var getMetadata = function (id, anrId, language) {
            return self.FieldMetadataResource.query({metadataId: id, anrId:anrId, language:language}).$promise;
        };

        var createMetadata = function (params, success, error) {
          return  new self.FieldMetadataResource(params).$save(success, error);
        };

        var updateMetadata = function (anrId, params, success, error) {
            self.FieldMetadataResource.update({anrId:anrId}, params, success, error);
        };

        var deleteMetadata = function (id, anrId, success, error) {
            self.FieldMetadataResource.delete({metadataId: id, anrId:anrId}, success, error);
        };

        var getInstanceMetadatas = function (params) {
            return self.InstanceMetadataResource.query(params).$promise;
        };

        var getInstanceMetadata = function (id, language) {
            return self.InstanceMetadataResource.query({id: id, language:language}).$promise;
        };

        var createIntanceMetadata = function (params, success, error) {
          return  new self.InstanceMetadataResource(params).$save(success, error);
        };

        var updateInstanceMetadata = function (params, success, error) {
            self.InstanceMetadataResource.update(params, success, error);
        };

        var deleteInstanceMetadata = function (id, success, error) {
            self.InstanceMetadataResource.delete({id: id}, success, error);
        };

        return {

            //Fields Metadatas
            getMetadatas: getMetadatas,
            getMetadata: getMetadata,
            createMetadata: createMetadata,
            updateMetadata: updateMetadata,
            deleteMetadata: deleteMetadata,

            //Instance Metadatas
            getInstanceMetadatas: getInstanceMetadatas,
            getInstanceMetadata: getInstanceMetadata,
            createIntanceMetadata: createIntanceMetadata,
            updateInstanceMetadata: updateInstanceMetadata,
            deleteInstanceMetadata: deleteInstanceMetadata,
        };
    }

})
();

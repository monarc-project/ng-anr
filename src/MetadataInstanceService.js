(function () {
  angular
    .module('AnrModule')
    .factory('MetadataInstanceService', ['$resource', '$rootScope', MetadataInstanceService]);

  function MetadataInstanceService($resource, $rootScope) {
    var self = this;

    var anr = $rootScope.OFFICE_MODE === "FO" ? "client-anr/:urlAnrId" : "anr/:anrId";

    var makeResource = function () {

      self.FieldMetadataResource = $resource(
        'api/' + anr + '/instances-metadata/:metadataId',
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
        'api/' + anr + '/instances/:instId/metadata/:id',
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
    }

    makeResource();

    var getMetadataList = function (params) {
      return self.FieldMetadataResource.query(params).$promise;
    };

    var getMetadata = function (id, anrId, language) {
      return self.FieldMetadataResource.query({metadataId: id, anrId: anrId, language: language}).$promise;
    };

    var createMetadata = function (params, success, error) {
      return new self.FieldMetadataResource(params).$save(success, error);
    };

    var updateMetadata = function (anrId, params, success, error) {
      self.FieldMetadataResource.update({anrId: anrId}, params, success, error);
    };

    var deleteMetadata = function (id, anrId, success, error) {
      self.FieldMetadataResource.delete({metadataId: id, anrId: anrId}, success, error);
    };

    var getInstanceMetadataList = function (params) {
      return self.InstanceMetadataResource.query(params).$promise;
    };

    var createInstanceMetadata = function (params, success, error) {
      return new self.InstanceMetadataResource(params).$save(success, error);
    };

    var updateInstanceMetadata = function (instId, params, success, error) {
      self.InstanceMetadataResource.update({instId: instId}, params, success, error);
    };

    return {
      makeResource: makeResource,

      // Fields Metadata.
      getMetadataList: getMetadataList,
      getMetadata: getMetadata,
      createMetadata: createMetadata,
      updateMetadata: updateMetadata,
      deleteMetadata: deleteMetadata,

      // Instance Metadata.
      getInstanceMetadataList: getInstanceMetadataList,
      createInstanceMetadata: createInstanceMetadata,
      updateInstanceMetadata: updateInstanceMetadata,
    };
  }
})();

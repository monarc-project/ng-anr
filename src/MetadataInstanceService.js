(function () {
  angular
    .module('AnrModule')
    .factory('MetadataInstanceService', ['$resource', '$rootScope', MetadataInstanceService]);

  function MetadataInstanceService($resource, $rootScope) {
    var self = this;

    var anr = $rootScope.OFFICE_MODE === "FO" ? "client-anr/:urlAnrId" : "anr/:anrId";

    var makeResource = function () {

      self.FieldMetadataResource = $resource(
        'api/' + anr + '/instances-metadata-fields/:metadataFieldId',
        {
          metadataFieldId: '@id',
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

    var getMetadataFields = function (params) {
      return self.FieldMetadataResource.query(params).$promise;
    };

    var getMetadataField = function (id, anrId, language) {
      return self.FieldMetadataResource.query({metadataFieldId: id, anrId: anrId, language: language}).$promise;
    };

    var createMetadataField = function (params, success, error) {
      return new self.FieldMetadataResource(params).$save(success, error);
    };

    var updateMetadataFields = function (anrId, params, success, error) {
      self.FieldMetadataResource.update({anrId: anrId}, params, success, error);
    };

    var deleteMetadataField = function (id, anrId, success, error) {
      self.FieldMetadataResource.delete({metadataFieldId: id, anrId: anrId}, success, error);
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
      getMetadataFields: getMetadataFields,
      getMetadataField: getMetadataField,
      createMetadataField: createMetadataField,
      updateMetadataFields: updateMetadataFields,
      deleteMetadataField: deleteMetadataField,

      // Instance Metadata.
      getInstanceMetadataList: getInstanceMetadataList,
      createInstanceMetadata: createInstanceMetadata,
      updateInstanceMetadata: updateInstanceMetadata,
    };
  }
})();

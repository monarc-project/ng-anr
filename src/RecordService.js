(function () {

    angular
        .module('AnrModule')
        .factory('RecordService', [ '$resource', '$rootScope', RecordService]);

    function RecordService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.RecordResource = $resource('api/' + anr + 'records/:RecordId', {
                    RecordId: '@id',
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

        var getRecords = function (params) {
            return self.RecordResource.query(params).$promise;
        };

        var getRecord = function (id) {
            return self.RecordResource.query({RecordId: id}).$promise;
        };

        var createRecord = function (params, success, error) {
            return new self.RecordResource(params).$save(success, error);
        };

        var updateRecord = function (params, success, error) {
            self.RecordResource.update(params, success, error);
        };

        var deleteRecord = function (id, success, error) {
            self.RecordResource.delete({RecordId: id}, success, error);
        };

        var patchRecord = function (id, params, success, error) {
            self.RecordResource.patch({RecordId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getRecords: getRecords,
            getRecord: getRecord,
            createRecord: createRecord,
            deleteRecord: deleteRecord,
            updateRecord: updateRecord,
            patchRecord: patchRecord
        };
    }

})
();

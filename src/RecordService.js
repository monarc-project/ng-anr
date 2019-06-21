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
            self.RecordActorResource = $resource('api/' + anr + 'recordactors/:RecordActorId', {
                RecordActorId: '@id',
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
            self.RecordProcessorResource = $resource('api/' + anr + 'recordprocessors/:RecordProcessorId', {
                RecordProcessorId: '@id',
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
            self.RecordRecipientResource = $resource('api/' + anr + 'recordrecipientcategories/:RecordRecipientId', {
                RecordRecipientId: '@id',
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

        //RecordActor
        var getRecordActors = function (params) {
            return self.RecordActorResource.query(params).$promise;
        };
        var createRecordActor = function (params, success, error) {
            return new self.RecordActorResource(params).$save(success, error);
        };
        var updateRecordActor = function (params, success, error) {
            self.RecordActorResource.update(params, success, error);
        };

        //RecordProcessor
        var getRecordProcessors = function (params) {
            return self.RecordProcessorResource.query(params).$promise;
        };

        var getRecordProcessor = function (id) {
            return self.RecordProcessorResource.query({RecordProcessorId: id}).$promise;
        };

        var updateRecordProcessor = function (params, success, error) {
            self.RecordProcessorResource.update(params, success, error);
        };

        //RecordRecipient
        var getRecordRecipientCategories = function (params) {
            return self.RecordRecipientResource.query(params).$promise;
        };

        return {
            makeResource: makeResource,

            getRecords: getRecords,
            getRecord: getRecord,
            createRecord: createRecord,
            deleteRecord: deleteRecord,
            updateRecord: updateRecord,
            patchRecord: patchRecord,

            getRecordActors: getRecordActors,
            createRecordActor: createRecordActor,
            updateRecordActor: updateRecordActor,

            getRecordProcessors: getRecordProcessors,
            getRecordProcessor: getRecordProcessor,
            updateRecordProcessor: updateRecordProcessor,

            getRecordRecipientCategories: getRecordRecipientCategories,
        };
    }

})
();

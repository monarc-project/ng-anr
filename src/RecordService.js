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
            self.RecordActorResource = $resource('api/' + anr + 'record-actors/:RecordActorId', {
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
            self.RecordDataSubjectResource = $resource('api/' + anr + 'record-data-subjects', {
                urlAnrId: $rootScope.getUrlAnrId()
            },
            {
                'query': {
                    isArray: false
                }
            });
            self.RecordDataCategoryResource = $resource('api/' + anr + 'record-data-categories', {
                urlAnrId: $rootScope.getUrlAnrId()
            },
            {
                'query': {
                    isArray: false
                }
            });
            self.RecordPersonalDataResource = $resource('api/' + anr + 'record-personal-data/:RecordPersonalDataId', {
                RecordPersonalDataId: '@id',
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
            self.RecordProcessorResource = $resource('api/' + anr + 'record-processors/:RecordProcessorId', {
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
            self.RecordRecipientResource = $resource('api/' + anr + 'record-recipients/:RecordRecipientId', {
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
            self.RecordInternationalTransferResource = $resource('api/' + anr + 'record-international-transfers/:RecordInternationalTransferId', {
                RecordInternationalTransferId: '@id',
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

        //RecordDataSubject
        var getRecordDataSubjects = function (params) {
            return self.RecordDataSubjectResource.query(params).$promise;
        };
        //RecordDataCategory
        var getRecordDataCategories = function (params) {
            return self.RecordDataCategoryResource.query(params).$promise;
        };

        //RecordPersonalData
        var createRecordPersonalData = function (params, success, error) {
            return new self.RecordPersonalDataResource(params).$save(success, error);
        };
        var updateRecordPersonalData = function (params, success, error) {
            self.RecordPersonalDataResource.update(params, success, error);
        };
        var getRecordPersonalData = function (id) {
            return self.RecordPersonalDataResource.query({RecordPersonalDataId: id}).$promise;
        };

        //RecordProcessor
        var getRecordProcessors = function (params) {
            return self.RecordProcessorResource.query(params).$promise;
        };

        var getRecordProcessor = function (id) {
            return self.RecordProcessorResource.query({RecordProcessorId: id}).$promise;
        };

        var createRecordProcessor = function (params, success, error) {
            return new self.RecordProcessorResource(params).$save(success, error);
        };

        var updateRecordProcessor = function (params, success, error) {
            self.RecordProcessorResource.update(params, success, error);
        };

        //RecordRecipient
        var getRecordRecipients = function (params) {
            return self.RecordRecipientResource.query(params).$promise;
        };
        var createRecordRecipient = function (params, success, error) {
            return new self.RecordRecipientResource(params).$save(success, error);
        };
        var updateRecordRecipient = function (params, success, error) {
            self.RecordRecipientResource.update(params, success, error);
        };
        var getRecordRecipient = function (id) {
            return self.RecordRecipientResource.query({RecordRecipientId: id}).$promise;
        };

        //RecordInternationalTransfer
        var createRecordInternationalTransfer = function (params, success, error) {
            return new self.RecordInternationalTransferResource(params).$save(success, error);
        };
        var updateRecordInternationalTransfer = function (params, success, error) {
            self.RecordInternationalTransferResource.update(params, success, error);
        };

        return {
            makeResource: makeResource,

            getRecords: getRecords,
            getRecord: getRecord,
            createRecord: createRecord,
            deleteRecord: deleteRecord,
            updateRecord: updateRecord,

            getRecordActors: getRecordActors,
            createRecordActor: createRecordActor,
            updateRecordActor: updateRecordActor,

            getRecordDataSubjects: getRecordDataSubjects,

            getRecordDataCategories: getRecordDataCategories,

            createRecordPersonalData: createRecordPersonalData,
            updateRecordPersonalData: updateRecordPersonalData,
            getRecordPersonalData: getRecordPersonalData,

            getRecordProcessors: getRecordProcessors,
            getRecordProcessor: getRecordProcessor,
            createRecordProcessor: createRecordProcessor,
            updateRecordProcessor: updateRecordProcessor,

            getRecordRecipients: getRecordRecipients,
            createRecordRecipient: createRecordRecipient,
            updateRecordRecipient: updateRecordRecipient,
            getRecordRecipient: getRecordRecipient,

            createRecordInternationalTransfer: createRecordInternationalTransfer,
            updateRecordInternationalTransfer: updateRecordInternationalTransfer
        };
    }

})
();

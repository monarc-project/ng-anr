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
            self.RecordControllerResource = $resource('api/' + anr + 'recordcontrollers/:RecordControllerId', {
                RecordControllerId: '@id',
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
            self.RecordRecipientCategoryResource = $resource('api/' + anr + 'recordrecipientcategories/:RecordRecipientCategoryId', {
                RecordRecipientCategoryId: '@id',
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

        //RecordController
        var getRecordControllers = function (params) {
            return self.RecordControllerResource.query(params).$promise;
        };

        var getRecordController = function (id) {
            return self.RecordControllerResource.query({RecordControllerId: id}).$promise;
        };

        var createRecordController = function (params, success, error) {
            return new self.RecordControllerResource(params).$save(success, error);
        };

        var updateRecordController = function (params, success, error) {
            self.RecordControllerResource.update(params, success, error);
        };

        var deleteRecordController = function (id, success, error) {
            self.RecordControllerResource.delete({RecordControllerId: id}, success, error);
        };

        var patchRecordController = function (id, params, success, error) {
            self.RecordControllerResource.patch({RecordControllerId: id}, params, success, error);
        }

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

        var deleteRecordProcessor = function (id, success, error) {
            self.RecordProcessorResource.delete({RecordProcessorId: id}, success, error);
        };

        var patchRecordProcessor = function (id, params, success, error) {
            self.RecordProcessorResource.patch({RecordProcessorId: id}, params, success, error);
        }

        //RecordRecipientCategory
        var getRecordRecipientCategories = function (params) {
            return self.RecordRecipientCategoryResource.query(params).$promise;
        };

        var getRecordRecipientCategory = function (id) {
            return self.RecordRecipientCategoryResource.query({RecordRecipientCategoryId: id}).$promise;
        };

        var createRecordRecipientCategory = function (params, success, error) {
            return new self.RecordRecipientCategoryResource(params).$save(success, error);
        };

        var updateRecordRecipientCategory = function (params, success, error) {
            self.RecordRecipientCategoryResource.update(params, success, error);
        };

        var deleteRecordRecipientCategory = function (id, success, error) {
            self.RecordRecipientCategoryResource.delete({RecordRecipientCategoryId: id}, success, error);
        };

        var patchRecordRecipientCategory = function (id, params, success, error) {
            self.RecordRecipientCategoryResource.patch({RecordRecipientCategoryId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,

            getRecords: getRecords,
            getRecord: getRecord,
            createRecord: createRecord,
            deleteRecord: deleteRecord,
            updateRecord: updateRecord,
            patchRecord: patchRecord,

            getRecordControllers: getRecordControllers,
            getRecordController: getRecordController,
            createRecordController: createRecordController,
            deleteRecordController: deleteRecordController,
            updateRecordController: updateRecordController,
            patchRecordController: patchRecordController,

            getRecordProcessors: getRecordProcessors,
            getRecordProcessor: getRecordProcessor,
            createRecordProcessor: createRecordProcessor,
            deleteRecordProcessor: deleteRecordProcessor,
            updateRecordProcessor: updateRecordProcessor,
            patchRecordProcessor: patchRecordProcessor,

            getRecordRecipientCategories: getRecordRecipientCategories,
            getRecordRecipientCategory: getRecordRecipientCategory,
            createRecordRecipientCategory: createRecordRecipientCategory,
            deleteRecordRecipientCategory: deleteRecordRecipientCategory,
            updateRecordRecipientCategory: updateRecordRecipientCategory,
            patchRecordRecipientCategory: patchRecordRecipientCategory
        };
    }

})
();

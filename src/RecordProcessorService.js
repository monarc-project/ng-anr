(function () {

    angular
        .module('AnrModule')
        .factory('RecordProcessorService', [ '$resource', '$rootScope', RecordProcessorService]);

    function RecordProcessorService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
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
        }
        makeResource();

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

        return {
            makeResource: makeResource,
            getRecordProcessors: getRecordProcessors,
            getRecordProcessor: getRecordProcessor,
            createRecordProcessor: createRecordProcessor,
            deleteRecordProcessor: deleteRecordProcessor,
            updateRecordProcessor: updateRecordProcessor,
            patchRecordProcessor: patchRecordProcessor
        };
    }

})
();

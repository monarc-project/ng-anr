(function () {

    angular
        .module('AnrModule')
        .factory('RecordControllerService', [ '$resource', '$rootScope', RecordControllerService]);

    function RecordControllerService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
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
        }
        makeResource();

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

        return {
            makeResource: makeResource,
            getRecordControllers: getRecordControllers,
            getRecordController: getRecordController,
            createRecordController: createRecordController,
            deleteRecordController: deleteRecordController,
            updateRecordController: updateRecordController,
            patchRecordController: patchRecordController
        };
    }

})
();

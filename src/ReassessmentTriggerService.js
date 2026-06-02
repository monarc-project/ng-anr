(function () {

    angular
        .module('AnrModule')
        .factory('ReassessmentTriggerService', ['$resource', '$rootScope', ReassessmentTriggerService]);

    function ReassessmentTriggerService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.ReassessmentTriggerResource = $resource('api/' + anr + 'reassessment-triggers/:reassessmentTriggerId', {
                    reassessmentTriggerId: '@id',
                    urlAnrId: $rootScope.getUrlAnrId()
                },
                {
                    'update': {
                        method: 'PUT'
                    },
                    'patch': {
                        method: 'PUT'
                    },
                    'query': {
                        isArray: false
                    }
                });
        };
        makeResource();

        var getReassessmentTriggers = function (params) {
            return self.ReassessmentTriggerResource.query(params).$promise;
        };

        var getReassessmentTrigger = function (id) {
            return self.ReassessmentTriggerResource.query({reassessmentTriggerId: id}).$promise;
        };

        var createReassessmentTrigger = function (params, success, error) {
            new self.ReassessmentTriggerResource(params).$save(success, error);
        };

        var updateReassessmentTrigger = function (params, success, error) {
            self.ReassessmentTriggerResource.update(params, success, error);
        };

        var patchReassessmentTrigger = function (params, success, error) {
            self.ReassessmentTriggerResource.patch(params, success, error);
        };

        var deleteReassessmentTrigger = function (id, success, error) {
            self.ReassessmentTriggerResource.delete({reassessmentTriggerId: id}, success, error);
        };

        return {
            makeResource: makeResource,
            getReassessmentTriggers: getReassessmentTriggers,
            getReassessmentTrigger: getReassessmentTrigger,
            createReassessmentTrigger: createReassessmentTrigger,
            updateReassessmentTrigger: updateReassessmentTrigger,
            patchReassessmentTrigger: patchReassessmentTrigger,
            deleteReassessmentTrigger: deleteReassessmentTrigger
        };
    }

})();

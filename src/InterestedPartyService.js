(function () {

    angular
        .module('AnrModule')
        .factory('InterestedPartyService', ['$resource', '$rootScope', InterestedPartyService]);

    function InterestedPartyService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.InterestedPartyResource = $resource('api/' + anr + 'interested-parties/:interestedPartyId', {
                    interestedPartyId: '@id',
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

        var getInterestedParties = function () {
            return self.InterestedPartyResource.query().$promise;
        };

        var createInterestedParty = function (params, success, error) {
            new self.InterestedPartyResource(params).$save(success, error);
        };

        var updateInterestedParty = function (params, success, error) {
            self.InterestedPartyResource.update(params, success, error);
        };

        var patchInterestedParty = function (params, success, error) {
            self.InterestedPartyResource.patch(params, success, error);
        };

        var deleteInterestedParty = function (id, success, error) {
            self.InterestedPartyResource.delete({interestedPartyId: id}, success, error);
        };

        return {
            makeResource: makeResource,
            getInterestedParties: getInterestedParties,
            createInterestedParty: createInterestedParty,
            updateInterestedParty: updateInterestedParty,
            patchInterestedParty: patchInterestedParty,
            deleteInterestedParty: deleteInterestedParty
        };
    }

})();

(function () {

    angular
        .module('AnrModule')
        .factory('AmvService', [ '$resource', '$rootScope', 'MassDeleteService', AmvService ]);

    function AmvService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.AmvResource = $resource('api/' + anr + 'amvs/:amvId', {
                    amvId: '@id',
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

        var getAmvs = function (params) {
            return self.AmvResource.query(params).$promise;
        };

        var getAmv = function (id) {
            return self.AmvResource.query({amvId: id}).$promise;
        };

        var createAmv = function (params, success, error) {
            new self.AmvResource(params).$save(success, error);
        };

        var updateAmv = function (params, success, error) {
            self.AmvResource.update(params, success, error);
        };

        var deleteAmv = function (id, success, error) {
            self.AmvResource.delete({amvId: id}, success, error);
        };

        var deleteMassAmv = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/amvs', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/amvs', ids, success, error);
            }
        };

        var patchAmv = function (id, params, success, error) {
            self.AmvResource.patch({amvId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getAmvs: getAmvs,
            getAmv: getAmv,
            createAmv: createAmv,
            deleteAmv: deleteAmv,
            deleteMassAmv: deleteMassAmv,
            updateAmv: updateAmv,
            patchAmv: patchAmv
        };
    }

})
();
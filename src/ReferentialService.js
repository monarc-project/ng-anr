(function () {

    angular
        .module('AnrModule')
        .factory('ReferentialService', [ '$resource', '$rootScope', 'MassDeleteService', ReferentialService ]);

    function ReferentialService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.ReferentialResource = $resource('api/' + anr + 'referentials/:ReferentialId', {
                    ReferentialId: '@uniqid',
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
            self.CommonReferentialsResource = $resource('api/referentials/:referentialId', { referentialId: '@uniqid'},
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

        var getReferentials = function (params) {
            return self.ReferentialResource.query(params).$promise;
        };

        var getReferential = function (id) {
            return self.ReferentialResource.query({ReferentialId: id}).$promise;
        };

        var getReferentialsCommon = function (params) {
            return self.CommonReferentialsResource.query(params).$promise;
        };

        var createReferential = function (params, success, error) {
          return  new self.ReferentialResource(params).$save(success, error);
        };

        var updateReferential = function (params, success, error) {
            self.ReferentialResource.update(params, success, error);
        };

        var deleteReferential = function (id, success, error) {
            self.ReferentialResource.delete({ReferentialId: id}, success, error);
        };

        var deleteMassReferential = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/Referentials', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/Referentials', ids, success, error);
            }
        }

        var patchReferential = function (id, params, success, error) {
            self.ReferentialResource.patch({ReferentialId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getReferentials: getReferentials,
            getReferentialsCommon: getReferentialsCommon,
            getReferential: getReferential,
            createReferential: createReferential,
            deleteReferential: deleteReferential,
            deleteMassReferential: deleteMassReferential,
            updateReferential: updateReferential,
            patchReferential: patchReferential
        };
    }

})
();

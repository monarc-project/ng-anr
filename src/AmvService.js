(function () {

    angular
        .module('AnrModule')
        .factory('AmvService', [ '$resource', 'MassDeleteService', AmvService ]);

    function AmvService($resource, MassDeleteService) {
        var self = this;

        self.AmvResource = $resource('/api/amvs/:amvId', { amvId: '@id' },
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
            MassDeleteService.deleteMass('/api/amvs', ids, success, error);
        };

        var patchAmv = function (id, params, success, error) {
            self.AmvResource.patch({amvId: id}, params, success, error);
        }

        return {
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
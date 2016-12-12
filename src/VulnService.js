(function () {

    angular
        .module('AnrModule')
        .factory('VulnService', [ '$resource', '$rootScope', 'MassDeleteService', VulnService ]);

    function VulnService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        self.VulnResource = $resource('/api/' + anr + 'vulnerabilities/:vulnId', { vulnId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
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

        var getVulns = function (params) {
            return self.VulnResource.query(params).$promise;
        };

        var getVuln = function (id) {
            return self.VulnResource.query({vulnId: id}).$promise;
        };

        var createVuln = function (params, success, error) {
            new self.VulnResource(params).$save(success, error);
        };

        var updateVuln = function (params, success, error) {
            self.VulnResource.update(params, success, error);
        };

        var deleteVuln = function (id, success, error) {
            self.VulnResource.delete({vulnId: id}, success, error);
        };

        var deleteMassVuln = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('/api/client-anr/' + $rootScope.getUrlAnrId() + '/vulnerabilities', ids, success, error);
            } else {
                MassDeleteService.deleteMass('/api/vulnerabilities', ids, success, error);
            }
        };

        var patchVuln = function (id, params, success, error) {
            self.VulnResource.patch({vulnId: id}, params, success, error);
        }

        return {
            getVulns: getVulns,
            getVuln: getVuln,
            createVuln: createVuln,
            deleteVuln: deleteVuln,
            deleteMassVuln: deleteMassVuln,
            updateVuln: updateVuln,
            patchVuln: patchVuln
        };
    }

})
();
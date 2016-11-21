(function () {

    angular
        .module('AnrModule')
        .factory('AssetService', [ '$resource', '$rootScope', 'MassDeleteService', AssetService ]);

    function AssetService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "anr/:urlAnrId/" : "";

        self.AssetResource = $resource('/api/' + anr + 'assets/:assetId', { assetId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
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

        var getAssets = function (params) {
            return self.AssetResource.query(params).$promise;
        };

        var getAsset = function (id) {
            return self.AssetResource.query({assetId: id}).$promise;
        };

        var createAsset = function (params, success, error) {
            new self.AssetResource(params).$save(success, error);
        };

        var updateAsset = function (params, success, error) {
            self.AssetResource.update(params, success, error);
        };

        var deleteAsset = function (id, success, error) {
            self.AssetResource.delete({assetId: id}, success, error);
        };

        var deleteMassAsset = function (ids, success, error) {
            MassDeleteService.deleteMass('/api/assets', ids, success, error);
        };

        var patchAsset = function (id, params, success, error) {
            self.AssetResource.patch({assetId: id}, params, success, error);
        };

        return {
            getAssets: getAssets,
            getAsset: getAsset,
            createAsset: createAsset,
            deleteAsset: deleteAsset,
            deleteMassAsset: deleteMassAsset,
            updateAsset: updateAsset,
            patchAsset: patchAsset
        };
    }

})
();
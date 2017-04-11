(function () {

    angular
        .module('AnrModule')
        .factory('AssetService', [ '$resource', '$rootScope', 'MassDeleteService', AssetService ]);

    function AssetService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.AssetResource = $resource('api/' + anr + 'assets/:assetId', {
                    assetId: '@id',
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

            self.CommonAssetResource = $resource('api/' + anr + 'assets/importcomm/:assetId', { assetId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
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
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/assets', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/' + anr + 'assets', ids, success, error);
            }

        };

        var patchAsset = function (id, params, success, error) {
            self.AssetResource.patch({assetId: id}, params, success, error);
        };


        var getAssetsCommon = function (params) {
            return self.CommonAssetResource.query(params).$promise;
        };

        var getAssetCommon = function (id) {
            return self.CommonAssetResource.query({assetId: id}).$promise;
        };

        var importAssetCommon = function(id, success, error) {
            new self.CommonAssetResource({asset: id}).$save(success, error);
        };

        return {
            makeResource: makeResource,
            getAssets: getAssets,
            getAsset: getAsset,
            createAsset: createAsset,
            deleteAsset: deleteAsset,
            deleteMassAsset: deleteMassAsset,
            updateAsset: updateAsset,
            patchAsset: patchAsset,
            getAssetsCommon: getAssetsCommon,
            getAssetCommon: getAssetCommon,
            importAssetCommon: importAssetCommon,
        };
    }

})
();
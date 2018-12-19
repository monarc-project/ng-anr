(function () {

    angular
        .module('AnrModule')
        .factory('SOACategoryService', [ '$resource', '$rootScope', 'MassDeleteService', SOACategoryService ]);

    function SOACategoryService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr =  $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.ClientCategoryResource = $resource('api/' + anr + 'soacategory/:categoryId', {
                    categoryId: '@id',
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

        var getCategories = function (params) {
            return self.ClientCategoryResource.query(params).$promise;
        };

        var getCategory = function (id) {
            return self.ClientCategoryResource.query({categoryId: id}).$promise;
        };

        var createCategory = function (params, success, error) {
            new self.ClientCategoryResource(params).$save(success, error);
        };

        var updateCategory = function (params, success, error) {
            self.ClientCategoryResource.update(params, success, error);
        };

        var deleteCategory = function (id, success, error) {
            self.ClientCategoryResource.delete({categoryId: id}, success, error);
        };


        var deleteMassCategory = function (ids, success, error) {

            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/soacategory', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/soacategory', ids, success, error);
            }
        }

        var patchCategory = function (id, params, success, error) {

            self.ClientCategoryResource.patch({categoryId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getCategories: getCategories,
            getCategory: getCategory,
            createCategory: createCategory,
            deleteCategory: deleteCategory,
            updateCategory: updateCategory,
            deleteMassCategory:deleteMassCategory,
            patchCategory:patchCategory

        };

    }

})
();

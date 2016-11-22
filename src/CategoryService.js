(function () {

    angular
        .module('AnrModule')
        .factory('CategoryService', [ '$resource', '$rootScope', CategoryService ]);

    function CategoryService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "anr/:urlAnrId/" : "";

        self.CategoryResource = $resource('/api/'+anr+'rolf-categories/:categoryId', { categoryId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        var getCategories = function (params) {
            return self.CategoryResource.query(params).$promise;
        };

        var getCategory = function (id) {
            return self.CategoryResource.query({categoryId: id}).$promise;
        };

        var createCategory = function (params, success, error) {
            new self.CategoryResource(params).$save(success, error);
        };

        var updateCategory = function (params, success, error) {
            self.CategoryResource.update(params, success, error);
        };

        var deleteCategory = function (id, success, error) {
            self.CategoryResource.delete({categoryId: id}, success, error);
        };

        return {
            getCategories: getCategories,
            getCategory: getCategory,
            createCategory: createCategory,
            deleteCategory: deleteCategory,
            updateCategory: updateCategory
        };
    }

})
();
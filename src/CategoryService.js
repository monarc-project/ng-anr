(function () {

    angular
        .module('AnrModule')
        .factory('CategoryService', [ '$resource', CategoryService ]);

    function CategoryService($resource) {
        var self = this;

        self.CategoryResource = $resource('/api/rolf-categories/:categoryId', { categoryId: '@id' },
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
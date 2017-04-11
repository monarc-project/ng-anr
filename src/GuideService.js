(function () {

    angular
        .module('AnrModule')
        .factory('GuideService', [ '$resource', 'gettextCatalog', GuideService ]);

    function GuideService($resource, gettextCatalog) {
        var self = this;

        self.GuideResource = $resource('api/guides/:guideId', { guideId: '@id' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        var getGuides = function (params) {
            return self.GuideResource.query(params).$promise;
        };

        var getGuide = function (id) {
            return self.GuideResource.query({guideId: id}).$promise;
        };

        var createGuide = function (params, success, error) {
            new self.GuideResource(params).$save(success, error);
        };

        var updateGuide = function (params, success, error) {
            self.GuideResource.update(params, success, error);
        };

        var deleteGuide = function (id, success, error) {
            self.GuideResource.delete({guideId: id}, success, error);
        };


        self.ItemResource = $resource('api/guides-items/:itemId', { itemId: '@id' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        var getItems = function (params) {
            return self.ItemResource.query(params).$promise;
        };

        var getItem = function (id) {
            return self.ItemResource.query({itemId: id}).$promise;
        };

        var createItem = function (params, success, error) {
            new self.ItemResource(params).$save(success, error);
        };

        var updateItem = function (params, success, error) {
            self.ItemResource.update(params, success, error);
        };

        var deleteItem = function (id, success, error) {
            self.ItemResource.delete({itemId: id}, success, error);
        };

        var categoriesLabels = {};
        var categories = [];

        var calculateCategories = function () {
            categoriesLabels = {
                1: gettextCatalog.getString("Risk analysis context"),
                2: gettextCatalog.getString("Risk management context"),
                3: gettextCatalog.getString("Summary assessment of trends and threats"),
                4: gettextCatalog.getString("Summary of assets / impacts")
            }

            categories = [
                {
                    id: 1,
                    label: categoriesLabels[1]
                },
                {
                    id: 2,
                    label: categoriesLabels[2]
                },
                {
                    id: 3,
                    label: categoriesLabels[3]
                },
                {
                    id: 4,
                    label: categoriesLabels[4]
                },
            ];
        }

        return {
            getGuides: getGuides,
            getGuide: getGuide,
            createGuide: createGuide,
            deleteGuide: deleteGuide,
            updateGuide: updateGuide,

            getItems: getItems,
            getItem: getItem,
            createItem: createItem,
            deleteItem: deleteItem,
            updateItem: updateItem,

            getCategories: function () { calculateCategories(); return categories; },
            getCategoryLabel: function (id) { calculateCategories(); return categoriesLabels[id]; }
        };
    }

})
();
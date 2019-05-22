(function () {

    angular
        .module('AnrModule')
        .factory('RecordRecipientCategoryService', [ '$resource', '$rootScope', RecordRecipientCategoryService]);

    function RecordRecipientCategoryService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.RecordRecipientCategoryResource = $resource('api/' + anr + 'recordrecipientcategories/:RecordRecipientCategoryId', {
                    RecordRecipientCategoryId: '@id',
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

        var getRecordRecipientCategories = function (params) {
            return self.RecordRecipientCategoryResource.query(params).$promise;
        };

        var getRecordRecipientCategory = function (id) {
            return self.RecordRecipientCategoryResource.query({RecordRecipientCategoryId: id}).$promise;
        };

        var createRecordRecipientCategory = function (params, success, error) {
            return new self.RecordRecipientCategoryResource(params).$save(success, error);
        };

        var updateRecordRecipientCategory = function (params, success, error) {
            self.RecordRecipientCategoryResource.update(params, success, error);
        };

        var deleteRecordRecipientCategory = function (id, success, error) {
            self.RecordRecipientCategoryResource.delete({RecordRecipientCategoryId: id}, success, error);
        };

        var patchRecordRecipientCategory = function (id, params, success, error) {
            self.RecordRecipientCategoryResource.patch({RecordRecipientCategoryId: id}, params, success, error);
        }

        return {
            makeResource: makeResource,
            getRecordRecipientCategories: getRecordRecipientCategories,
            getRecordRecipientCategory: getRecordRecipientCategory,
            createRecordRecipientCategory: createRecordRecipientCategory,
            deleteRecordRecipientCategory: deleteRecordRecipientCategory,
            updateRecordRecipientCategory: updateRecordRecipientCategory,
            patchRecordRecipientCategory: patchRecordRecipientCategory
        };
    }

})
();

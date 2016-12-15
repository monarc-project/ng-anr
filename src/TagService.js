(function () {

    angular
        .module('AnrModule')
        .factory('TagService', [ '$resource', '$rootScope', 'MassDeleteService', TagService ]);

    function TagService($resource, $rootScope, MassDeleteService) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.TagResource = $resource('/api/' + anr + 'rolf-tags/:tagId', {
                    tagId: '@id',
                    urlAnrId: $rootScope.getUrlAnrId()
                },
                {
                    'update': {
                        method: 'PUT'
                    },
                    'query': {
                        isArray: false
                    }
                });
        }
        makeResource();

        var getTags = function (params) {
            return self.TagResource.query(params).$promise;
        };

        var getTag = function (id) {
            return self.TagResource.query({tagId: id}).$promise;
        };

        var createTag = function (params, success, error) {
            new self.TagResource(params).$save(success, error);
        };

        var updateTag = function (params, success, error) {
            self.TagResource.update(params, success, error);
        };

        var deleteTag = function (id, success, error) {
            self.TagResource.delete({tagId: id}, success, error);
        };

        var deleteMassTag = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('/api/client-anr/' + $rootScope.getUrlAnrId() + '/rolf-tags', ids, success, error);
            } else {
                MassDeleteService.deleteMass('/api/rolf-tags', ids, success, error);
            }
        };

        return {
            makeResource: makeResource,
            getTags: getTags,
            getTag: getTag,
            createTag: createTag,
            deleteTag: deleteTag,
            deleteMassTag: deleteMassTag,
            updateTag: updateTag
        };
    }

})
();
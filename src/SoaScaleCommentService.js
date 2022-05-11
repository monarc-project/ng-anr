(function () {

    angular
        .module('AnrModule')
        .factory('SoaScaleCommentService', [ '$resource', '$rootScope', SoaScaleCommentService ]);

    function SoaScaleCommentService($resource, $rootScope) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId" : "anr/:anrId";

        var makeResource = function () {

            self.SoaScaleCommentResource = $resource(
                'api/' + anr + '/soa-scale-comment/:soaScaleCommentId',
                {
                    soaScaleCommentId: '@id',
                    urlAnrId: $rootScope.getUrlAnrId(),
                    anrId: '@anrId'
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
                }
            );
        }

        makeResource();

        var getSoaScaleComments = function (params) {
            return self.SoaScaleCommentResource.query(params).$promise;
        };

        var getSoaScaleComment = function (id, anrId, language) {
            return self.SoaScaleCommentResource.query({soaScaleCommentId: id, anrId:anrId, language:language}).$promise;
        };

        var createSoaScaleComment = function (params, success, error) {
          return  new self.SoaScaleCommentResource(params).$save(success, error);
        };

        var updateSoaScaleComment = function (anrId, params, success, error) {
            self.SoaScaleCommentResource.update({anrId:anrId}, params, success, error);
        };

        var patchSoaScaleComment = function (anrId, params, success, error) {
            self.SoaScaleCommentResource.patch({anrId:anrId}, params, success, error);
        };

        var deleteSoaScaleComment = function (id, anrId, success, error) {
            self.SoaScaleCommentResource.delete({soaScaleCommentId: id, anrId:anrId}, success, error);
        };


        return {

            makeResource:makeResource,

            getSoaScaleComments: getSoaScaleComments,
            getSoaScaleComment: getSoaScaleComment,
            createSoaScaleComment: createSoaScaleComment,
            updateSoaScaleComment: updateSoaScaleComment,
            patchSoaScaleComment: patchSoaScaleComment,
            deleteSoaScaleComment: deleteSoaScaleComment,
        };
    }

})
();

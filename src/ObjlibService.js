(function () {

    angular
        .module('AnrModule')
        .factory('ObjlibService', [ '$resource', '$rootScope', '$http', ObjlibService ]);

    function ObjlibService($resource, $rootScope, $http) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.ObjlibResource = $resource('/api/' + anr + 'objects/:objlibId', {
                    objlibId: '@id',
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


            self.ObjlibCatResource = $resource('/api/' + anr + 'objects-categories/:objlibId', { objlibId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
                {
                    'update': {
                        method: 'PUT'
                    },
                    'query': {
                        isArray: false
                    }
                });

            self.AnrObjectsService = $resource($rootScope.OFFICE_MODE == 'FO' ? '/api/client-anr/:anrId/objects' : '/api/anr/:anrId/objects', {}, {'query': {isArray: false}});//on utilisera que query

            self.CommonObjectResource = $resource('/api/' + anr + 'objects/import/:objectId', { objectId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
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


            self.ObjlibNodeResource = $resource($rootScope.OFFICE_MODE == 'BO' ? '/api/objects-objects/:objlibId' : '/api/client-anr/:urlAnrId/objects-objects/:objlibId', { objlibId: '@id', urlAnrId: $rootScope.getUrlAnrId() },
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

        var getObjlibs = function (params) {
            return self.ObjlibResource.query(params).$promise;
        };

        var getObjlib = function (id, params) {
            var fullParams;
            if (params) {
                fullParams = angular.copy(params);
                fullParams.objlibId = id;
            } else {
                fullParams = {objlibId: id};
            }

            return self.ObjlibResource.query(fullParams).$promise;
        };

        var createObjlib = function (params, success, error) {
            new self.ObjlibResource(params).$save(success, error);
        };

        var updateObjlib = function (params, success, error) {
            self.ObjlibResource.update(params, success, error);
        };

        var deleteObjlib = function (id, success, error) {
            self.ObjlibResource.delete({objlibId: id}, success, error);
        };

        ////

        var getObjlibsCats = function (params) {
            return self.ObjlibCatResource.query(params).$promise;
        };

        var getObjlibCat = function (id) {
            return self.ObjlibCatResource.query({objlibId: id}).$promise;
        };

        var createObjlibCat = function (params, success, error) {
            new self.ObjlibCatResource(params).$save(success, error);
        };

        var updateObjlibCat = function (params, success, error) {
            self.ObjlibCatResource.update(params, success, error);
        };

        var deleteObjlibCat = function (id, success, error) {
            self.ObjlibCatResource.delete({objlibId: id}, success, error);
        };


        var getObjlibsNodes = function (params) {
            return self.ObjlibNodeResource.query(params).$promise;
        };

        var getObjlibNode = function (id) {
            return self.ObjlibNodeResource.query({objlibId: id}).$promise;
        };

        var createObjlibNode = function (params, success, error) {
            new self.ObjlibNodeResource(params).$save(success, error);
        };

        var moveObjlibNode = function (params, success, error) {
            if ($rootScope.OFFICE_MODE == 'BO') {
                $http.put('/api/objects-objects/' + params.id, params).then(success, error);
            } else {
                $http.put('/api/client-anr/' + $rootScope.getUrlAnrId() + '/objects-objects/' + params.id, params).then(success, error);
            }
        };

        var deleteObjlibNode = function (id, success, error) {
            self.ObjlibNodeResource.delete({objlibId: id}, success, error);
        };

        self.RiskResource = $resource('/api/objects-risks/:riskId', {riskId: '@id'},
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

        var getRisk = function (id) {
            return self.RiskResource.query({riskId: id}).$promise;
        };

        var updateRisk = function (id, params, success, error) {
            self.RiskResource.update({riskId: id}, params, success, error);
        };

        var patchRisk = function (id, params, success, error) {
            self.RiskResource.patch({riskId: id}, params, success, error);
        };

        ////

        var getObjectsOfAnr = function(anrid, params, success, error){
            params.anrId = anrid;
            return self.AnrObjectsService.query(params, success, error);
        }

        ////

        var getObjectsCommon = function (params) {
            return self.CommonObjectResource.query(params).$promise;
        };

        var getObjectCommon = function (id) {
            return self.CommonObjectResource.query({objectId: id}).$promise;
        };

        var importObjectCommon = function(id, mode, success, error) {
            self.CommonObjectResource.patch({objectId: id}, {object: id, mode: mode}, success, error);
        };

        return {
            makeResource: makeResource,

            getObjlibs: getObjlibs,
            getObjlib: getObjlib,
            createObjlib: createObjlib,
            deleteObjlib: deleteObjlib,
            updateObjlib: updateObjlib,

            getObjlibsCats: getObjlibsCats,
            getObjlibCat: getObjlibCat,
            createObjlibCat: createObjlibCat,
            updateObjlibCat: updateObjlibCat,
            deleteObjlibCat: deleteObjlibCat,

            getObjlibsNodes: getObjlibsNodes,
            getObjlibNode: getObjlibNode,
            createObjlibNode: createObjlibNode,
            moveObjlibNode: moveObjlibNode,
            deleteObjlibNode: deleteObjlibNode,

            getRisk: getRisk,
            updateRisk: updateRisk,
            patchRisk: patchRisk,

            getObjectsOfAnr: getObjectsOfAnr,
            getObjectsCommon: getObjectsCommon,
            getObjectCommon: getObjectCommon,
            importObjectCommon: importObjectCommon,

        };
    }

})
();

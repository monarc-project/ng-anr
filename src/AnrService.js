(function () {

    angular
        .module('AnrModule')
        .factory('AnrService', [ '$resource', 'ObjlibService', AnrService ]);

    function AnrService($resource, ObjlibService) {
        var self = this;

        self.AnrResource = $resource('/api/anr/:anrId', { anrId: '@anrId' },
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

        self.LibraryResource = $resource('/api/anr/:anrId/library/:objectId', { anrId: '@anrId', objectId: '@objectId' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        self.InstanceResource = $resource('/api/anr/:anrId/instances/:instId', { anrId: '@anrId', instId: '@instId' },
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

        self.InstanceRiskResource = $resource('/api/anr/:anrId/instances-risks/:riskId', {anrId: '@anrId', riskId: '@id'},
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

        self.InstanceOpRiskResource = $resource('/api/anr/:anrId/instances-oprisks/:riskId', {anrId: '@anrId', riskId: '@id'},
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

        self.ScalesResource = $resource('/api/anr/:anrId/scales/:scaleId', { anrId: '@anrId', scaleId: '@scaleId' },
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

        self.ScalesTypesResource = $resource('/api/anr/:anrId/scales-types/:scaleTypeId', { anrId: '@anrId', scaleTypeId: '@scaleTypeId' },
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

        self.ScalesCommentResource = $resource('/api/anr/:anrId/scales/:scaleId/comments/:commentId', { anrId: '@anrId', scaleId: '@scaleId', commentId: "@commentId" },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        self.InstancesConsequencesResource = $resource('/api/anr/:anrId/instances-consequences/:consId', { anrId: '@anrId', consId: '@consId' },
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


        // ANRs
        var patchAnr = function (anr_id, fields, success, error) {;
            self.AnrResource.patch({anrId: anr_id}, fields, success, error);
        };

        // Object library
        var addExistingObjectToLibrary = function (anr_id, object_id, success, error) {
            new self.LibraryResource({anrId: anr_id, objectId: object_id}).$save(success, error);
        };

        var addNewObjectToLibrary = function (anr_id, object, success, error) {
            ObjlibService.createObjlib(object, function (data) {
                addExistingObjectToLibrary(anr_id, data.id, success, error);
            }, error);
        };

        var removeObjectFromLibrary = function (anr_id, object_id, success, error) {
            self.LibraryResource.delete({anrId: anr_id, objectId: object_id}, success, error);
        };

        var getObjectsLibrary = function (anr_id) {
            return self.LibraryResource.query({anrId: anr_id}).$promise;
        };

        // Instances
        var getInstances = function (anr_id) {
            return self.InstanceResource.query({anrId: anr_id}).$promise;
        };

        var getInstance = function (anr_id, instance_id) {
            return self.InstanceResource.query({anrId: anr_id, instId: instance_id}).$promise;
        };

        var deleteInstance = function (anr_id, instance_id, success, error) {
            self.InstanceResource.delete({instId: instance_id, anrId: anr_id}, success, error);
        };

        var addInstance = function (anr_id, object_id, parent_id, position, success, error) {
            new self.InstanceResource({object: object_id, parent: parent_id, position: position, anrId: anr_id}).$save(success, error);
        };

        var updateInstance = function (anr_id, instance, success, error) {
            self.InstanceResource.update({anrId: anr_id, instId: instance.id}, instance, success, error);
        };

        var moveInstance = function (anr_id, instance_id, parent_id, position, success, error) {
            self.InstanceResource.patch({instId: instance_id, anrId: anr_id, parent: parent_id, position: position}, success, error);
        };

        var getInstanceRisk = function (anr_id, id) {
            return self.InstanceRiskResource.query({anrId: anr_id, riskId: id}).$promise;
        };

        var updateInstanceRisk = function (anr_id, id, params, success, error) {
            self.InstanceRiskResource.update({anrId: anr_id, riskId: id}, params, success, error);
        };

        var patchInstanceRisk = function (anr_id, id, params, success, error) {
            self.InstanceRiskResource.patch({anrId: anr_id, riskId: id}, params, success, error);
        };

        var getInstanceOpRisk = function (anr_id, id) {
            return self.InstanceOpRiskResource.query({anrId: anr_id, riskId: id}).$promise;
        };

        var updateInstanceOpRisk = function (anr_id, id, params, success, error) {
            self.InstanceOpRiskResource.update({anrId: anr_id, riskId: id}, params, success, error);
        };

        var patchInstanceOpRisk = function (anr_id, id, params, success, error) {
            self.InstanceOpRiskResource.patch({anrId: anr_id, riskId: id}, params, success, error);
        };


        // Scales
        var getScales = function (anr_id) {
            return self.ScalesResource.query({anrId: anr_id}).$promise;
        };

        var updateScale = function (anr_id, type, min, max, success, error) {
            return self.ScalesResource.update({anrId: anr_id, scaleId: type}, {min: min, max: max}, success, error);
        };

        var getScalesTypes = function (anr_id) {
            return self.ScalesTypesResource.query({anrId: anr_id}).$promise;
        };

        var createScaleType = function (anr_id, scale_id, label1, success, error) {
            new self.ScalesTypesResource({anrId: anr_id, anr: anr_id, scale: scale_id, label1: label1, isHidden: false, isSys: false, implicitPosition: 1}).$save(success, error);
        };

        var patchScaleType = function (anr_id, scale_type_id, data, success, error) {
            self.ScalesTypesResource.patch({anrId: anr_id, scaleTypeId: scale_type_id}, data, success, error);
        };

        // Scales comments
        var getScaleComments = function (anr_id, type) {
            return self.ScalesCommentResource.query({anrId: anr_id, scaleId: type}).$promise;
        };

        var createScaleComment = function (anr_id, scale_id, row, comment, type_impact_id, success, error) {
            new self.ScalesCommentResource({anrId: anr_id, scaleId: scale_id, val: row, scaleImpactType: type_impact_id, comment1: comment}).$save(success, error);
        };

        var updateScaleComment = function (anr_id, scale_id, comment_id, params, success, error) {
            if (params.scaleImpactType && params.scaleImpactType.id) {
                params.scaleImpactType = params.scaleImpactType.id;
            }

            return self.ScalesCommentResource.update({anrId: anr_id, scaleId: scale_id, commentId: comment_id}, params, success, error);
        };

        // Instances (unforeseen) consequences
        var getInstancesConsequences = function (anr_id) {
            return self.InstancesConsequencesResource.query({anrId: anr_id}).$promise;
        };

        var patchInstanceConsequence = function (anr_id, cons_id, data, success, error) {
            self.InstancesConsequencesResource.patch({anrId: anr_id, consId: cons_id}, data, success, error);
        };


        return {
            patchAnr: patchAnr,

            addExistingObjectToLibrary: addExistingObjectToLibrary,
            addNewObjectToLibrary: addNewObjectToLibrary,
            removeObjectFromLibrary: removeObjectFromLibrary,
            getObjectsLibrary: getObjectsLibrary,

            getScales: getScales,
            updateScale: updateScale,

            getScalesTypes: getScalesTypes,
            createScaleType: createScaleType,
            patchScaleType: patchScaleType,

            getScaleComments: getScaleComments,
            createScaleComment: createScaleComment,
            updateScaleComment: updateScaleComment,

            getInstances: getInstances,
            getInstance: getInstance,
            deleteInstance: deleteInstance,
            addInstance: addInstance,
            updateInstance: updateInstance,
            moveInstance: moveInstance,

            getInstanceRisk: getInstanceRisk,
            updateInstanceRisk: updateInstanceRisk,
            patchInstanceRisk: patchInstanceRisk,

            getInstanceOpRisk: getInstanceOpRisk,
            updateInstanceOpRisk: updateInstanceOpRisk,
            patchInstanceOpRisk: patchInstanceOpRisk,

            getInstancesConsequences: getInstancesConsequences,
            patchInstanceConsequence: patchInstanceConsequence
        };
    }

})
();
(function () {

    angular
        .module('AnrModule')
        .factory('AnrService', [ '$resource', '$rootScope', 'MassDeleteService','ObjlibService', AnrService ])
        .controller('AnrService', ['$scope', 'ConfigService']);

    function AnrService($resource, $rootScope, MassDeleteService, ObjlibService) {
        var self = this;

        self.AnrResource = $resource('api/anr/:anrId', { anrId: '@anrId' },
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

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr" : "anr";

        self.AnrRisksResource = $resource('api/' + anr + '/:anrId/risks/:instId', { anrId: '@anrId', instId: '@instId' },
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

        self.AnrRisksOpResource = $resource('api/' + anr + '/:anrId/risksop/:instId', { anrId: '@anrId', instId: '@instId' },
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

        self.AnrRiskOwnersResource = $resource('api/' + anr + '/:anrId/risk-owners', { anrId: '@anrId'},
            {
                'query': {
                    isArray: false
                }
            });

        self.LibraryResource = $resource('api/' + anr + '/:anrId/library/:objectId', { anrId: '@anrId', objectId: '@objectId' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                },
                'patch': {
                    method: 'PATCH'
                },
            });

        self.LibraryCategoryResource = $resource('api/' + anr + '/:anrId/library-category/:catId', { anrId: '@anrId', catId: '@catId' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                },
                'patch': {
                    method: 'PATCH'
                },
            });

        self.InstanceResource = $resource('api/' + anr + '/:anrId/instances/:instId', { anrId: '@anrId', instId: '@instId' },
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

        self.InstanceRiskResource = $resource('api/' + anr + '/:anrId/instances-risks/:riskId', {anrId: '@anrId', riskId: '@id'},
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

        self.InstanceOpRiskResource = $resource('api/' + anr + '/:anrId/instances-oprisks/:riskId', {anrId: '@anrId', riskId: '@id'},
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

        self.ScalesResource = $resource('api/' + anr + '/:anrId/scales/:scaleId', { anrId: '@anrId', scaleId: '@scaleId' },
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

        self.ScalesTypesResource = $resource('api/' + anr + '/:anrId/scales-types/:scaleTypeId', { anrId: '@anrId', scaleTypeId: '@scaleTypeId' },
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

        self.ScalesCommentResource = $resource('api/' + anr + '/:anrId/scales/:scaleId/comments/:commentId', { anrId: '@anrId', scaleId: '@scaleId', commentId: "@commentId" },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        self.OperationalRiskScalesResource = $resource('api/' + anr + '/:anrId/operational-scales/:operationalRiskScaleId', { anrId: '@anrId', operationalRiskScaleId: '@operationalRiskScaleId' },
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

        self.OperationalRiskScalesCommentResource = $resource('api/' + anr + '/:anrId/operational-scales/:operationalRiskScaleId/comments/:operationalRiskScaleCommentId', { anrId: '@anrId', operationalRiskScaleId: '@operationalRiskScaleId', operationalRiskScaleCommentId: "@operationalRiskScaleCommentId" },
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

        self.InstancesConsequencesResource = $resource('api/' + anr + '/:anrId/instances-consequences/:consId', { anrId: '@anrId', consId: '@consId' },
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

        var patchLibraryObject = function (anr_id, object_id, obj, success, error) {
            self.LibraryResource.patch({anrId: anr_id, objectId: object_id}, obj, success, error);
        };

        var patchLibraryCategory = function (anr_id, cat_id, obj, success, error) {
            self.LibraryCategoryResource.patch({anrId: anr_id, catId: cat_id}, obj, success, error);
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
            return self.ScalesTypesResource.query({anrId: anr_id, order:'position'}).$promise;
        };

        var createScaleType = function (anr_id, scale_id, labels, success, error) {
            new self.ScalesTypesResource({anrId: anr_id, scale: scale_id, labels: labels, implicitPosition: 2}).$save(success, error);
        };

        var patchScaleType = function (anr_id, scale_type_id, data, success, error) {
            self.ScalesTypesResource.patch({anrId: anr_id, scaleTypeId: scale_type_id}, data, success, error);
        };

        var deleteScaleType = function (anr_id, scale_type_id, success, error) {
            self.ScalesTypesResource.delete({anrId: anr_id, scaleTypeId: scale_type_id}, success, error);
        };

        // Scales comments
        var getScaleComments = function (anr_id, type) {
            return self.ScalesCommentResource.query({anrId: anr_id, scaleId: type}).$promise;
        };

        var createScaleComment = function ( anr_id, scale_id, row, comments, type_impact_id, success, error) {
            let params = {
              anrId: anr_id,
              scaleId: scale_id,
              scaleIndex: row,
              scaleValue: row,
              scaleImpactType: type_impact_id,
              [Object.keys(comments)]: Object.values(comments)[0]
            };

            new self.ScalesCommentResource(params).$save(success, error);
        };

        var updateScaleComment = function (anr_id, scale_id, comment_id, params, success, error) {
            if (params.scaleImpactType && params.scaleImpactType.id) {
                params.scaleImpactType = params.scaleImpactType.id;
            }

            return self.ScalesCommentResource.update({anrId: anr_id, scaleId: scale_id, commentId: comment_id}, params, success, error);
        };

        // operational scales
        var getOperationalRiskScales = function (anr_id, language) {
            return self.OperationalRiskScalesResource.query({anrId: anr_id, language: language}).$promise;
        };

        var createOperationalRiskScale = function (anr_id, scaleId, label, min, max, comments, success, error) {
            new self.OperationalRiskScalesResource({anrId: anr_id, scaleId: scaleId, label: label, min: min, max: max, comments : comments, type: 1}).$save(success, error);
        };

        var deleteOperationalRiskScales = function (ids, success, error) {
            if ($rootScope.OFFICE_MODE == 'FO') {
                MassDeleteService.deleteMass('api/client-anr/' + $rootScope.getUrlAnrId() + '/operational-scales', ids, success, error);
            } else {
                MassDeleteService.deleteMass('api/delete-operational-scales', ids, success, error);
            }
        };

        var updateOperationalRiskScale = function (anr_id, scale_id, params, success, error) {
            return self.OperationalRiskScalesResource.update({anrId: anr_id, operationalRiskScaleId: scale_id}, params, success, error);
        };

        var updateValueForAllOperationalRiskScale = function(anr_id, params, success,error){
            return self.OperationalRiskScalesResource.patch({anrId: anr_id}, params, success, error);
        };

        //operational risk scale comment
        var updateOperationalRiskScaleComment = function (anr_id, scale_id, comment_id, params, success, error) {
            return self.OperationalRiskScalesCommentResource.update({anrId: anr_id, operationalRiskScaleId: scale_id, operationalRiskScaleCommentId: comment_id}, params, success, error);
        };


        // Instances (unforeseen) consequences
        var getInstancesConsequences = function (anr_id) {
            return self.InstancesConsequencesResource.query({anrId: anr_id}).$promise;
        };

        var patchInstanceConsequence = function (anr_id, cons_id, data, success, error) {
            self.InstancesConsequencesResource.patch({anrId: anr_id, consId: cons_id}, data, success, error);
        };

        // ANR risks
        var getInstanceRisks = function (anr_id, inst_id, params) {
            var query = angular.copy(params);
            query.anrId = anr_id;
            query.instId = inst_id;
            return self.AnrRisksResource.query(query).$promise;
        };

        var getAnrRisks = function (anr_id, params) {
            var query = angular.copy(params);
            query.anrId = anr_id;
            return self.AnrRisksResource.query(query).$promise;
        };

        var getAnrRiskOwners = function (anr_id, params) {
            var query = angular.copy(params);
            query.anrId = anr_id;
            return self.AnrRiskOwnersResource.query(query).$promise;
        };

        var createInstanceRisk = function (anr_id, params, success, error) {
            params.anrId = anr_id;
            new self.AnrRisksResource(params).$save(success, error);
        };

        var deleteInstanceRisk = function (anr_id, risk_id, success, error) {
            self.AnrRisksResource.delete({anrId: anr_id, instId: risk_id}, success, error);
        };

        var getInstanceRisksOp = function (anr_id, inst_id, params) {
            var query = angular.copy(params);
            query.anrId = anr_id;
            query.instId = inst_id;
            return self.AnrRisksOpResource.query(query).$promise;
        };

        var getAnrRisksOp = function (anr_id, params) {
            var query = angular.copy(params);
            query.anrId = anr_id;
            return self.AnrRisksOpResource.query(query).$promise;
        };

        var createInstanceRiskOp = function (anr_id, params, success, error) {
            params.anrId = anr_id;
            new self.AnrRisksOpResource(params).$save(success, error);
        };

        var deleteInstanceRiskOp = function (anr_id, risk_id, success, error) {
            self.AnrRisksOpResource.delete({anrId: anr_id, instId: risk_id}, success, error);
        };


        return {
            patchAnr: patchAnr,

            addExistingObjectToLibrary: addExistingObjectToLibrary,
            addNewObjectToLibrary: addNewObjectToLibrary,
            removeObjectFromLibrary: removeObjectFromLibrary,
            getObjectsLibrary: getObjectsLibrary,
            patchLibraryObject: patchLibraryObject,
            patchLibraryCategory: patchLibraryCategory,

            getScales: getScales,
            updateScale: updateScale,

            getScalesTypes: getScalesTypes,
            createScaleType: createScaleType,
            patchScaleType: patchScaleType,
            deleteScaleType: deleteScaleType,

            getOperationalRiskScales: getOperationalRiskScales,
            createOperationalRiskScale: createOperationalRiskScale,
            deleteOperationalRiskScales: deleteOperationalRiskScales,
            updateOperationalRiskScale: updateOperationalRiskScale,
            updateValueForAllOperationalRiskScale: updateValueForAllOperationalRiskScale,

            getScaleComments: getScaleComments,
            createScaleComment: createScaleComment,
            updateScaleComment: updateScaleComment,

            updateOperationalRiskScaleComment: updateOperationalRiskScaleComment,

            getInstances: getInstances,
            getInstance: getInstance,
            deleteInstance: deleteInstance,
            addInstance: addInstance,
            updateInstance: updateInstance,
            moveInstance: moveInstance,

            getInstanceRisks: getInstanceRisks,
            getInstanceRisksOp: getInstanceRisksOp,
            getInstanceRisk: getInstanceRisk,
            createInstanceRisk: createInstanceRisk,
            deleteInstanceRisk: deleteInstanceRisk,
            updateInstanceRisk: updateInstanceRisk,
            patchInstanceRisk: patchInstanceRisk,

            getInstanceOpRisk: getInstanceOpRisk,
            createInstanceOpRisk: createInstanceRiskOp,
            deleteInstanceOpRisk: deleteInstanceRiskOp,
            updateInstanceOpRisk: updateInstanceOpRisk,
            patchInstanceOpRisk: patchInstanceOpRisk,

            getInstancesConsequences: getInstancesConsequences,
            patchInstanceConsequence: patchInstanceConsequence,

            getAnrRisks: getAnrRisks,
            getAnrRisksOp: getAnrRisksOp,
            getAnrRiskOwners: getAnrRiskOwners,

        };
    }

})
();

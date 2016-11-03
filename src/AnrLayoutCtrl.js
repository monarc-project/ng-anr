(function () {

    angular
        .module('AnrModule')
        .controller('AnrLayoutCtrl', [
            '$scope', 'toastr', '$http', '$q', '$mdMedia', '$mdDialog', '$timeout', 'gettextCatalog', 'TableHelperService',
            'ModelService', 'ObjlibService', 'AnrService', '$stateParams', '$rootScope', '$location', '$state', 'ToolsAnrService',
            AnrLayoutCtrl
        ]);

    /**
     * ANR MAIN LAYOUT CONTROLLER
     */
    function AnrLayoutCtrl($scope, toastr, $http, $q, $mdMedia, $mdDialog, $timeout, gettextCatalog, TableHelperService, ModelService,
                           ObjlibService, AnrService, $stateParams, $rootScope, $location, $state, ToolsAnrService) {
        var self = this;

        $scope.ToolsAnrService = ToolsAnrService;
        $scope.GlobalResizeMenuSize = "";
        $scope.GlobalResizeMenuContentHide = false;
        var minWidthMenu = 80;
        var isModelLoading = false;

        $scope.$on("angular-resizable.resizeEnd", function (event, args) {
            if(args.id != undefined && args.id == 'global-resize-menu' && parseInt(args.width) <= minWidthMenu){
                $scope.GlobalResizeMenuSize = 0;
            }
        });
        $scope.$on("angular-resizable.resizing", function (event, args) {
            if(args.id != undefined && args.id == 'global-resize-menu'){
                $scope.GlobalResizeMenuContentHide = (parseInt(args.width) <= minWidthMenu);
                $scope.GlobalResizeMenuSize = args.width;
            }
        });

        // Called by ObjectCtrl when an object has been modified
        $rootScope.hookUpdateObjlib = function (gotofirst) {
            $scope.updateInstances();
            $scope.updateObjectsLibrary(gotofirst);
        };

        $scope.updateModel = function (justCore) {
            isModelLoading = true;
            ModelService.getModel($stateParams.modelId).then(function (data) {
                $scope.model = data;
                $rootScope.anr_id = data.anr.id;

                thresholdsWatchSetup = false;
                $scope.thresholds = {
                    thresholds: {min: $scope.model.anr.seuil1, max: $scope.model.anr.seuil2},
                    rolf_thresholds: {min: $scope.model.anr.seuilRolf1, max: $scope.model.anr.seuilRolf2}
                }

                if (!justCore) {
                    $scope.updateInstances();
                    $scope.updateObjectsLibrary();
                    $scope.updateScales();
                }

                $scope.oprisks = $scope.model.anr.risksop; // for the _table_risks_op.html partial
                $scope.risks = $scope.model.anr.risks; // for the _table_risks.html partial

                isModelLoading = false;
            });
        };

        $scope.updateModel();
        $scope.instmode = 'anr';

        $scope.clearSelectedInstAndObj = function () {
            $rootScope.anr_selected_instance_id = null;
            $rootScope.anr_selected_object_id = null;
        }

        $scope.openRiskSheet = function (risk) {
            $scope.sheet_risk = risk;

            var reducAmount = [];
            if($scope.scales.vulns != undefined){
                for(var i = $scope.scales.vulns.min; i <= $scope.scales.vulns.max; i++){
                    reducAmount.push(i);
                    if(risk.vulnerabilityRate != '-1' && i == risk.vulnerabilityRate){
                        break;
                    }
                }
            }
            $scope.reducAmount = reducAmount;
        };

        $scope.resetSheet = function () {
            $scope.sheet_risk = undefined;
        };

        $scope.openOpRiskSheet = function (risk) {
            $scope.opsheet_risk = risk;
        };

        $scope.resetOpSheet = function () {
            $scope.opsheet_risk = undefined;
        };

        /**
         * Risk analysis
         */
        // Progress
        $scope.methodProgress = [
            {
                color: 'green',
                label: gettextCatalog.getString("Context setup"),
                deliverable: gettextCatalog.getString("Context validation"),
                steps: [
                    {label: gettextCatalog.getString("Risks analysis context"), done: true},
                    {label: gettextCatalog.getString("Trends evaluation, threats evaluation, synthesis"), done: true},
                    {label: gettextCatalog.getString("Risks management context"), done: true},
                    {label: gettextCatalog.getString("Evaluation, acceptance and impact criterias setup"), done: true},
                ]
            },
            {
                color: 'blue',
                label: gettextCatalog.getString("Context modeling"),
                deliverable: gettextCatalog.getString("Model validation"),
                steps: [
                    {label: gettextCatalog.getString("Identification of assets, vulnerabilities and impacts assessment"), done: true},
                    {label: gettextCatalog.getString("Synthesis of assets / impacts"), done: true},
                ]
            },
            {
                color: 'yellow',
                label: gettextCatalog.getString("Risks evaluation and treatment"),
                deliverable: gettextCatalog.getString("Final report"),
                steps: [
                    {label: gettextCatalog.getString("Risks estimation, evaluation and processing"), done: true},
                    {label: gettextCatalog.getString("Risk treatment plan management"), done: false},
                ]
            },
            {
                color: 'red',
                label: gettextCatalog.getString("Implementation and monitoring"),
                deliverable: null,
                steps: [
                    {label: gettextCatalog.getString("Management of the implementation of the risk treatment plan"), done: false},
                ]
            }
        ];

        $scope.getMethodTextColor = function (step, subStep) {
            if (subStep.done) {
                return 'txt-' + step.color;
            } else {
                return '';
            }
        };

        $scope.isMethodStepComplete = function (step) {
            var complete = true;
            for (var i = 0; i < step.steps.length; ++i) {
                if (!step.steps[i].done) {
                    complete = false;
                    break;
                }
            }

            return complete;
        };

        // Tree
        $scope.anr_obj_instances_data = null;
        $scope.anr_obj_library_data = null;

        // As our controllers are static in this zone, we must go through the rootScope to update the selected instance
        // ID from the child controller (AnrObjectInstanceCtrl)
        $rootScope.anr_selected_instance_id = $stateParams.instId;
        $rootScope.anr_selected_object_id = $stateParams.objectId;

        $scope.filter = {
            instance: '',
            library: ''
        };

        $scope.wrapAll = function () {
            var scope = angular.element(document.getElementById('insTree')).scope();
            scope.$broadcast('angular-ui-tree:collapse-all');
        };

        $scope.unwrapAll = function () {
            var scope = angular.element(document.getElementById('insTree')).scope();
            scope.$broadcast('angular-ui-tree:expand-all');
        };

        $scope.toggle = function (scope) {
            scope.toggle();
        }

        $scope.visible = function (item) {
            if (item.type == 'lib') {
                return !($scope.filter.library && $scope.filter.library.length > 0 &&
                    item.name1.toLowerCase().indexOf($scope.filter.library.toLowerCase()) == -1);
            } else if (item.type == 'inst') {
                return !($scope.filter.instance && $scope.filter.instance.length > 0 &&
                item.name1.toLowerCase().indexOf($scope.filter.instance.toLowerCase()) == -1);
            }

            return true;
        };

        $scope.insTreeCallbacks = {
            accept: function (sourceNodeScope, destNodeScope, destIndex) {
                return (sourceNodeScope.$modelValue.type != 'libcat');
            },

            dropped: function (e) {
                if (e.source.nodesScope.$treeScope.$id == e.dest.nodesScope.$treeScope.$id) {
                    var obj = e.source.nodeScope.$modelValue;
                    AnrService.moveInstance($scope.model.anr.id, obj.id, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function () {
                        $scope.updateInstances();
                    });

                    return true;
                } else {
                    return false;
                }
            }
        };

        $scope.libTreeCallbacks = {
            beforeDrag: function (scopeDrag) {
                return (scopeDrag.$modelValue.type != 'libcat' || scopeDrag.$modelValue.depth == 0);
            },

            accept: function (sourceNodeScope, destNodeScope, destIndex) {
                return (sourceNodeScope.$treeScope.$id == destNodeScope.$treeScope.$id
                    && sourceNodeScope.$modelValue.depth == 0
                    && destNodeScope.$parent.$type == 'uiTree');
            },

            dropped: function (e) {
                if (e.source.nodesScope.$treeScope.$id == e.dest.nodesScope.$treeScope.$id) {
                    if(e.source.nodeScope.$modelValue.type == 'libcat'){//si on bouge un objet, ça n'a pas d'intérêt de patcher les catégories
                        // We moved something locally inside the objects library (a first-level node), patch it
                        AnrService.patchLibraryCategory($scope.model.anr.id, e.source.nodeScope.$modelValue.id, {position: e.dest.index}, function () {
                            $scope.updateObjectsLibrary();
                        });
                    }
                    return true;
                } else {
                    // Make a copy of the item from the library tree to the inst tree
                    var copy = angular.copy(e.source.nodeScope.$modelValue);
                    e.source.nodeScope.$modelValue.type = 'inst';
                    e.source.nodeScope.$modelValue.disableclick = true;

                    e.source.nodesScope.$modelValue.push(copy);

                    // Also, tell the server to instantiate the object
                    AnrService.addInstance($scope.model.anr.id, copy.id, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function () {
                        $scope.updateInstances();
                        e.source.nodeScope.$modelValue.disableclick = false;
                        $scope.$broadcast('object-instancied', {oid: copy.id});
                    });

                    return true;
                }
            }
        };


        $scope.updateObjectsLibrary = function (gotofirst, callback) {
            AnrService.getObjectsLibrary($scope.model.anr.id).then(function (data) {
                var recurseFillTree = function (category, depth) {
                    var output = {id: category.id, type: 'libcat', label1: category.label1, depth: depth, __children__: []};

                    if (category.child && category.child.length > 0) {
                        for (var i = 0; i < category.child.length; ++i) {
                            output.__children__.push(recurseFillTree(category.child[i], depth + 1));
                        }
                    }

                    if (category.objects && category.objects.length > 0) {
                        for (var i = 0; i < category.objects.length; ++i) {
                            var obj = category.objects[i];
                            obj.type = 'lib';
                            obj.__children__ = [];
                            output.__children__.push(obj);
                            if($scope.first_object == null){
                                $scope.first_object = obj;
                            }
                        }
                    }

                    return output;
                };

                var lib_data = [];
                $scope.first_object = null;
                for (var v = 0; v < data.categories.length; ++v) {
                    var cat = data.categories[v];
                    lib_data.push(recurseFillTree(cat, 0));
                }
                $scope.anr_obj_library_data = lib_data;

                if(gotofirst != undefined && gotofirst){
                    if($scope.first_object != null){
                        $location.path('/backoffice/kb/models/'+$stateParams.modelId+'/object/'+$scope.first_object.id);
                    }
                    else{
                        $location.path('/backoffice/kb/models/'+$stateParams.modelId);
                    }
                }

                if(callback != undefined){
                    callback.call();
                }
            });
        };

        $scope.updateInstances = function () {
            AnrService.getInstances($scope.model.anr.id).then(function (data) {
                $scope.anr_obj_instances_data = [];

                var recurseFillTree = function (instance) {
                    var output = {id: instance.id, type: 'inst', scope: instance.scope, name1: instance.name1, __children__: []};

                    if (instance.child && instance.child.length > 0) {
                        for (var i = 0; i < instance.child.length; ++i) {
                            output.__children__.push(recurseFillTree(instance.child[i]));
                        }
                    }

                    if (instance.objects && instance.objects.length > 0) {
                        for (var i = 0; i < instance.objects.length; ++i) {
                            output.__children__.push(instance.objects[i]);
                        }
                    }

                    return output;
                };

                for (var v = 0; v < data.instances.length; ++v) {
                    var instance = data.instances[v];
                    $scope.anr_obj_instances_data.push(recurseFillTree(instance));
                }
            });

        };

        $scope.inlineNumberValidator = function (val) {
            return (parseInt(val) == val);
        };

        $scope.updateInfoRiskColumns = function () {
            var header = [];
            for (var t = $scope.scales.threats.min; t <= $scope.scales.threats.max; ++t) {
                for (var v = $scope.scales.vulns.min; v <= $scope.scales.vulns.max; ++v) {
                    var prod = t * v;
                    if (header.indexOf(prod) < 0) {
                        header.push(prod);
                    }
                }
            }

            $scope.info_risk_columns = header.sort(function (a, b) {
                return parseInt(a) - parseInt(b);
            });
        };

        $scope.scales = {
            impacts: {min: 0, max: 3},
            threats: {min: 0, max: 4},
            vulns: {min: 0, max: 3},
        };

        $scope.comms = {
            impact: [],
            threat: [],
            vuln: []
        }

        $scope.info_risk_columns = [];
        $scope.info_risk_rows = [];

        var scaleWatchSetup = false;
        var thresholdsWatchSetup = false;
        var commsWatchSetup = false;

        $scope.$watch('thresholds', function () {
            if ($scope.model && $scope.model.anr && thresholdsWatchSetup) {
                // This structure holds (ROLF) thresholds, as well as scales ranges
                AnrService.patchAnr($scope.model.anr.id, {
                    seuil1: $scope.thresholds.thresholds.min,
                    seuil2: $scope.thresholds.thresholds.max,
                    seuilRolf1: $scope.thresholds.rolf_thresholds.min,
                    seuilRolf2: $scope.thresholds.rolf_thresholds.max,
                });
            }

            $scope.updateInfoRiskColumns();
            $scope.info_risk_rows = $rootScope.range($scope.scales.impacts.min, $scope.scales.impacts.max);
            thresholdsWatchSetup = true;
        }, true);

        var updateScale = function(id, model) {
            if (model.min > model.max) model.min = model.max;
            if (model.max < model.min) model.max = model.min;

            var promise = $q.defer();
            AnrService.updateScale($scope.model.anr.id, id, model.min, model.max, function () {
                $q.resolve();
            }, function () {
                $q.reject();
            });
            return promise;
        };

        $scope.onImpactScaleChanged = function (model, value) {
            return updateScale($scope.scales.impacts.id, model);
        };

        $scope.onThreatScaleChanged = function (model, value) {
            return updateScale($scope.scales.threats.id, model);
        };

        $scope.onVulnScaleChanged = function (model, value) {
            return updateScale($scope.scales.vulns.id, model);
        };

        var updateComm = function (model_id, row_id, model) {
            var promise = $q.defer();

            AnrService.updateScaleComment($scope.model.anr.id, model_id, row_id, model, function () {
                promise.resolve();
            }, function () {
                promise.reject();
            });

            return promise;
        };

        var createComm = function (model_id, row_id, comment, impactType) {
            var promise = $q.defer();

            AnrService.createScaleComment($scope.model.anr.id, model_id, row_id, comment, impactType, function () {
                promise.resolve();
            }, function () {
                promise.reject();
            });

            return promise;
        };

        $scope.onImpactCommChanged = function (model, value) {
            if (!model.id) {
                return createComm($scope.scales.impacts.id, model.val, model[value], model.scaleImpactType);
            } else {
                return updateComm($scope.scales.impacts.id, model.id, model);
            }
        };

        $scope.onThreatCommChanged = function (model, value) {
            if (!model.id) {
                return createComm($scope.scales.threats.id, model.val, model[value]);
            } else {
                return updateComm($scope.scales.threats.id, model.id, model);
            }
        };

        $scope.onVulnCommChanged = function (model, value) {
            if (!model.id) {
                return createComm($scope.scales.vulns.id, model.val, model[value]);
            } else {
                return updateComm($scope.scales.vulns.id, model.id, model);
            }
        };

        $scope.newColumn = { name: null };
        $scope.onCreateNewColumn = function (newValue) {
            AnrService.createScaleType($scope.model.anr.id, $scope.scales.impacts.id, newValue, function () {
                $scope.updateScaleTypes();
                $scope.newColumn.name = null;
                $scope.$broadcast('scales-impacts-type-changed');
            });
        };

        $scope.setImpactVisibility = function (id, visible) {
            AnrService.patchScaleType($scope.model.anr.id, id, {isHidden: visible ? 0 : 1}, function () {
                $scope.updateScaleTypes();
                $scope.$broadcast('scales-impacts-type-changed');
            });
        };

        $scope.deleteCustomScaleType = function (id) {
            AnrService.deleteScaleType($scope.model.anr.id, id, function () {
                toastr.success(gettextCatalog.getString("The impact scale type has been deleted successfully."), gettextCatalog.getString("Scale type deleted"));
                $scope.updateScaleTypes();
                $scope.$broadcast('scales-impacts-type-changed');
            });
        };

        $scope.editAnrInfo = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ConfigService', 'anr', '$stateParams', CreateAnrDialogCtrl],
                templateUrl: '/views/dialogs/create.anr.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: true,
                fullscreen: useFullScreen,
                locals: {
                    anr: $scope.model.anr
                }
            })
                .then(function (anr) {
                    AnrService.patchAnr($scope.model.anr.id, anr, function () {
                        toastr.success(gettextCatalog.getString("The risk analysis details have been updated"), gettextCatalog.getString("Update successful"));
                    });
                });
        };

        $scope.addObject = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));



                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', '$q', '$state', 'ObjlibService', 'AnrService', '$stateParams', '$location', '$parentScope', 'anr_id', 'categories',  AddObjectDialogCtrl],
                    templateUrl: '/views/anr/add.objlib.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    locals: {
                        '$parentScope': $scope,
                        anr_id: $scope.model.anr.id,
                        categories: $scope.categories
                    }
                })
                .then(function (objlib) {
                    if (objlib && objlib.id) {
                        AnrService.addExistingObjectToLibrary($scope.model.anr.id, objlib.id, function () {
                            $scope.updateObjectsLibrary(false, function(){
                                $location.path('/backoffice/kb/models/'+$scope.model.id+'/object/'+objlib.id);
                            });
                            toastr.success(gettextCatalog.getString("The object has been added to the library."), gettextCatalog.getString("Object added successfully"));
                        });
                    }
                });
           // });
        };

        // C'est pas beau mais pas le choix, on doit pré-initialiser les objets pour le binding des editable
        for (var j = 0; j < 100; ++j) {
            $scope.comms.threat[j] = {
                id: null,
                comment1: null,
                comment2: null,
                comment3: null,
                comment4: null,
                val: j
            };

            $scope.comms.vuln[j] = {
                id: null,
                comment1: null,
                comment2: null,
                comment3: null,
                comment4: null,
                val: j
            };
        }

        $scope.updateScales = function () {
            AnrService.getScales($scope.model.anr.id).then(function (data) {
                for (var i = 0; i < data.scales.length; ++i) {
                    var scale = data.scales[i];

                    // We initialize empty objects for comments, then we call getScaleComments. Because Zend.
                    // When we post a comment, we need to check if the ID is empty or not, and call POST/PUT methods
                    // accordingly on the scales/:id/comments endpoint. For UI/UX reasons, we need to filter everything
                    // here since we don't have proper backend endpoints.

                    scaleWatchSetup = false;
                    commsWatchSetup = false;
                    if (scale.type == "impact") {
                        $scope.scales.impacts.min = scale.min;
                        $scope.scales.impacts.max = scale.max;
                        $scope.scales.impacts.type = scale.type;
                        $scope.scales.impacts.id = scale.id;
                    } else if (scale.type == "threat") {
                        $scope.scales.threats.min = scale.min;
                        $scope.scales.threats.max = scale.max;
                        $scope.scales.threats.type = scale.type;
                        $scope.scales.threats.id = scale.id;
                    } else if (scale.type == "vulnerability") {
                        $scope.scales.vulns.min = scale.min;
                        $scope.scales.vulns.max = scale.max;
                        $scope.scales.vulns.type = scale.type;
                        $scope.scales.vulns.id = scale.id;
                    }
                }

                $scope.updateScaleTypes();
            });

        };

        $scope.updateScaleTypes = function () {
            AnrService.getScalesTypes($scope.model.anr.id).then(function (data) {
                $scope.scales_types = data.types;

                // Same as above, setup placeholder comments structures
                for (var i = $scope.scales.impacts.min; i <= $scope.scales.impacts.max; ++i) {
                    if (!$scope.comms.impact[i]) {
                        $scope.comms.impact[i] = {};
                    }

                    for (var j = 0; j < $scope.scales_types.length; ++j) {
                        if (!$scope.comms.impact[i][$scope.scales_types[j].id]) {
                            $scope.comms.impact[i][$scope.scales_types[j].id] = {
                                id: null,
                                comment1: null,
                                comment2: null,
                                comment3: null,
                                comment4: null,
                                scaleImpactType: $scope.scales_types[j].id,
                                val: i
                            };
                        }
                    }
                }

                // Then we finally load the actual comments for each section
                $scope.updateScaleComments($scope.scales.impacts.id);
                $scope.updateScaleComments($scope.scales.threats.id);
                $scope.updateScaleComments($scope.scales.vulns.id);
            });
        };

        $scope.onRisksTableEdited = function (model, name) {
            var promise = $q.defer();

            // This risk changed, update it
            AnrService.updateInstanceRisk($scope.model.anr.id, model.id, model, function () {
                promise.resolve();

                // Update the current instance risks table, if we're watching one
                $scope.$broadcast('risks-table-edited');
            }, function () {
                promise.reject();
            });

            return promise;
        };

        $scope.changeRiskOp = function(riskOp, attr){
            var result = $q.defer();
            AnrService.updateInstanceOpRisk($scope.model.anr.id, riskOp.id, riskOp, function(risk){
                riskOp.cacheBrutRisk = risk.cacheBrutRisk;
                riskOp.cacheNetRisk = risk.cacheNetRisk;
                riskOp.cacheTargetedRisk = risk.cacheTargetedRisk;
                result.resolve(true);
            }, function(error){
                result.reject(false);
            });
            return result.promise;
        };


        $scope.scaleCommCache = {}; // C/I/D, type
        $scope.threatCommCache = {};
        $scope.vulnsCommCache = {};

        $scope.updateScaleComments = function (scale_id) {
            commsWatchSetup = false;
            AnrService.getScaleComments($scope.model.anr.id, scale_id).then(function (data) {
                var obj;
                var isImpact = false;

                if (scale_id === $scope.scales.threats.id) {
                    obj = $scope.comms.threat;
                } else if (scale_id === $scope.scales.vulns.id) {
                    obj = $scope.comms.vuln;
                } else if (scale_id === $scope.scales.impacts.id) {
                    obj = $scope.comms.impact;
                    isImpact = true;
                }


                for (var i = 0; i < data.comments.length; ++i) {
                    var comm = data.comments[i];

                    if (isImpact && obj[comm.val]) {
                        obj[comm.val][comm.scaleImpactType.id].id = comm.id;
                        obj[comm.val][comm.scaleImpactType.id].comment1 = comm.comment1;
                        obj[comm.val][comm.scaleImpactType.id].comment2 = comm.comment2;
                        obj[comm.val][comm.scaleImpactType.id].comment3 = comm.comment3;
                        obj[comm.val][comm.scaleImpactType.id].comment4 = comm.comment4;

                        if (!$scope.scaleCommCache[comm.scaleImpactType.type]) {
                            $scope.scaleCommCache[comm.scaleImpactType.type] = {};
                        }

                        $scope.scaleCommCache[comm.scaleImpactType.type][comm.val] = comm[$scope._langField('comment')];
                    } else if (!isImpact) {
                        if (!obj[comm.val]) {
                            //obj[comm.val] = comm;
                        } else {
                            obj[comm.val].id = comm.id;
                            obj[comm.val].comment1 = comm.comment1;
                            obj[comm.val].comment2 = comm.comment2;
                            obj[comm.val].comment3 = comm.comment3;
                            obj[comm.val].comment4 = comm.comment4;
                        }

                        if (scale_id == $scope.scales.threats.id) {
                            $scope.threatCommCache[comm.val] = comm[$scope._langField('comment')];
                        } else if (scale_id == $scope.scales.vulns.id) {
                            $scope.vulnsCommCache[comm.val] = comm[$scope._langField('comment')];
                        }
                    }
                }
            });
        };


        $scope.exportAnr = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'mode', ExportAnrDialog],
                templateUrl: '/views/dialogs/export.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: true,
                fullscreen: useFullScreen,
                locals: {
                    mode: 'anr'
                }
            })
                .then(function (exports) {
                    $http.post('/api/anr-export', {id: $scope.model.anr.id, password: exports.password, assessments: exports.assessments}).then(function (data) {
                        DownloadService.downloadBlob(data.data, 'anr.bin');
                        toastr.success(gettextCatalog.getString('The risk analysis has been exported successfully.'), gettextCatalog.getString('Export successful'));
                    })
                });
        };

    }

    function CreateAnrDialogCtrl($scope, $mdDialog, ConfigService, anr, $stateParams) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = ConfigService.getDefaultLanguageIndex();

        if (anr != undefined && anr != null) {
            $scope.anr = anr;
        } else {
            $scope.anr = {
                name: '',
                description: ''
            };
        }

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.create = function () {
            $mdDialog.hide($scope.anr);
        };
    }

    function AddObjectDialogCtrl($scope, $mdDialog, $q, $state, ObjlibService, AnrService, $stateParams, $location, $parentScope, anr_id, categories) {
        $scope.objlib = {
            category: null,
            object: null
        };

        $scope.loadCategs = function(){
            $scope.categories = [];
            ObjlibService.getObjlibsCats().then(function (x) {
                // Recursively build items
                var buildItemRecurse = function (children, parentPath) {
                    var output = [];

                    for (var i = 0; i < children.length; ++i) {
                        var child = children[i];

                        if (parentPath != "") {
                            child[$scope._langField('label')] = parentPath + " >> " + child[$scope._langField('label')];
                        }

                        output.push(child);

                        if (child.child && child.child.length > 0) {
                            var child_output = buildItemRecurse(child.child, child[$scope._langField('label')]);
                            output = output.concat(child_output);
                        }
                    }

                    return output;
                };

                $scope.categories = buildItemRecurse(x.categories, "");
            });
        };

        $scope.selected_categ = {id: null};

        $scope.changeCateg = function(){
            $scope.objlib.category = {id: $scope.selected_categ.id};
        };

        $scope.createAttachedObject = function (ev, objlib) {
            $scope.objLibDialog = $mdDialog;
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', '$stateParams', CreateObjlibDialogCtrl],
                templateUrl: '/views/anr/create.objlibs.html',
                clickOutsideToClose: true,
                preserveScope: false,
                scope: $parentScope.$new(),
                targetEvent: ev,
                locals: {
                    mode: 'anr',
                    objLibDialog: $scope,
                    objlib: objlib
                }
            }).then(function (objlib) {
                if (objlib) {
                    var copy = angular.copy(objlib);

                    if (objlib.asset) {
                        objlib.asset = objlib.asset.id;
                    }
                    if (objlib.rolfTag) {
                        objlib.rolfTag = objlib.rolfTag.id;
                    }

                    AnrService.addNewObjectToLibrary(anr_id, objlib, function (data) {
                        $parentScope.updateObjectsLibrary(false, function(){
                            $location.path('/backoffice/kb/models/'+$scope.model.id+'/object/'+data.id);
                        });
                    }, function () {
                        // An error occurred, re-show the dialog
                        $scope.createAttachedObject(null, copy);
                    });
                }
            });
        };

        $scope.queryCategorySearch = function (query) {
            var q = $q.defer();

            ObjlibService.getObjlibsCats({filter: query}).then(function (x) {
                if (x && x.categories) {
                    // Recursively build items
                    var buildItemRecurse = function (children, depth) {
                        var output = [];

                        for (var i = 0; i < children.length; ++i) {
                            var child = children[i];

                            for (var j = 0; j < depth; ++j) {
                                child.label1 = " >> " + child.label1;
                            }

                            output.push(child);

                            if (child.child && child.child.length > 0) {
                                var child_output = buildItemRecurse(child.child, depth + 1);
                                output = output.concat(child_output);
                            }
                        }

                        return output;
                    };

                    q.resolve(buildItemRecurse(x.categories, 0));
                } else {
                    q.reject();
                }
            }, function (x) {
                q.reject(x);
            });

            return q.promise;
        };

        $scope.queryObjectSearch = function (query) {
            var q = $q.defer();

            ObjlibService.getObjlibs({
                filter: query,
                category: $scope.objlib.category ? $scope.objlib.category.id : null,
                model: $stateParams.modelId,
                lock: true
            }).then(function (x) {
                if (x && x.objects) {
                    q.resolve(x.objects);
                } else {
                    q.reject();
                }
            }, function (x) {
                q.reject(x);
            });

            return q.promise;
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.create = function () {
            $mdDialog.hide($scope.objlib.object);
        };
    }

    function ExportAnrDialog($scope, $mdDialog, mode) {
        $scope.mode = mode;
        $scope.export = {
            password: null
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.export);
        };

    }
})();

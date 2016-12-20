(function () {

    angular
        .module('AnrModule')
        .controller('AnrLayoutCtrl', [
            '$scope', 'toastr', '$http', '$q', '$mdMedia', '$mdDialog', '$timeout', 'gettextCatalog', 'TableHelperService',
            'ModelService', 'ObjlibService', 'AnrService', '$stateParams', '$rootScope', '$location', '$state', 'ToolsAnrService',
            '$transitions', 'DownloadService', '$mdPanel', '$injector', 'ConfigService',
            AnrLayoutCtrl
        ]);

    /**
     * ANR MAIN LAYOUT CONTROLLER
     */
    function AnrLayoutCtrl($scope, toastr, $http, $q, $mdMedia, $mdDialog, $timeout, gettextCatalog, TableHelperService, ModelService,
                           ObjlibService, AnrService, $stateParams, $rootScope, $location, $state, ToolsAnrService,
                           $transitions, DownloadService, $mdPanel, $injector, ConfigService) {

        $scope.display = {show_hidden_impacts: false, anrSelectedTabIndex: 0};
        $scope.scalesCanChange = false;
        $scope.isAnrReadOnly = true;

        var self = this;

        $scope.ToolsAnrService = ToolsAnrService;
        $scope.GlobalResizeMenuSize = "";
        $scope.GlobalResizeMenuContentHide = false;
        var minWidthMenu = 80;
        var isModelLoading = false;
        var __panel = null;

        $transitions.onBefore({}, function () {
            $scope.resetSheet();
            $scope.resetRisksFilters();

            $timeout(function () {
                if ($state.$current.name == 'main.kb_mgmt.models.details') {
                    $rootScope.anr_selected_instance_id = null;
                    $rootScope.anr_selected_object_id = null;
                }
            });

            if (__panel) {
                __panel.close();
            }

            $mdDialog.cancel();

        });

        $scope.ceil = Math.ceil;

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

        $scope.updateModel = function (justCore, cb) {
            isModelLoading = true;

            if ($scope.OFFICE_MODE == 'BO') {
                ModelService.getModel($stateParams.modelId).then(function (data) {
                    $scope.model = data;
                    $rootScope.anr_id = data.anr.id;
                    $scope.isAnrReadOnly = false;

                    $scope.languages = ConfigService.getLanguages();
                    $scope.scales.language = ConfigService.getDefaultLanguageIndex();

                    thresholdsWatchSetup = false;
                    $scope.thresholds = {
                        thresholds: {min: $scope.model.anr.seuil1, max: $scope.model.anr.seuil2},
                        rolf_thresholds: {min: $scope.model.anr.seuilRolf1, max: $scope.model.anr.seuilRolf2}
                    }

                    if (!justCore) {
                        $scope.updateAnrRisksTable();
                        $scope.updateAnrRisksOpTable();
                        $scope.updateInstances();
                        $scope.updateObjectsLibrary();
                        $scope.updateScales();
                    }

                    isModelLoading = false;

                    if (cb) {
                        cb();
                    }
                });
            } else {
                var ClientAnrService = $injector.get('ClientAnrService');
                ClientAnrService.getAnr($stateParams.modelId).then(function (data) {
                    $scope.model = {
                        id: null,
                        anr: data,
                        showRolfBrut: data.cacheModelShowRolfBrut && data.showRolfBrut,
                    };

                    $scope.isAnrReadOnly = (data.rwd == 0);
                    $scope.languages = ConfigService.getLanguages();
                    $scope.scales.language = data.language;

                    thresholdsWatchSetup = false;
                    $scope.thresholds = {
                        thresholds: {min: $scope.model.anr.seuil1, max: $scope.model.anr.seuil2},
                        rolf_thresholds: {min: $scope.model.anr.seuilRolf1, max: $scope.model.anr.seuilRolf2}
                    }

                    if (!justCore) {
                        $scope.updateAnrRisksTable();
                        $scope.updateAnrRisksOpTable();
                        $scope.updateInstances();
                        $scope.updateObjectsLibrary();
                        $scope.updateScales();
                        updateMethodProgress();
                    }

                    if ($rootScope.setAnrLanguage) {
                        $rootScope.setAnrLanguage(data.language);
                    }

                    isModelLoading = false;

                    if (cb) {
                        cb();
                    }
                })
            }
        };

        $scope.updateAnrRisksTable = function (cb) {
            $scope.anr_risks_table_loading = true;
            AnrService.getAnrRisks($scope.model.anr.id, $scope.risks_filters).then(function (data) {
                if (!$scope.risks || $scope.risks.length != data.risks.length) {
                    $scope.risks_total = data.count;
                    $scope.risks = data.risks; // for the _table_risks.html partial
                } else {
                    // patch up only if we already have a risks table
                    // if this cause a problem, add a flag to updateModel so that we patch only in the risks
                    // table callback, and do a full refresh otherwise
                    for (var i = 0; i < $scope.risks.length; ++i) {
                        for (var j in $scope.risks[i]) {
                            $scope.risks[i][j] = data.risks[i][j];
                        }
                    }
                }

                if (cb) {
                    cb();
                }

                $scope.anr_risks_table_loading = false;
            });
        };

        $scope.resetRisksFilters = function () {
            $scope.risks_filters = {
                order: 'maxRisk',
                order_direction: 'desc',
                thresholds: -1,
                page: 1
            };
        };

        $scope.updateAnrRisksOpTable = function (cb) {
            $scope.anr_risks_op_table_loading = true;
            AnrService.getAnrRisksOp($scope.model.anr.id, $scope.risks_op_filters).then(function (data) {
                if (!$scope.oprisks || $scope.oprisks.length != data.oprisks.length) {
                    $scope.oprisks_total = data.count;
                    $scope.oprisks = data.oprisks; // for the _table_risks_op.html partial
                } else {
                    // patch up only if we already have a risks table
                    // if this cause a problem, add a flag to updateModel so that we patch only in the risks
                    // table callback, and do a full refresh otherwise
                    for (var i = 0; i < $scope.oprisks.length; ++i) {
                        for (var j in $scope.oprisks[i]) {
                            $scope.oprisks[i][j] = data.oprisks[i][j];
                        }
                    }
                }

                if (cb) {
                    cb();
                }

                $scope.anr_risks_op_table_loading = false;
            });
        };

        $scope.resetRisksOpFilters = function () {
            $scope.risks_op_filters = {
                order: 'maxRisk',
                order_direction: 'desc',
                thresholds: -1,
                page: 1
            };
        };

        $scope.serializeQueryString = function (obj) {
            var str = [];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            }
            return str.join('&');
        };

        $scope.exportAnrRisksTable = function () {
            var params = angular.copy($scope.risks_filters);
            params.csv = true;
            var anr = 'anr';
            if ($scope.OFFICE_MODE == 'FO') {
                anr = 'client-anr';
            }

            $http.get("/api/" + anr + "/" + $scope.model.anr.id + "/risks?" + $scope.serializeQueryString(params)).then(function (data) {
                var contentT = data.headers('Content-Type');
                DownloadService.downloadBlob(data.data, 'risks.csv',contentT);
            });
        }

        $scope.exportAnrRisksOpTable = function () {
            var params = angular.copy($scope.risks_filters);
            params.csv = true;
            var anr = 'anr';
            if ($scope.OFFICE_MODE == 'FO') {
                anr = 'client-anr';
            }

            $http.get("/api/"+anr+"/" + $scope.model.anr.id + "/risksop?" + $scope.serializeQueryString(params)).then(function (data) {
                var contentT = data.headers('Content-Type');
                DownloadService.downloadBlob(data.data, 'risks_op.csv',contentT);
            });
        }

        $scope.resetRisksFilters();
        $scope.resetRisksOpFilters();
        $scope.updateModel();
        $scope.instmode = 'anr';

        $scope.$watchGroup(['risks_filters.order', 'risks_filters.order_direction'], function (newValue, oldValue) {
            if (newValue != oldValue) {
                if ($state.current.name == "main.kb_mgmt.models.details" || $state.current.name == 'main.project.anr') {
                    $scope.updateAnrRisksTable();
                    $scope.updateAnrRisksOpTable();
                } else {
                    $scope.$broadcast('risks-table-filters-changed');
                }
            }
        });


        $scope.clearSelectedInstAndObj = function () {
            $rootScope.anr_selected_instance_id = null;
            $rootScope.anr_selected_object_id = null;
        }

        $scope.openRiskSheet = function (risk) {
            $scope.sheet_risk = angular.copy(risk);

            var reducAmount = [];
            if($scope.scales.vulns != undefined){
                for(var i = $scope.scales.vulns.min; i <= $scope.scales.vulns.max; i++){
                    reducAmount.push(i);
                    if($scope.sheet_risk.vulnerabilityRate != '-1' && i == $scope.sheet_risk.vulnerabilityRate){
                        break;
                    }
                }
            }
            $scope.reducAmount = reducAmount;

            $scope._copyRecs = [];
            $scope.updateSheetRiskTarget();
        };

        $scope.updateSheetRiskTarget = function () {
            $scope.sheet_risk.target_c = $scope.sheet_risk.c_impact * $scope.sheet_risk.threatRate * ($scope.sheet_risk.vulnerabilityRate - $scope.sheet_risk.reductionAmount);
            $scope.sheet_risk.target_i = $scope.sheet_risk.i_impact * $scope.sheet_risk.threatRate * ($scope.sheet_risk.vulnerabilityRate - $scope.sheet_risk.reductionAmount);
            $scope.sheet_risk.target_d = $scope.sheet_risk.d_impact * $scope.sheet_risk.threatRate * ($scope.sheet_risk.vulnerabilityRate - $scope.sheet_risk.reductionAmount);
        };

        $scope.resetSheet = function () {
            $scope.sheet_risk = undefined;
        };

        $scope.openOpRiskSheet = function (risk) {
            $scope.opsheet_risk = risk;
            $scope._copyRecs = [];
        };

        $scope.resetOpSheet = function () {
            $scope.opsheet_risk = undefined;
        };


        $scope.saveRiskSheet = function (sheet) {
            AnrService.updateInstanceRisk($scope.model.anr.id, sheet.id, sheet, function () {
                $scope.$broadcast('risks-table-edited');
                $scope.updateAnrRisksTable();
                $scope.updateSheetRiskTarget();
                toastr.success(gettextCatalog.getString('The risk sheet changes have been saved successfully'), gettextCatalog.getString('Save successful'));
            })
        };

        $scope.saveOpRiskSheet = function (sheet) {
            AnrService.updateInstanceOpRisk($scope.model.anr.id, sheet.id, sheet, function () {
                $scope.$broadcast('risks-table-edited');
                $scope.updateAnrRisksOpTable();
                toastr.success(gettextCatalog.getString('The operational risk sheet changes have been saved successfully'), gettextCatalog.getString('Save successful'));
            })
        };

        $scope.$on('recommandations-loaded', function (ev, recs) {
            $scope._copyRecs = recs;
        })

        /**
         * Risk analysis
         */
        var editEvalContext = function (step) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'GuideService', 'anr', 'subStep', MethodEditContextDialog],
                templateUrl: '/views/anr/edit.evalcontext.html',
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    subStep: step,
                    anr: $scope.model.anr,
                }
            }).then(function (data) {
                var req = {id: $scope.model.anr.id};
                req[step.anrField] = data.text;

                var ClientAnrService = $injector.get('ClientAnrService');
                ClientAnrService.updateAnr(req, function () {
                    toastr.success(gettextCatalog.getString("Update successful"));
                    $scope.updateModel(true);
                });
            });
        };

        var editTrendsContext = function (step) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'QuestionService', 'ThreatService', 'ClientAnrService', 'GuideService', 'anr', 'subStep', MethodEditTrendsDialog],
                templateUrl: '/views/anr/trends.evalcontext.html',
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    ClientAnrService: $injector.get('ClientAnrService'),
                    anr: $scope.model.anr,
                    subStep: step
                }
            });
        };

        var editRisksContext = function (step) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$state', 'TreatmentPlanService', 'anr', 'subStep', MethodEditRisksDialog],
                templateUrl: '/views/anr/risks.evalcontext.html',
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    subStep: step,
                    anr: $scope.model.anr,
                }
            }).then(function (data) {

            });
        };

        if ($scope.OFFICE_MODE == 'FO') {
            $scope.$watch('display.anrSelectedTabIndex', function (newValue) {
                if (newValue == 2) {
                    // Init KB Mgmt, if needed
                    $scope.$broadcast('setup-kb-mgmt');
                }
            });
        }

        var selectScalesTab = function () {
            $scope.display.anrSelectedTabIndex = 1;
        };

        var showAnrSummary = function () {
            $state.transitionTo('main.project.anr', {modelId: $scope.model.anr.id});
            $scope.clearSelectedInstAndObj();
            $scope.display.anrSelectedTabIndex = 0;
            ToolsAnrService.currentTab = 0;
        };
        var showAnrRisks = function () {
            $state.transitionTo('main.project.anr', {modelId: $scope.model.anr.id});
            $scope.clearSelectedInstAndObj();
            $scope.display.anrSelectedTabIndex = 0;
            ToolsAnrService.currentTab = 1;
        };
        var editRiskTreatPlan = function () {
            $state.transitionTo('main.project.anr.risksplan', {modelId: $scope.model.anr.id});
            $scope.clearSelectedInstAndObj();
            $scope.display.anrSelectedTabIndex = 0;
        }



        // Progress
        var updateMethodProgress = function () {
            $scope.methodProgress = [
                {
                    color: 'green',
                    label: gettextCatalog.getString("Context setup"),
                    deliverable: gettextCatalog.getString("Context validation"),
                    steps: [
                        {label: gettextCatalog.getString("Risks analysis context"), action: editEvalContext, anrField: 'contextAnaRisk', progressField: 'initAnrContext'},
                        {label: gettextCatalog.getString("Trends evaluation, threats evaluation, synthesis"), action: editTrendsContext, progressField: 'initEvalContext'},
                        {label: gettextCatalog.getString("Risks management context"), action: editEvalContext, anrField: 'contextGestRisk', progressField: 'initRiskContext'},
                        {label: gettextCatalog.getString("Evaluation, acceptance and impact criterias setup"), action: selectScalesTab, progressField: 'initDefContext'},
                    ]
                },
                {
                    color: 'blue',
                    label: gettextCatalog.getString("Context modeling"),
                    deliverable: gettextCatalog.getString("Model validation"),
                    steps: [
                        {label: gettextCatalog.getString("Identification of assets, vulnerabilities and impacts assessment"), action: showAnrSummary, progressField: 'modelImpacts'},
                        {label: gettextCatalog.getString("Synthesis of assets / impacts"), action: editEvalContext, anrField: 'synthAct', progressField: 'modelSummary'},
                    ]
                },
                {
                    color: 'yellow',
                    label: gettextCatalog.getString("Risks evaluation and treatment"),
                    deliverable: gettextCatalog.getString("Final report"),
                    steps: [
                        {label: gettextCatalog.getString("Risks estimation, evaluation and processing"), action: showAnrRisks, progressField: 'evalRisks'},
                        {label: gettextCatalog.getString("Risk treatment plan management"), action: editRisksContext, progressField: 'evalPlanRisks'},
                    ]
                },
                {
                    color: 'red',
                    label: gettextCatalog.getString("Implementation and monitoring"),
                    deliverable: null,
                    steps: [
                        {label: gettextCatalog.getString("Management of the implementation of the risk treatment plan"), action: editRiskTreatPlan, progressField: 'manageRisks'},
                    ]
                }
            ];


            // Update done status
            for (var i = 0; i < $scope.methodProgress.length; ++i) {
                for (var j = 0; j < $scope.methodProgress[i].steps.length; ++j) {
                    var obj = $scope.methodProgress[i].steps[j];
                    obj.done = ($scope.model.anr[obj.progressField] == 1);
                }
            }
        };

        $scope.openMethodDeliverable = function (step) {
            if ($scope.isAnrReadOnly) {
                return;
            }

            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'step', MethodDeliverableDialog],
                templateUrl: '/views/anr/deliverable.evalcontext.html',
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    step: step,
                }
            }).then(function (data) {
                
            });
        };

        $scope.setMethodStepStatus = function (field, substep, done) {
            if ($scope.isAnrReadOnly) {
                return;
            }

            var obj = {id: $scope.model.anr.id};
            obj[field] = (done ? 0 : 1);

            var ClientAnrService = $injector.get('ClientAnrService');
            ClientAnrService.updateAnr(obj, function () {
                $scope.model.anr[field] = obj[field];
                substep.done = (obj[field] == 1);
            })
        };

        $scope.getStepProgress = function (step) {
            var progress = 0;
            for (var i = 0; i < step.steps.length; ++i) {
                if ($scope.model.anr[step.steps[i].progressField] == 1) {
                    ++progress;
                }
            }

            return progress;
        };

        $scope.getMethodTextColor = function (step, subStep) {
            if ($scope.model.anr[subStep.progressField] == 1) {
                return 'txt-' + step.color;
            } else {
                return '';
            }
        };

        $scope.isMethodStepComplete = function (step) {
            var complete = true;
            for (var i = 0; i < step.steps.length; ++i) {
                if (!$scope.model.anr[step.steps[i].progressField]) {
                    complete = false;
                    break;
                }
            }

            return complete;
        };

        // Tree
        $scope.anr_obj_instances_data = null;
        $scope.anr_obj_library_data = null;
        $scope.anr_instance_tree_is_patching = false;

        // As our controllers are static in this zone, we must go through the rootScope to update the selected instance
        // ID from the child controller (AnrObjectInstanceCtrl)
        $rootScope.anr_selected_instance_id = $stateParams.instId;
        $rootScope.anr_selected_object_id = $stateParams.objectId;

        $scope.filter = {
            instance: '',
            library: ''
        };

        $scope.wrapAll = function (root) {
            if (!root) {
                root = $scope.anr_obj_instances_data;
            }

            for (var i = 0; i < root.length; ++i) {
                var node = $scope.anr_obj_instances_data[i];

                if (node.__children__ && node.__children__.length > 0) {
                    $scope.wrapAll(node);
                }

                node.__collapsed__ = true;
                $scope.collapseCache['inst' + node.id] = true;
            }
        };

        $scope.unwrapAll = function (root) {
            if (!root) {
                root = $scope.anr_obj_instances_data;
            }

            for (var i = 0; i < root.length; ++i) {
                var node = $scope.anr_obj_instances_data[i];

                if (node.__children__ && node.__children__.length > 0) {
                    $scope.wrapAll(node);
                }

                node.__collapsed__ = false;
                $scope.collapseCache['inst' + node.id] = false;
            }
        };

        $scope.toggleItemCollapsed = function (node) {
            if (!$scope.collapseCache) {
                $scope.collapseCache = {};
            }

            if ($scope.collapseCache[node.type + node.id] !== undefined) {
                $scope.collapseCache[node.type + node.id] = !$scope.collapseCache[node.type + node.id];
            } else {
                $scope.collapseCache[node.type + node.id] = false;
            }

            node.__collapsed__ = $scope.collapseCache[node.type + node.id];
            //console.log(node.type + node.id);
        };

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
            beforeDrag: function (scopeDrag) {
                return !$scope.isAnrReadOnly && !scopeDrag.$modelValue.component && !$scope.anr_instance_tree_is_patching;
            },

            accept: function (sourceNodeScope, destNodeScope, destIndex) {
                return (sourceNodeScope.$modelValue.type != 'libcat');
            },

            dropped: function (e) {
                if (e.source.nodesScope.$treeScope.$id == e.dest.nodesScope.$treeScope.$id) {
                    var obj = e.source.nodeScope.$modelValue;

                    $scope.anr_instance_tree_is_patching = true;
                    AnrService.moveInstance($scope.model.anr.id, obj.id, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function () {
                        $scope.updateInstances(function () {
                            $scope.anr_instance_tree_is_patching = false;
                        });
                        $scope.$broadcast('instance-moved', obj.id);
                    });

                    return true;
                } else {
                    return false;
                }
            }
        };

        $scope.libTreeCallbacks = {
            beforeDrag: function (scopeDrag) {
                return !$scope.isAnrReadOnly && (scopeDrag.$modelValue.type != 'libcat' || scopeDrag.$modelValue.depth == 0) && (scopeDrag.$modelValue.id > 0) && !$scope.anr_instance_tree_is_patching;
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

                        var total_categ = $scope.has_virtual_categ ? $scope.anr_obj_library_data.length - 1 : $scope.anr_obj_library_data.length;
                        var impPos = e.dest.index == 0 ? 1 : (e.dest.index >= total_categ - 1 ? 2 : 3);

                        AnrService.patchLibraryCategory($scope.model.anr.id, e.source.nodeScope.$modelValue.id, {
                            implicitPosition: impPos,
                            //e.dest.index starts to 0 so previous is e.dest.index + 1 - 1.
                            //Give position instead of id because we don't have the id of the anr_object_category entity
                            previous: impPos == 3 ? e.dest.index : null,
                            anr: $scope.model.anr.id
                        }, function () {
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
                    $scope.anr_instance_tree_is_patching = true;
                    AnrService.addInstance($scope.model.anr.id, copy.id, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function () {
                        $scope.updateAnrRisksTable();
                        $scope.updateAnrRisksOpTable();
                        $scope.updateInstances(function () {
                            $scope.anr_instance_tree_is_patching = false;
                            e.source.nodeScope.$modelValue.disableclick = false;
                        });

                        $scope.$broadcast('object-instancied', {oid: copy.id});
                    });

                    return true;
                }
            }
        };


        $scope.updateObjectsLibrary = function (gotofirst, callback) {
            AnrService.getObjectsLibrary($scope.model.anr.id).then(function (data) {
                if (!$scope.collapseCache) {
                    $scope.collapseCache = {};
                }

                var recurseFillTree = function (category, depth) {
                    var output = {id: category.id, type: 'libcat', label1: category.label1, label2: category.label2,
                        label3: category.label3, label4: category.label4, depth: depth, __children__: []};

                    if ($scope.collapseCache[output.type + output.id] !== undefined) {
                        output.__collapsed__ = $scope.collapseCache[output.type + output.id];
                    } else {
                        output.__collapsed__ = true;
                    }

                    if (category.child && category.child.length > 0) {
                        for (var i = 0; i < category.child.length; ++i) {
                            output.__children__.push(recurseFillTree(category.child[i], depth + 1));
                        }
                    }

                    if (category.objects && category.objects.length > 0) {
                        for (var i = 0; i < category.objects.length; ++i) {
                            var obj = category.objects[i];
                            obj.type = 'lib';
                            
                            if ($scope.collapseCache[obj.type + obj.id] !== undefined) {
                                obj.__collapsed__ = $scope.collapseCache[obj.type + obj.id];
                            } else {
                                obj.__collapsed__ = true;
                            }

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
                $scope.has_virtual_categ = false;
                for (var v = 0; v < data.categories.length; ++v) {
                    var cat = data.categories[v];
                    if(cat.id == -1){
                        $scope.has_virtual_categ = true;
                    }
                    lib_data.push(recurseFillTree(cat, 0));
                }
                $scope.anr_obj_library_data = lib_data;

                if (gotofirst != undefined && gotofirst) {
                    if ($scope.first_object != null) {
                        if ($scope.OFFICE_MODE == 'BO') {
                            $location.path('/backoffice/kb/models/' + $stateParams.modelId + '/object/' + $scope.first_object.id);
                        } else {
                            $location.path('/client/project/' + $stateParams.modelId + '/anr/object/' + $scope.first_object.id);
                        }
                    } else {
                        if ($scope.OFFICE_MODE == 'BO') {
                            $location.path('/backoffice/kb/models/' + $stateParams.modelId);
                        } else {
                            $location.path('/client/project/' + $stateParams.modelId + '/anr');
                        }
                    }
                }

                if (callback != undefined) {
                    callback.call();
                }
            });
        };

        $scope.updateInstances = function (cb) {
            AnrService.getInstances($scope.model.anr.id).then(function (data) {
                $scope.anr_obj_instances_data = [];
                $scope.instanceCache = {};
                if (!$scope.collapseCache) {
                    $scope.collapseCache = {};
                }

                var recurseFillTree = function (instance, parentPath) {
                    var output = {id: instance.id, type: 'inst', scope: instance.scope, name1: instance.name1,
                        name2: instance.name2, name3: instance.name3, name4: instance.name4, component: instance.level > 1,
                        __children__: []};
                    if ($scope.collapseCache[output.type + output.id] !== undefined) {
                        output.__collapsed__ = $scope.collapseCache[output.type + output.id];
                    } else {
                        output.__collapsed__ = true;
                    }

                    var parentPathPlusOne = parentPath ? (parentPath + " > " + instance[$scope._langField('name')]) : instance[$scope._langField('name')];

                    if (instance.child && instance.child.length > 0) {
                        for (var i = 0; i < instance.child.length; ++i) {
                            output.__children__.push(recurseFillTree(instance.child[i], parentPathPlusOne));
                        }
                    }

                    instance.completePath = parentPathPlusOne;

                    $scope.instanceCache[instance.id] = instance;

                    return output;
                };

                for (var v = 0; v < data.instances.length; ++v) {
                    var instance = data.instances[v];
                    $scope.anr_obj_instances_data.push(recurseFillTree(instance));
                }

                if (cb) {
                    cb();
                }
            });

        };

        $scope.openAnrToolsMenu = function ($mdOpenMenu, ev) {
            $mdOpenMenu(ev);
        }

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
            if ($scope.thresholds && ($scope.thresholds.thresholds.min < 0 || $scope.thresholds.rolf_thresholds.min < 0
                || $scope.thresholds.thresholds.max < $scope.thresholds.thresholds.min || $scope.thresholds.rolf_thresholds.max < $scope.thresholds.rolf_thresholds.min)) {
                return;
            }

            if ($scope.model && $scope.model.anr && thresholdsWatchSetup) {
                // This structure holds (ROLF) thresholds, as well as scales ranges
                var service = AnrService;
                if ($scope.OFFICE_MODE == 'FO') { service = $injector.get('ClientAnrService'); }

                service.patchAnr($scope.model.anr.id, {
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

            if (!$scope.scalesCanChange && $scope.OFFICE_MODE == 'FO') {
                toastr.warning(gettextCatalog.getString("You may not change scales anymore"));
                return false;
            }

            AnrService.updateScale($scope.model.anr.id, id, model.min, model.max, function () {
                $scope.$broadcast('scale-changed');

                // Reload comments
                $scope.updateScales();
                $scope.updateScaleComments(id);

                // Reload risk sheet in case ranges impact it
                if ($scope.sheet_risk) {
                    $scope.updateAnrRisksTable(function () {
                        $scope.openRiskSheet($scope.sheet_risk);
                    });
                }

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
                $scope.updateScaleComments(model_id);
                promise.resolve();
            }, function () {
                promise.reject();
            });

            return promise;
        };

        var createComm = function (model_id, row_id, comment, impactType) {
            var promise = $q.defer();

            AnrService.createScaleComment($scope.model.anr.id, model_id, row_id, comment, impactType, function () {
                $scope.updateScaleComments(model_id);
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
                $scope.updateScaleTypes(function () {
                    $timeout(function () {
                        var scroller = document.getElementById('horiz-scrollable');
                        scroller.scrollLeft = scroller.scrollWidth;
                    }, 0, false);
                });
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

        $scope.deleteAnr = function (ev) {
            $scope.deleteClientAnrGlobal(ev, $scope.model.anr, function () {
                $state.transitionTo('main.project');
            });
        };


        $scope.editAnrInfo = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            var controller = ['$scope', '$mdDialog', 'ConfigService', 'anr', '$stateParams', CreateAnrDialogCtrl];
            if (CreateRiskAnalysisDialog) {
                controller = ['$scope', '$mdDialog', 'toastr', 'gettext', 'gettextCatalog', 'ConfigService', 'ModelService',
                    'ClientAnrService', 'anr', CreateRiskAnalysisDialog];
            }

            $mdDialog.show({
                controller: controller,
                templateUrl: '/views/dialogs/create.anr.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    anr: angular.copy($scope.model.anr)
                }
            })
                .then(function (anr) {
                    var service = AnrService;
                    if ($scope.OFFICE_MODE == 'FO') {
                        service = $injector.get('ClientAnrService');
                    }
                    service.patchAnr($scope.model.anr.id, anr, function () {
                        toastr.success(gettextCatalog.getString("The risk analysis details have been updated"), gettextCatalog.getString("Update successful"));
                        if ($scope.OFFICE_MODE == 'FO') {
                            $scope.model.showRolfBrut = anr.showRolfBrut;
                        }
                    });
                    $scope.model.anr = anr;
                });
        };

        $scope.addObject = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            if ($scope.OFFICE_MODE == 'BO') {
                $mdDialog.show({
                    controller: ['$scope', '$mdDialog', '$q', '$state', 'ObjlibService', 'AnrService', '$stateParams', '$location', '$parentScope', 'anr_id', 'categories', AddObjectDialogCtrl],
                    templateUrl: '/views/anr/add.objlib.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
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
                                $scope.updateObjectsLibrary(false, function () {
                                    $location.path('/backoffice/kb/models/' + $scope.model.id + '/object/' + objlib.id);
                                });
                                toastr.success(gettextCatalog.getString("The object has been added to the library."), gettextCatalog.getString("Object added successfully"));
                            });
                        }
                    });
            } else {
                $scope.createAttachedObject = createAttachedObject;
                //$scope, $mdDialog, $state, $location, $parentScope, AnrService
                createAttachedObject($scope, $mdDialog, $state, $location, $scope, AnrService, ev)
            }
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
                $scope.scalesCanChange = data.canChange && $scope.model.anr.cacheModelIsScalesUpdatable;
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

        $scope.updateScaleTypes = function (cb) {
            AnrService.getScalesTypes($scope.model.anr.id).then(function (data) {
                $scope.scales_types = data.types;

                $scope.scales_types_by_id = {};
                for(var i = 0 ; i<data.types.length ; ++i){
                     $scope.scales_types_by_id[data.types[i].id] = data.types[i];
                }

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

                if (cb) {
                    cb();
                }
            });
        };

        $scope.checkCommentVisibility = function(comment){
            return comment && ! $scope.scales_types_by_id[comment.scaleImpactType].isHidden || $scope.display.show_hidden_impacts ;
        }

        $scope.onRisksTableEdited = function (model, name) {
            var promise = $q.defer();

            // This risk changed, update it
            AnrService.updateInstanceRisk($scope.model.anr.id, model.id, model, function () {
                promise.resolve(true);

                $scope.updateAnrRisksTable();

                // Update the current instance risks table, if we're watching one
                $scope.$broadcast('risks-table-edited');
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
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

                // Reset comments for this scale
                if (!isImpact) {
                    for (var i = 0; i < obj.length; ++i) {
                        obj[i].id = null;
                        obj[i].comment1 = null;
                        obj[i].comment2 = null;
                        obj[i].comment3 = null;
                        obj[i].comment4 = null;
                    }
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
                            obj[comm.val] = comm;
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
                templateUrl: '/views/anr/export.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    mode: 'anr'
                }
            })
                .then(function (exports) {
                    var client = '';
                    if ($scope.OFFICE_MODE == 'FO') {
                        client = 'client-';
                    }

                    $http.post('/api/' + client + 'anr-export', {id: $scope.model.anr.id, password: exports.password, assessments: exports.assessments}).then(function (data) {
                        DownloadService.downloadBlob(data.data, 'anr.bin');
                        toastr.success(gettextCatalog.getString('The risk analysis has been exported successfully.'), gettextCatalog.getString('Export successful'));
                    })
                });
        };

        $scope.showMethodBox = function (stepNum, step, ev) {
            var position = $mdPanel.newPanelPosition()
                .relativeTo('.method-menu-step-' + stepNum)
                .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);

            var animation = $mdPanel.newPanelAnimation();
            animation.withAnimation($mdPanel.animation.FADE);

            var config = {
                animation: animation,
                controller: ['mdPanelRef', '$scope', 'step', 'setMethodStepStatus', 'openMethodDeliverable', MonarcMethodBoxCtrl],
                templateUrl: 'monarc-method.tmpl.html', // inlined in anr.layout.html
                locals: {
                    'step': step,
                    'setMethodStepStatus': $scope.setMethodStepStatus,
                    'openMethodDeliverable': $scope.openMethodDeliverable,
                },
                position: position,
                zIndex: 10,
                openFrom: ev,
                escapeToClose: true,
                clickOutsideToClose: true,
                focusOnOpen: true,
                hasBackdrop: false,
            };

            __panel = $mdPanel.create(config);
            __panel.open();
        }

        $scope.openSnapshotTools = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$rootScope', '$mdDialog', '$state', 'ClientSnapshotService', 'toastr', 'gettextCatalog', 'anr', ToolsSnapshotDialog],
                templateUrl: '/views/anr/snapshots.html',
                targetEvent: ev,
                locals: {
                    anr: $scope.model.anr
                },
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            });
        }


        $scope.openInterviewTools = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ClientInterviewService', 'toastr', 'gettextCatalog', 'anr', ToolsInterviewDialog],
                templateUrl: '/views/anr/interviews.html',
                targetEvent: ev,
                locals: {
                    anr: $scope.model.anr
                },
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen
            });
        }


        $scope.importObject = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'ObjlibService', 'toastr', 'gettextCatalog', 'Upload', ImportObjectDialogCtrl],
                templateUrl: '/views/anr/import.object.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            }).then(function (object) {

            });
        };

        $scope.importInstance = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AnrService', 'toastr', 'gettextCatalog', 'Upload', ImportInstanceDialogCtrl],
                templateUrl: '/views/anr/import.instance.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            }).then(function (object) {

            });
        };
    }

    // Dialogs

    function MonarcMethodBoxCtrl(mdPanelRef, $scope, step, setMethodStepStatus, openMethodDeliverable) {
        $scope.setMethodStepStatus = setMethodStepStatus;
        $scope.openMethodDeliverable = openMethodDeliverable;
        $scope.step = step;
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

    var createAttachedObject = function ($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev, objlib) {
        $scope.objLibDialog = $mdDialog;
        $scope.__objlibDialog_ParentScope = $parentScope;
        $scope.__objlibDialog_State = $state;
        $scope.__objlibDialog_Location = $location;
        $scope.__objlibDialog_AnrService = AnrService;
        console.log(AnrService);
        $mdDialog.show({
            controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', '$stateParams', CreateObjlibDialogCtrl],
            templateUrl: '/views/anr/create.objlibs.html',
            clickOutsideToClose: false,
            preserveScope: false,
            scope: $scope.$dialogScope.$new(),
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

                AnrService.addNewObjectToLibrary($scope.model.anr.id, objlib, function (data) {
                    $parentScope.updateObjectsLibrary(false, function(){
                        if ($scope.OFFICE_MODE == 'FO') {
                            $state.transitionTo('main.project.anr.object', {modelId: $scope.model.anr.id, objectId: data.id});
                        } else {
                            $location.path('/backoffice/kb/models/'+$scope.model.id+'/object/'+data.id);
                        }

                    });
                }, function () {
                    // An error occurred, re-show the dialog
                    createAttachedObject($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev, copy);
                });
            }
        }, function () {
            if ($scope.hookUpdateObjlib) {
                $scope.hookUpdateObjlib();
            }
        });
    };

    function AddObjectDialogCtrl($scope, $mdDialog, $q, $state, ObjlibService, AnrService, $stateParams, $location, $parentScope, anr_id, categories) {
        $scope.objlib = {
            category: null,
            object: null
        };

        $scope.createAttachedObject = function (ev, objlib) {
            createAttachedObject($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev, objlib);
        }

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
                lock: false
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
        $scope.exportData = {
            password: null
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.exportData);
        };
    }

    function MethodEditContextDialog($scope, $mdDialog, GuideService, anr, subStep) {
        $scope.subStep = subStep;
        $scope.guideVisible = false;

        $scope.toggleGuide = function () {
            $scope.guideVisible = !$scope.guideVisible;

            if (!$scope.guide && $scope.guideVisible) {
                GuideService.getGuides().then(function (data) {
                    var guide = null;

                    for (var i = 0; i < data.guides.length; ++i) {
                        var item = data.guides[i];
                        if (
                            (subStep.anrField == "contextAnaRisk" && item.type_id == 1) ||
                            (subStep.anrField == "contextGestRisk" && item.type_id == 2) ||
                            (subStep.anrField == "synthThreat" && item.type_id == 3) ||
                            (subStep.anrField == "synthAct" && item.type_id == 4)
                        ) {
                            guide = item;
                        }
                    }

                    if (guide && guide.isWithItems) {
                        GuideService.getItems({order: 'position', guide: guide.id}).then(function (itemdata) {
                            $scope.guide = guide;
                            $scope.guide_items = itemdata['guides-items'];
                        });
                    } else {
                        $scope.guide = guide;
                    }
                });
            }
        };

        $scope.context = {
            text: anr[subStep.anrField]
        };

        $scope.trixInitialize = function(e, editor) {
            $scope.trix = editor;
        };

        $scope.insertItem = function (i) {
            $scope.trix.insertString(i[$scope._langField('description')]);
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.save = function() {
            $mdDialog.hide($scope.context);
        };
    }

    function MethodEditRisksDialog($scope, $mdDialog, $state, TreatmentPlanService, anr, subStep) {
        $scope.subStep = subStep;

        TreatmentPlanService.getTreatmentPlans({anr: anr.id}).then(function (data) {
            $scope.recommendations = data['recommandations-risks'];
        });

        $scope.openRecommendation = function (rec) {
            $state.transitionTo('main.project.anr.risksplan.sheet', {modelId: anr.id, recId: rec.id});
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.save = function() {
            $mdDialog.hide($scope.context);
        };
    }

    function MethodEditTrendsDialog($scope, $mdDialog, toastr, gettextCatalog, QuestionService, ThreatService, ClientAnrService, GuideService, anr, subStep) {
        $scope.subStep = subStep;
        $scope.anr = anr;
        $scope.display = {};

        $scope.guideVisible = false;

        $scope.toggleGuide = function () {
            $scope.guideVisible = !$scope.guideVisible;

            if (!$scope.guide && $scope.guideVisible) {
                GuideService.getGuides().then(function (data) {
                    var guide = null;

                    for (var i = 0; i < data.guides.length; ++i) {
                        var item = data.guides[i];
                        if (item.type_id == 3) {
                            guide = item;
                            break;
                        }
                    }

                    if (guide && guide.isWithItems) {
                        GuideService.getItems({order: 'position', guide: guide.id}).then(function (itemdata) {
                            $scope.guide = guide;
                            $scope.guide_items = itemdata['guides-items'];
                        });
                    } else {
                        $scope.guide = guide;
                    }
                });
            }
        };

        QuestionService.getQuestions().then(function (data) {
            $scope.questions = angular.copy(data.questions);

            for (var i = 0; i < $scope.questions.length; ++i) {
                var q = $scope.questions[i];

                if (q.type == 2) {
                    q.response = JSON.parse(q.response);
                }
            }

            $scope.questionsOriginal = angular.copy(data.questions);


        })

        $scope.saveQuestions = function () {
            for (var i = 0; i < $scope.questions.length; ++i) {
                if ($scope.questions[i].response != $scope.questionsOriginal[i].response) {
                    var response = $scope.questions[i].response;

                    if ($scope.questions[i].type == 2) {
                        response = JSON.stringify(response);
                    }

                    QuestionService.patchQuestion($scope.questions[i].id, {response: response});
                }
            }

            toastr.success(gettextCatalog.getString("Trends assessment saved successfully"));
        };

        ThreatService.getThreats({limit: 0}).then(function (data) {
            $scope.threats = data.threats;
            $scope.display.currentThreat = 0;
            $scope.updateThreat();
        });

        $scope.updateThreat = function () {
            $scope.threatLoading = true;
            var threat = $scope.threats[$scope.display.currentThreat];
            $scope.currentThreatObj = threat;
            ThreatService.getThreat(threat.id).then(function (data) {
                $scope.threatLoading = false;
                $scope.currentThreatObj = data;
            })
        };

        $scope.previousThreat = function () {
            if ($scope.evalContextForm.$dirty && $scope.anr.rwd >= 1) {
                $scope.saveThreat(function () {
                    $scope.display.currentThreat--;
                    $scope.updateThreat();
                });
            } else {
                $scope.display.currentThreat--;
                $scope.updateThreat();
            }
        };

        $scope.nextThreat = function () {
            if ($scope.evalContextForm.$dirty && $scope.anr.rwd >= 1) {
                $scope.saveThreat(function () {
                    $scope.display.currentThreat++;
                    $scope.updateThreat();
                });
            } else {
                $scope.display.currentThreat++;
                $scope.updateThreat();
            }
        };

        $scope.saveThreat = function (cb) {
            var copy = angular.copy($scope.currentThreatObj);
            if (copy.theme) {
                copy.theme = copy.theme.id;
            }

            ThreatService.updateThreat(copy, function () {
                toastr.success(gettextCatalog.getString("Threat assessment saved successfully"));

                if (cb) {
                    cb();
                } else {
                    $scope.updateThreat();
                }
            });
        };

        $scope.saveSummary = function () {
            ClientAnrService.updateAnr({id: anr.id, synthThreat: anr.synthThreat}, function () {
                toastr.success(gettextCatalog.getString("Threat evaluation summary saved successfully"));
            });
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.save = function() {
            $mdDialog.hide($scope.context);
        };
    }

    function ToolsSnapshotDialog($scope, $rootScope, $mdDialog, $state, ClientSnapshotService, toastr, gettextCatalog, anr) {
        var reloadSnapshots = function () {
            ClientSnapshotService.getSnapshots().then(function (data) {
                $scope.snapshots = data.snapshots;
                $scope.snapshotCreating = false;
            });
        };

        $scope.newSnapshot = {comment: null};
        $scope.isAnrReadOnly = !anr.rwd;
        reloadSnapshots();

        $scope.formatDate = function (input) {
            return input.substring(0, input.lastIndexOf('.'));
        }

        $scope.createSnapshot = function () {
            $scope.snapshotCreating = true;
            ClientSnapshotService.createSnapshot({anr: anr.id, comment: $scope.newSnapshot.comment}, function (data) {
                reloadSnapshots();
                $scope.comment = '';
            })
        };

        $scope.deleteSnapshot = function (snapshot) {
            if ($scope.confirmDelete == snapshot.id) {
                ClientSnapshotService.deleteSnapshot({id: snapshot.id}, function () {
                    reloadSnapshots();
                });
            } else {
                $scope.confirmDelete = snapshot.id;
            }
        };

        $scope.restoreSnapshot = function (snapshot) {
            $scope.snapshotRestoring = true;
            ClientSnapshotService.restoreSnapshot(snapshot.id, function (data) {
                toastr.success(gettextCatalog.getString("Snapshot restored"));
                $state.transitionTo('main.project.anr', {modelId: data.data.id});
                $rootScope.$broadcast('fo-anr-changed');
                $scope.snapshotRestoring = false;
            })
        };

        $scope.openSnapshot = function (snapshot) {
            $state.transitionTo('main.project.anr', {modelId: snapshot.anr.id});
            $mdDialog.cancel();
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    }

    function ToolsInterviewDialog($scope, $mdDialog, ClientInterviewService, toastr, gettextCatalog, anr) {
        $scope.new_interview = {
            'date': null,
            'service': null,
            'content': null
        }

        $scope.isAnrReadOnly = !anr.rwd;
        $scope.showInterviewForm = false;

        $scope.toggleInterviewForm = function () {
            $scope.showInterviewForm = !$scope.showInterviewForm;
        }

        var reloadInterviews = function () {
            ClientInterviewService.getInterviews({anr: anr.id}).then(function (data) {
                $scope.interviews = data.interviews;
                $scope.interviewCreating = false;
            });
        };

        reloadInterviews();

        $scope.createInterview = function () {
            $scope.interviewCreating = true;

            if ($scope.new_interview.id > 0) {
                ClientInterviewService.updateInterview({
                    id: $scope.new_interview.id,
                    anr: anr.id,
                    date: $scope.new_interview.date,
                    service: $scope.new_interview.service,
                    content: $scope.new_interview.content
                }, function () {
                    reloadInterviews();
                    $scope.new_interview = {};
                    $scope.interviewForm.$setPristine();
                });
            } else {
                ClientInterviewService.createInterview({
                    anr: anr.id,
                    date: $scope.new_interview.date,
                    service: $scope.new_interview.service,
                    content: $scope.new_interview.content
                }, function () {
                    reloadInterviews();
                    $scope.new_interview = {};
                    $scope.interviewForm.$setPristine();
                });
            }
        };

        $scope.editInterview = function (interview) {
            $scope.new_interview = angular.copy(interview);
        }

        $scope.deleteInterview = function (interview) {
            if ($scope.confirmDelete == interview.id) {
                ClientInterviewService.deleteInterview({anr: anr.id, id: interview.id}, function () {
                    reloadInterviews();
                }, function () {
                    $scope.interviewCreating = false;
                });
            } else {
                $scope.confirmDelete = interview.id;
            }
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    }

    function MethodDeliverableDialog($scope, $mdDialog) {
        $scope.create = function () {
            $mdDialog.hide(true);
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    }

    function ImportObjectDialogCtrl($scope, $mdDialog, ObjlibService, toastr, gettextCatalog, Upload) {
        $scope.dialog_mode = null;
        $scope.file = [];
        $scope.file_range = 0;
        $scope.import = {
            mode: 'duplicate',
            password: null,
        };

        $scope.uploadFile = function (file) {
            file.upload = Upload.upload({
                url: '/api/client-anr/' + $scope.getUrlAnrId() + '/objects/import',
                data: {'mode': $scope.import.mode, file: file, password: $scope.import.password}
            });

            file.upload.then(function (response) {
                toastr.success(gettextCatalog.getString("The object has been imported successfully"));
            });
        }

        ObjlibService.getObjectsCommon({limit: 0}).then(function (data) {
            $scope.assets = data.assets;
        });

        $scope.upgradeFileRange = function () {
            $scope.file_range++;

            for (var i = 0; i <= $scope.file_range; ++i) {
                if ($scope.file[i] == undefined) {
                    $scope.file[i] = {};
                }
            }
        };

        $scope.openObjectDetails = function (object) {
            $scope.dialog_mode = 'object_details';
            $scope.object_details = object;

            ObjlibService.getObjectCommon(object.id).then(function (data) {
                $scope.object_details = data;
            })
        };

        $scope.closeObjectDetails = function () {
            $scope.dialog_mode = 'common';
        };

        $scope.importObjectCommon = function () {
            ObjlibService.importObjectCommon($scope.object_details.id, function () {
                toastr.success(gettextCatalog.getString("Object imported successfully"));
                $scope.dialog_mode = 'common';
            });

        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };
    }

    function ImportInstanceDialogCtrl($scope, $mdDialog, AnrService, toastr, gettextCatalog, Upload) {
        $scope.file = [];
        $scope.file_range = 0;
        $scope.import = {
            mode: 'duplicate',
            password: null,
        };

        $scope.uploadFile = function (file) {
            file.upload = Upload.upload({
                url: '/api/client-anr/' + $scope.getUrlAnrId() + '/instances/import',
                data: {'mode': $scope.import.mode, file: file, password: $scope.import.password}
            });

            file.upload.then(function (response) {
                toastr.success(gettextCatalog.getString("The instance has been imported successfully"));
            });
        }

        $scope.upgradeFileRange = function () {
            $scope.file_range++;

            for (var i = 0; i <= $scope.file_range; ++i) {
                if ($scope.file[i] == undefined) {
                    $scope.file[i] = {};
                }
            }
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };
    }

})();

(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeKbModelsDetailsCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettext', 'gettextCatalog', 'TableHelperService',
            'ModelService', 'ObjlibService', 'AnrService', '$stateParams', '$rootScope',
            BackofficeKbModelsDetailsCtrl
        ]);

    /**
     * BO > KB > MODELS > MODEL DETAILS (ANR)
     */
    function BackofficeKbModelsDetailsCtrl($scope, toastr, $mdMedia, $mdDialog, gettext, gettextCatalog,
                                           TableHelperService, ModelService, ObjlibService, AnrService, $stateParams,
                                           $rootScope) {
        var self = this;

        $scope.updateModel = function () {
            ModelService.getModel($stateParams.modelId).then(function (data) {
                $scope.model = data;

                thresholdsWatchSetup = false;
                $scope.thresholds = {
                    thresholds: {min: $scope.model.anr.seuil1, max: $scope.model.anr.seuil2},
                    rolf_thresholds: {min: $scope.model.anr.seuilRolf1, max: $scope.model.anr.seuilRolf2}
                }

                $scope.updateInstances();
                $scope.updateObjectsLibrary();
                $scope.updateScales();
            });
        };

        $scope.updateModel();

        /**
         * Risk analysis
         */
        // Tree
        $scope.anr_obj_instances_data = [];
        $scope.anr_obj_library_data = [];

        // As our controller are static in this zone, we must go through the rootScope to update the selected instance
        // ID from the child controller (BackofficeAnrObjectInstanceCtrl)
        $rootScope.anr_selected_instance_id = $stateParams.instId;

        $scope.filter = {
            instance: '',
            library: ''
        };

        $scope.toggle = function (scope) {
            scope.toggle();
        }

        $scope.visible = function (item) {
            if (item.type == 'lib') {
                return !($scope.filter.library && $scope.filter.library.length > 0 &&
                    item.label1.toLowerCase().indexOf($scope.filter.library.toLowerCase()) == -1);
            } else if (item.type == 'inst') {
                return !($scope.filter.instance && $scope.filter.instance.length > 0 &&
                item.label1.toLowerCase().indexOf($scope.filter.instance.toLowerCase()) == -1);
            }

            return true;
        };

        $scope.insTreeCallbacks = {
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
            accept: function (sourceNodeScope, destNodeScope, destIndex) {
                return sourceNodeScope.$id == destNodeScope.$id;
            },

            dropped: function (e) {
                if (e.source.nodesScope.$treeScope.$id == e.dest.nodesScope.$treeScope.$id) {
                    return false;
                } else {
                    // Make a copy of the item from the library tree to the inst tree
                    var copy = angular.copy(e.source.nodeScope.$modelValue);
                    copy.type = 'inst';
                    e.source.nodesScope.$modelValue.push(copy);

                    // Also, tell the server to instantiate the object
                    AnrService.addInstance($scope.model.anr.id, copy.id, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function () {
                        $scope.updateInstances();
                    });

                    return true;
                }
            }
        };


        $scope.updateObjectsLibrary = function () {
            $scope.anr_obj_library_data = [];

            AnrService.getObjectsLibrary($scope.model.anr.id).then(function (data) {
                var recurseFillTree = function (category) {
                    var output = {id: category.id, type: 'libcat', label1: category.label1, __children__: []};

                    if (category.child && category.child.length > 0) {
                        for (var i = 0; i < category.child.length; ++i) {
                            output.__children__.push(recurseFillTree(category.child[i]));
                        }
                    }

                    if (category.objects && category.objects.length > 0) {
                        for (var i = 0; i < category.objects.length; ++i) {
                            var obj = category.objects[i];
                            obj.type = 'lib';
                            obj.__children__ = [];
                            output.__children__.push(obj);
                        }
                    }

                    return output;
                };

                for (var v = 0; v < data.categories.length; ++v) {
                    var cat = data.categories[v];
                    $scope.anr_obj_library_data.push(recurseFillTree(cat));
                }
            });
        };

        $scope.updateInstances = function () {
            AnrService.getInstances($scope.model.anr.id).then(function (data) {
                $scope.anr_obj_instances_data = [];

                var recurseFillTree = function (instance) {
                    var output = {id: instance.id, type: 'inst', label1: instance.label1, __children__: []};

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


        /**
         * Evaluation scales
         */
        $scope.range = function (min, max) {
            var array = [];
            for (var v = min; v <= max; ++v) {
                array.push(v);
            }

            return array;
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
            impacts: {min: '0', max: '3'},
            threats: {min: '0', max: '4'},
            vulns: {min: '0', max: '3'},
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
            $scope.info_risk_rows = $scope.range($scope.scales.impacts.min, $scope.scales.impacts.max);
            thresholdsWatchSetup = true;
        }, true);

        $scope.$watch('scales', function (newValue, oldValue) {
            if ($scope.model && $scope.model.anr && scaleWatchSetup) {
                if (oldValue.impacts.min != newValue.impacts.min || oldValue.impacts.max != newValue.impacts.max) {
                    AnrService.updateScale($scope.model.anr.id, 'impact', newValue.impacts.min, newValue.impacts.max);
                }
                if (oldValue.threats.min != newValue.threats.min || oldValue.threats.max != newValue.threats.max) {
                    AnrService.updateScale($scope.model.anr.id, 'threat', newValue.threats.min, newValue.threats.max);
                }
                if (oldValue.vulns.min != newValue.vulns.min || oldValue.vulns.max != newValue.vulns.max) {
                    AnrService.updateScale($scope.model.anr.id, 'vulnerability', newValue.vulns.min, newValue.vulns.max);
                }
            }

            scaleWatchSetup = true;
        }, true);

        $scope.$watch('comms', function (newValue, oldValue) {
            if (commsWatchSetup) {
                var smthChanged = false;

                if (!angular.equals(newValue.impact, oldValue.impact)) {
                    var update = function () {
                        $scope.updateScaleComments($scope.scales.impacts.id);
                    };

                    // Find which cell changed
                    for (var i in newValue.impact) {
                        for (var j in newValue.impact[i]) {
                            if (oldValue.impact[i][j] !== undefined && oldValue.impact[i][j].comment1 != newValue.impact[i][j].comment1) {
                                if (newValue.impact[i][j].id == null) {
                                    AnrService.createScaleComment($scope.model.anr.id, $scope.scales.impacts.id, i, newValue.impact[i][j].comment1, newValue.impact[i][j].scaleTypeImpact, update);
                                } else {
                                    AnrService.updateScaleComment($scope.model.anr.id, $scope.scales.impacts.id, newValue.impact[i][j].id, newValue.impact[i][j], update);
                                }
                            }
                        }
                    }
                }

                if (!angular.equals(newValue.threat, oldValue.threat)) {
                    var update = function () {
                        $scope.updateScaleComments($scope.scales.threats.id);
                    };

                    // Find which line changed
                    for (var i in newValue.threat) {
                        if (oldValue.threat[i] !== undefined && newValue.threat[i].comment1 != oldValue.threat[i].comment1) {
                            if (newValue.threat[i].id == null) {
                                AnrService.createScaleComment($scope.model.anr.id, $scope.scales.threats.id, i, newValue.threat[i].comment1, undefined, update);
                            } else {
                                AnrService.updateScaleComment($scope.model.anr.id, $scope.scales.threats.id, newValue.threat[i].id, newValue.threat[i], update);
                            }
                        }
                    }
                }

                if (!angular.equals(newValue.vuln, oldValue.vuln)) {
                    var update = function () {
                        $scope.updateScaleComments($scope.scales.vulns.id);
                    };

                    // Find which line changed
                    for (var i in newValue.vuln) {
                        if (oldValue.vuln[i] !== undefined && newValue.vuln[i].comment1 != oldValue.vuln[i].comment1) {
                            if (newValue.vuln[i].id == null) {
                                AnrService.createScaleComment($scope.model.anr.id, $scope.scales.vulns.id, i, newValue.vuln[i].comment1, undefined, update);
                            } else {
                                AnrService.updateScaleComment($scope.model.anr.id, $scope.scales.vulns.id, newValue.vuln[i].id, newValue.vuln[i], update);
                            }
                        }
                    }
                }
            }

            // Debounce the watch by 1 second
            setTimeout(function () { commsWatchSetup = true; }, 1000);
        }, true);

        $scope.onCreateNewColumn = function (newValue) {
            AnrService.createScaleType($scope.model.anr.id, $scope.scales.impacts.id, newValue, function () {
                $scope.updateScales();
            });
            $scope.newColumnName = null;
        };

        $scope.editAnrInfo = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'anr', CreateAnrDialogCtrl],
                templateUrl: '/views/dialogs/create.anr.html',
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: useFullScreen,
                locals: {
                    anr: $scope.model.anr
                }
            })
                .then(function (anr) {
                    AnrService.patchAnr($scope.model.anr.id, anr, function () {
                        toastr.success(gettext("The risk analysis details have been updated"), gettext("Update successful"));
                    });
                });
        };

        $scope.addObject = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'ObjlibService', 'AnrService', 'anr_id', AddObjectDialogCtrl],
                templateUrl: '/views/dialogs/add.objlib.html',
                targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: useFullScreen,
                locals: {
                    anr_id: $scope.model.anr.id
                }
            })
                .then(function (objlib) {
                    if (objlib && objlib.id) {
                        AnrService.addExistingObjectToLibrary($scope.model.anr.id, objlib.id, function () {
                            $scope.updateObjectsLibrary();
                        });
                    }
                });
        };

        $scope.updateScales = function () {
            AnrService.getScales($scope.model.anr.id).then(function (data) {
                for (var i = 0; i < data.scales.length; ++i) {
                    var scale = data.scales[i];

                    // We initialize empty objects for comments, then we call getScaleComments. Because Zend.
                    // When we post a comment, we need to check if the ID is empty or not, and call POST/PUT methods
                    // accordingly on the scales/:id/comments endpoint. For UI/UX reasons, we need to filter everything
                    // here since we don't have proper backend endpoints.

                    scaleWatchSetup = false;
                    if (scale.type == "impact") {
                        $scope.scales.impacts = scale;
                    } else if (scale.type == "threat") {
                        $scope.scales.threats = scale;

                        for (var j =  $scope.scales.threats.min; j < $scope.scales.threats.max; ++j) {
                            $scope.comms.threat[j] = {
                                id: null,
                                comment1: null
                            };
                        }
                    } else if (scale.type == "vulnerability") {
                        $scope.scales.vulns = scale;

                        for (var j =  $scope.scales.vulns.min; j < $scope.scales.vulns.max; ++j) {
                            $scope.comms.vuln[j] = {
                                id: null,
                                comment1: null
                            };
                        }
                    }
                }

                AnrService.getScalesTypes($scope.model.anr.id).then(function (data) {
                    $scope.scales_types = data.types;

                    // Same as above, setup placeholder comments structures
                    for (var i = $scope.scales.impacts.min; i < $scope.scales.impacts.max; ++i) {
                        $scope.comms.impact[i] = {};

                        for (var j = 0; j < $scope.scales_types.length; ++j) {
                            $scope.comms.impact[i][$scope.scales_types[j].id] = {
                                id: null,
                                comment1: null,
                                scaleTypeImpact: $scope.scales_types[j].id
                            };
                        }
                    }


                    // Then we finally load the actual comments for each section
                    $scope.updateScaleComments($scope.scales.impacts.id);
                    $scope.updateScaleComments($scope.scales.threats.id);
                    $scope.updateScaleComments($scope.scales.vulns.id);
                });
            });

        };

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

                    if (isImpact) {
                        obj[comm.val][comm.scaleTypeImpact.id] = comm;
                    } else {
                        obj[comm.val] = comm;
                    }
                }
            });
        };

    }

    function CreateAnrDialogCtrl($scope, $mdDialog, anr) {
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

    function AddObjectDialogCtrl($scope, $mdDialog, $q, ObjlibService, AnrService, anr_id) {
        $scope.objectSearchText = '';
        $scope.categorySearchText = '';

        $scope.objlib = {
            category: null,
            object: null
        };

        $scope.createAttachedObject = function () {
            $scope.objLibDialog = $mdDialog;
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettext', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', CreateObjlibDialogCtrl],
                templateUrl: '/views/dialogs/create.objlibs.html',
                clickOutsideToClose: true,
                locals: {
                    mode: 'anr',
                    objLibDialog: $scope,
                    objlib: null
                }
            }).then(function (objlib) {
                if (objlib) {
                    if (objlib.category) {
                        objlib.category = objlib.category.id;
                    }
                    if (objlib.asset) {
                        objlib.asset = objlib.asset.id;
                    }
                    if (objlib.rolfTag) {
                        objlib.rolfTag = objlib.rolfTag.id;
                    }

                    AnrService.addNewObjectToLibrary(anr_id, objlib, function (data) {

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
                category: $scope.objlib.category.id,
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

})();

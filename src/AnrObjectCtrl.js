(function () {

    angular
        .module('AnrModule')
        .controller('AnrObjectCtrl', [
            '$scope', '$rootScope', '$timeout', '$state', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', '$http', 'gettextCatalog',
            'ObjlibService', 'DownloadService', 'AnrService', 'InstanceService', '$location', 'AnrObject',
            AnrObjectCtrl
        ]);

    /**
     * BO > KB > INFO > Objects Library > Object details
     */
    function AnrObjectCtrl($scope, $rootScope, $timeout, $state, toastr, $mdMedia, $mdDialog, $stateParams, $http,
                                        gettextCatalog, ObjlibService, DownloadService, AnrService, InstanceService, $location, AnrObject) {

        if ($state.current.name == 'main.kb_mgmt.models.details.object' || $state.current.name == 'main.project.anr.object') {
            $scope.mode = 'anr';

            $scope.openRiskSheet = function (risk) {
                $scope.sheet_risk = risk;
            };

            $scope.resetSheet = function () {
                $scope.sheet_risk = undefined;
            };
        } else {
            $scope.mode = 'bdc';
        }

        $scope.instmode = 'obj';

        $rootScope.anr_selected_instance_id = null;
        $rootScope.anr_selected_object_id = $stateParams.objectId;
        $rootScope.BreadcrumbAnrHackLabel = gettextCatalog.getString('Library');

        var isObjectLoading = true;

        $scope.openObjectMenu = function ($mdMenuEvent, ev) {
            $mdMenuEvent();
        }

        $scope.$watch('object.risks', function (newValue, oldValue) {
            if (!isObjectLoading) {
                for (var i = 0; i < newValue.length; ++i) {
                    var newItem = newValue[i];
                    var oldItem = oldValue[i];

                    if (!angular.equals(newItem, oldItem)) {
                        // This risk changed, update it
                        ObjlibService.updateRisk(newItem.id, newItem);
                    }
                }

                // Update the whole table
                $timeout($scope.updateObjlib, 500);
            }
        }, true);


        $scope.updateObjlib = function (cb) {
            isObjectLoading = true;
            ObjlibService.getObjlib($stateParams.objectId, {mode: $scope.mode, anr: $rootScope.anr_id}).then(function (object) {
                $scope.object = object;
                $scope.composition = object.children;
                $scope.oprisks = object.oprisks;
                $scope.oprisks_total = object.oprisks.length;
                $timeout(function() { isObjectLoading = false; });

                if (cb) {
                    cb();
                }
            }, function(e){
                //cas d'erreur possible : l'objet n'est pas lié à cette anr
                if($rootScope.hookUpdateObjlib){
                    $rootScope.hookUpdateObjlib(true);
                }
            });
        };

        $scope.updateObjlib();


        $scope.deleteCompositionItem = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Detach this component?'))
                .textContent(gettextCatalog.getString('The selected component will be detached from the current object.'))
                .ariaLabel(gettextCatalog.getString('Detach this component'))
                .targetEvent(ev)
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function () {
                ObjlibService.deleteObjlibNode(item.component_link_id, function () {
                    if($scope.mode != undefined && $scope.mode == "anr"){
                        $scope.updateInstances();
                    }
                    $scope.updateObjlib();
                    toastr.success(gettextCatalog.getString('The object has been detached successfully'), gettextCatalog.getString('Component detached'));
                });
            }, function () {
                // Cancel
            })
        }

        $scope.detachInstance = function (ev, instance){
            InstanceService.detach($scope, ev, instance.id, function(){
                $scope.object.replicas.splice($scope.object.replicas.indexOf(instance), 1);
                $scope.updateModel();
            });
        }

        $scope.openDetachObjectDialog = function(ev, parents){
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AnrService', 'ObjlibService', 'InstanceService', '$parentScope', 'parents', 'gettextCatalog', 'toastr', '$state', DetachObjectDialog],
                templateUrl: '/views/anr/detach.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    '$parentScope': $scope,
                    parents: parents,
                    gettextCatalog: gettextCatalog,
                    toastr: toastr
                }
            })
            .then(function () {
                if ($scope.OFFICE_MODE == 'FO') {
                    ObjlibService.deleteObjlib($scope.object.id, function () {
                        toastr.success(gettextCatalog.getString('The object has been successfully deleted'));
                        if ($rootScope.hookUpdateObjlib) {
                            $rootScope.hookUpdateObjlib();
                        }
                        $state.transitionTo('main.project.anr', {modelId: $stateParams.modelId});
                    });
                } else {
                    AnrService.removeObjectFromLibrary($rootScope.anr_id, $scope.object.id, function () {
                        toastr.success(gettextCatalog.getString('The object has been detached from the library.'));
                        if ($rootScope.hookUpdateObjlib) {
                            $rootScope.hookUpdateObjlib(true);//true pour retouner sur la fiche du premier objet de la bibliothèque
                        }
                    });
                }
            });
        };

        $scope.deleteObject = function (ev) {
            if ($scope.mode == 'bdc') {
                var confirm = $mdDialog.confirm()
                    .title(gettextCatalog.getString('Delete this asset?'))
                    .textContent(gettextCatalog.getString('The current asset "{{ name }}" will be permanently deleted. Are you sure?',
                        {name: $scope.object.name1}))
                    .ariaLabel(gettextCatalog.getString('Delete this asset'))
                    .targetEvent(ev)
                    .ok(gettextCatalog.getString('Delete'))
                    .cancel(gettextCatalog.getString('Cancel'));

                $mdDialog.show(confirm).then(function () {
                    ObjlibService.deleteObjlib($scope.object.id, function () {
                        if ($scope.OFFICE_MODE == 'BO') {
                            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'objlibs'});
                        } else {
                            toastr.success(gettextCatalog.getString('The object has been successfully deleted'));
                            if ($rootScope.hookUpdateObjlib) {
                                $rootScope.hookUpdateObjlib();
                            }
                            $state.transitionTo('main.project.anr', {modelId: $stateParams.modelId});
                        }
                    });
                }, function () {
                    // Cancel
                })
            } else if ($scope.mode == 'anr') {
                //parents is a promise
                AnrObject.parents({anrid: $scope.model.anr.id, id: $scope.object.id}, function(parents){
                    if ($scope.object.replicas.length > 0 || parents.length > 0) {
                        $scope.openDetachObjectDialog(ev, parents);
                    } else {
                        var title = gettextCatalog.getString('Detach this asset?');
                        var content = gettextCatalog.getString('The current object "{{ name }}" will be removed from the library. Are you sure?',
                            {name: $scope._langField($scope.object,'name')});

                        if ($scope.OFFICE_MODE == 'FO') {
                            title = gettextCatalog.getString('Delete this asset');
                            content = gettextCatalog.getString('The current object "{{ name }}" will be permanently deleted. Are you sure?',
                                {name: $scope._langField($scope.object,'name')});
                        }

                        var confirm = $mdDialog.confirm()
                            .title(title)
                            .textContent(content)
                            .ariaLabel(gettextCatalog.getString('Detach this object'))
                            .targetEvent(ev)
                            .ok(gettextCatalog.getString('Detach'))
                            .cancel(gettextCatalog.getString('Cancel'));

                        $mdDialog.show(confirm).then(function () {
                            if ($scope.OFFICE_MODE == 'FO') {
                                ObjlibService.deleteObjlib($scope.object.id, function () {
                                    toastr.success(gettextCatalog.getString('The object has been successfully deleted'));
                                    if ($rootScope.hookUpdateObjlib) {
                                        $rootScope.hookUpdateObjlib();
                                    }
                                    $state.transitionTo('main.project.anr', {modelId: $stateParams.modelId});
                                });
                            } else {
                                AnrService.removeObjectFromLibrary($rootScope.anr_id, $scope.object.id, function () {
                                    toastr.success(gettextCatalog.getString('The object has been detached from the library.'));
                                    if ($rootScope.hookUpdateObjlib) {
                                        $rootScope.hookUpdateObjlib();
                                    }
                                });
                            }
                        }, function () {
                            // Cancel
                        })
                    }
                });
            }
        }

        $scope.createNewObjlib = function (ev, objlib) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            var isUpdate = (objlib && objlib.id);

            $scope.objLibDialog = $mdDialog;
            $scope.objLibDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', CreateObjlibDialogCtrl],
                templateUrl: '/views/anr/create.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    mode: $scope.mode,
                    objLibDialog: $scope,
                    objlib: objlib
                }
            })
                .then(function (objlib) {
                    if (objlib) {
                        if (objlib.asset) {
                            objlib.asset = objlib.asset.id;
                        }

                        if (objlib.rolfTag) {
                            objlib.rolfTag = objlib.rolfTag.id;
                        }

                        if (objlib.category && objlib.category.id) {
                            objlib.category = objlib.category.id;
                        }

                        if (isUpdate) {
                            ObjlibService.updateObjlib(objlib,
                                function () {
                                    $scope.updateObjlib();

                                    // If we're in an ANR, we might want to know when an object has been updated to
                                    // update labels in the trees
                                    if ($rootScope.hookUpdateObjlib) {
                                        $rootScope.hookUpdateObjlib();
                                    }

                                    toastr.success(gettextCatalog.getString('The object has been updated successfully.'), gettextCatalog.getString('Update successful'));
                                }
                            );
                        } else {
                            ObjlibService.createObjlib(objlib,
                                function () {
                                    $scope.updateObjlib();
                                    toastr.success(gettextCatalog.getString('The object has been created successfully.'), gettextCatalog.getString('Creation successful'));
                                }
                            );
                        }
                    }
                });
        };

        $scope.editObjlib = function (ev, objlib, dontFetch) {
            if (objlib && objlib.id) {
                if (dontFetch) {
                    $scope.createNewObjlib(ev, objlib);
                } else {
                    ObjlibService.getObjlib(objlib.id).then(function (objlibData) {
                        $scope.createNewObjlib(ev, objlibData);
                    });
                }
            } else {
                $scope.createNewObjlib(ev, objlib);
            }
        };

        $scope.exportObject = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'mode', ExportObjectDialog],
                templateUrl: '/views/anr/export.objlibs.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    mode: 'object'
                }
            })
                .then(function (exports) {
                    var url = '/api/objects-export';
                    if ($scope.OFFICE_MODE == 'FO') {
                        url = '/api/client-anr/' + $scope.model.anr.id + '/objects/' + $scope.object.id + '/export';
                    }
                    $http.post(url, {id: $scope.object.id, password: exports.password}).then(function (data) {
                        var contentD = data.headers('Content-Disposition'),
                            contentT = data.headers('Content-Type');
                        contentD = contentD.substring(0,contentD.length-1).split('filename="');
                        contentD = contentD[contentD.length-1];
                        DownloadService.downloadBlob(data.data, contentD,contentT);
                        toastr.success(gettextCatalog.getString('The object has been exported successfully.'), gettextCatalog.getString('Export successful'));
                    })
                });
        };

        $scope.cloneObject = function (ev) {
            var url = '/api/objects-duplication';
            if ($scope.OFFICE_MODE == 'FO') {
                url = '/api/client-anr/' + $scope.model.anr.id + '/objects-duplication';
            }
            $http.post(url, {id: $scope.object.id, implicitPosition: 2}).then(function (data) {
                toastr.success(gettextCatalog.getString('Ths object has been duplicated successfully.'), gettextCatalog.getString('Duplication successful'));

                if ($rootScope.hookUpdateObjlib) {
                    $rootScope.hookUpdateObjlib();
                }

                if ($scope.OFFICE_MODE == 'BO') {
                    $state.transitionTo("main.kb_mgmt.models.details.object", {modelId: $scope.model.id, objectId: data.data.id});
                } else {
                    $state.transitionTo("main.project.anr.object", {modelId: $scope.model.anr.id, objectId: data.data.id});
                }
            });
        };

        $scope.createComponent = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'ObjlibService', 'myself', '$rootScope', 'AnrService', 'mode', CreateComponentDialogCtrl],
                templateUrl: '/views/anr/create.objlibs.node.html',
                targetEvent: ev,
                clickOutsideToClose: false,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                fullscreen: useFullScreen,
                locals: {
                    'myself': $scope.object,
                    'mode': $scope.mode
                }
            })
                .then(function (objlib) {
                    if (objlib) {
                        objlib.father = $scope.object.id;

                        ObjlibService.createObjlibNode(objlib,
                            function () {
                                $scope.updateObjlib();
                                if($scope.mode != undefined && $scope.mode == "anr"){
                                    $scope.updateInstances();
                                }
                                toastr.success(gettextCatalog.getString('The component has been created successfully.'), gettextCatalog.getString('Creation successful'));
                            }
                        );
                    }
                });
        };

        $scope.moveComponent = function (item, direction) {
            ObjlibService.moveObjlibNode({id: item.component_link_id, move: direction}, function (data) {
                $scope.updateObjlib();
            })
        };

        $scope.showInModel = function(modelid, objectid){
            $location.path('/backoffice/kb/models/'+modelid+'/object/'+objectid);
        };


        $scope.$on('object-instancied', function(e, args){
            if(args.oid == $scope.object.id){
                $scope.updateObjlib();
            }
        });
    }


    function CreateComponentDialogCtrl($scope, $mdDialog, $q, ObjlibService, myself, $rootScope, AnrService, mode) {
        $scope.component = {
            position: null,
            child: null,
            implicitPosition: 1
        };

        $scope.objectSearchText = null;
        $scope.componentPreviousSearchText = null;

        $scope.mode = mode;

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            if ($scope.component.child) {
                $scope.component.child = $scope.component.child.id;
            }

            if ($scope.component.previous) {
                $scope.component.previous = $scope.component.previous.component_link_id;
            }

            $mdDialog.hide($scope.component);
        };

        $scope.queryObjectSearch = function (query) {
            var q = $q.defer();

            var handle_objects = function (x) {
                if (x && x.objects) {
                    var objects_filtered = [];

                    for (var i = 0; i < x.objects.length; ++i) {
                        if (x.objects[i].id != myself.id) {
                            objects_filtered.push(x.objects[i]);
                        }
                    }
                    q.resolve(objects_filtered);
                } else {
                    q.reject();
                }
            };

            if ($scope.mode != 'anr') {
                ObjlibService.getObjlibs({filter: query, order: $scope._langField('name')}).then(handle_objects, function (x) { q.reject(x); });
            } else {
                ObjlibService.getObjectsOfAnr($rootScope.anr_id, {filter: query, order: $scope._langField('name')}, handle_objects, function(x) {q.reject(x);});
            }


            return q.promise;
        };

        $scope.selectedObjectChange = function (item) {
            $scope.component.child = item;
        };

        $scope.queryComponentSearch = function (query) {
            if (query != '' && query != null) {
                var output = [];

                for (var i = 0; i < myself.children.length; i++) {
                    var child = myself.children[i];
                    if (child.name1.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
                        output.push(child);
                    }
                }

                return output;
            } else {
                return myself.children;
            }
        };

        $scope.selectedObjectChange = function (item) {
            $scope.component.child = item;
        };
    }


    function DetachObjectDialog($scope, $mdDialog, AnrService, ObjlibService, InstanceService, $parentScope, parents, gettextCatalog, toastr, $state) {
        $scope.object = $parentScope.object;

        $scope.parents = parents;

        $scope.goToInstance = function (id) {
            if ($scope.OFFICE_MODE == 'BO') {
                $state.transitionTo("main.kb_mgmt.models.details.instance", {instId: id});
            } else {
                $state.transitionTo("main.project.anr.instance", {modelId: $parentScope.model.anr.id, instId: id});
            }

            $scope.cancel();
        }

        $scope.detachInstance = function (ev, instance) {
            InstanceService.detach($parentScope, ev, instance.id, function(){
                $parentScope.updateObjlib(function(){
                    $parentScope.updateModel();
                    $parentScope.openDetachObjectDialog(ev, $scope.parents);
                });
            }, false, function () {
                $parentScope.openDetachObjectDialog(ev, $scope.parents);
            });
        };

        $scope.detachObject = function (ev, node) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Detach this component?'))
                .textContent(gettextCatalog.getString('The selected component will be detached from the current object.'))
                .ariaLabel(gettextCatalog.getString('Detach this component'))
                .targetEvent(ev)
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function () {
                ObjlibService.deleteObjlibNode(node.linkid, function () {
                    if($scope.mode != undefined && $scope.mode == "anr"){
                        $scope.updateInstances();
                    }
                    $parentScope.updateObjlib();
                    toastr.success(gettextCatalog.getString('The object has been detached successfully'), gettextCatalog.getString('Component detached'));
                    $scope.parents.splice($scope.parents.indexOf(node), 1);
                    $parentScope.openDetachObjectDialog(ev, $scope.parents);
                });
            }, function () {
                $parentScope.openDetachObjectDialog(ev, $scope.parents);
            })
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.detach = function() {
            $mdDialog.hide();
        };

    }

    function ExportObjectDialog($scope, $mdDialog, mode) {
        $scope.mode = mode;
        $scope.exportData = {
            password: '',
            simple_mode: true,
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.exportData);
        };
    }
})();

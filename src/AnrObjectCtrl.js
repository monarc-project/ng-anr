(function () {

    angular
        .module('AnrModule')
        .controller('AnrObjectCtrl', [
            '$scope', '$rootScope', '$timeout', '$state', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', '$http', 'gettextCatalog',
            'ObjlibService', 'DownloadService', 'AnrService', 'InstanceService', 'UserProfileService', '$location', 'AnrObject',
            AnrObjectCtrl
        ]);

    /**
     * BO > KB > INFO > Objects Library > Object details
     */
    function AnrObjectCtrl($scope, $rootScope, $timeout, $state, toastr, $mdMedia, $mdDialog, $stateParams, $http,
                                        gettextCatalog, ObjlibService, DownloadService, AnrService, InstanceService,
                                        UserProfileService, $location, AnrObject) {

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
                .title(gettextCatalog.getString('Detach component'))
                .textContent(gettextCatalog.getString('The selected component will be detached from the current asset.'))
                .ariaLabel(gettextCatalog.getString('Detach component'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function () {
                ObjlibService.deleteObjlibNode(item.component_link_id, function () {
                    if($scope.mode != undefined && $scope.mode == "anr"){
                        $scope.updateInstances();
                    }
                    $scope.updateObjlib();
                    toastr.success(gettextCatalog.getString('The asset has been detached successfully'), gettextCatalog.getString('Component detached'));
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
                templateUrl: 'views/anr/detach.objlibs.html',
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
                    ObjlibService.deleteObjlib($scope.object.uuid, function () {
                        toastr.success(gettextCatalog.getString('The asset has been successfully deleted'));
                        if ($rootScope.hookUpdateObjlib) {
                            $rootScope.hookUpdateObjlib();
                        }
                        $state.transitionTo('main.project.anr', {modelId: $stateParams.modelId});
                    });
                } else {
                    AnrService.removeObjectFromLibrary($rootScope.anr_id, $scope.object.uuid, function () {
                        toastr.success(gettextCatalog.getString('The asset has been detached from the library.'));
                        if ($rootScope.hookUpdateObjlib) {
                            $rootScope.hookUpdateObjlib(true);//true pour retouner sur la fiche du premier objet de la bibliothèque
                        }
                    });
                }
            }, function (reject) {
              $scope.handleRejectionDialog(reject);
            });
        };

        $scope.deleteObject = function (ev) {
            if ($scope.mode == 'bdc') {
                var confirm = $mdDialog.confirm()
                    .title(gettextCatalog.getString('Delete asset'))
                    .textContent(gettextCatalog.getString('The current asset will be permanently deleted. Are you sure?',
                        {name: $scope.object.name1}))
                    .ariaLabel(gettextCatalog.getString('Delete asset'))
                    .targetEvent(ev)
                    .theme('light')
                    .ok(gettextCatalog.getString('Delete'))
                    .cancel(gettextCatalog.getString('Cancel'));

                $mdDialog.show(confirm).then(function () {
                    ObjlibService.deleteObjlib($scope.object.uuid, function () {
                        if ($scope.OFFICE_MODE == 'BO') {
                            $state.transitionTo('main.kb_mgmt.info_risk', {'tab': 'objlibs'});
                        } else {
                            toastr.success(gettextCatalog.getString('The asset has been successfully deleted'));
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
                AnrObject.parents({anrid: $scope.model.anr.id, id: $scope.object.uuid}, function(parents){
                    if ($scope.object.replicas.length > 0 || parents.length > 0) {
                        $scope.openDetachObjectDialog(ev, parents);
                    } else {
                        var title = gettextCatalog.getString('Detach asset');
                        var content = gettextCatalog.getString('The current asset will be removed from the library. Are you sure?',
                            {name: $scope._langField($scope.object,'name')});

                        if ($scope.OFFICE_MODE == 'FO') {
                            title = gettextCatalog.getString('Delete asset');
                            content = gettextCatalog.getString('The current asset will be permanently deleted. Are you sure?',
                                {name: $scope._langField($scope.object,'name')});
                        }

                        var confirm = $mdDialog.confirm()
                            .title(title)
                            .textContent(content)
                            .ariaLabel(gettextCatalog.getString('Detach asset'))
                            .targetEvent(ev)
                            .theme('light')
                            .ok(gettextCatalog.getString('Detach'))
                            .cancel(gettextCatalog.getString('Cancel'));

                        $mdDialog.show(confirm).then(function () {
                            if ($scope.OFFICE_MODE == 'FO') {
                                ObjlibService.deleteObjlib($scope.object.uuid, function () {
                                    toastr.success(gettextCatalog.getString('The asset has been successfully deleted'));
                                    if ($rootScope.hookUpdateObjlib) {
                                        $rootScope.hookUpdateObjlib();
                                    }
                                    $state.transitionTo('main.project.anr', {modelId: $stateParams.modelId});
                                });
                            } else {
                                AnrService.removeObjectFromLibrary($rootScope.anr_id, $scope.object.uuid, function () {
                                    toastr.success(gettextCatalog.getString('The asset has been detached from the library.'));
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

            var isUpdate = (objlib && objlib.uuid);

            $scope.objLibDialog = $mdDialog;
            $scope.objLibDialog.show({
                controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', CreateObjlibDialogCtrl],
                templateUrl: 'views/anr/create.objlibs.html',
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
                            objlib.asset = objlib.asset.uuid;
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

                                    toastr.success(gettextCatalog.getString('The asset has been edited successfully.'), gettextCatalog.getString('Edition successful'));
                                }
                            );
                        } else {
                            ObjlibService.createObjlib(objlib,
                                function () {
                                    $scope.updateObjlib();
                                    toastr.success(gettextCatalog.getString('The asset has been created successfully.'), gettextCatalog.getString('Creation successful'));
                                }
                            );
                        }
                    }
                });
        };

        $scope.editObjlib = function (ev, objlib, dontFetch) {
            if (objlib && objlib.uuid) {
                if (dontFetch) {
                    $scope.createNewObjlib(ev, objlib);
                } else {
                    ObjlibService.getObjlib(objlib.uuid).then(function (objlibData) {
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
                templateUrl: 'views/anr/export.objlibs.html',
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
                    var url = 'api/objects-export';
                    if ($scope.OFFICE_MODE == 'FO') {
                        url = 'api/client-anr/' + $scope.model.anr.id + '/objects/' + $scope.object.uuid + '/export';
                    }
                    $http.post(url, {id: $scope.object.uuid, password: exports.password}).then(function (data) {
                        var contentD = data.headers('Content-Disposition'),
                            contentT = data.headers('Content-Type');
                        contentD = contentD.substring(0,contentD.length-1).split('filename="');
                        contentD = contentD[contentD.length-1];
                        if (exports.password == '') {
                            DownloadService.downloadJSON(data.data, contentD);
                        } else {
                            DownloadService.downloadBlob(data.data, contentD, contentT);
                        }
                        toastr.success(gettextCatalog.getString('The asset has been exported successfully.'), gettextCatalog.getString('Export successful'));
                    })
                }, function (reject) {
                  $scope.handleRejectionDialog(reject);
                });
        };

        $scope.publishObject = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'UserProfileService', 'toastr', 'gettextCatalog', '$http', 'objectUuid', 'anrId', PublishObjectDialog],
                templateUrl: 'views/anr/publish.object.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                  objectUuid : $scope.object.uuid,
                  anrId : $scope.model.anr.id
                }

            })
                .then(function (exports) {


                }, function (reject) {
                  $scope.handleRejectionDialog(reject);
                });
        };

        $scope.cloneObject = function (ev) {
            var url = 'api/objects-duplication';
            if ($scope.OFFICE_MODE == 'FO') {
                url = 'api/client-anr/' + $scope.model.anr.id + '/objects-duplication';
            }
            $http.post(url, {id: $scope.object.uuid, implicitPosition: 2}).then(function (data) {
                toastr.success(gettextCatalog.getString('The asset has been duplicated successfully.'), gettextCatalog.getString('Duplication successful'));

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
                templateUrl: 'views/anr/create.objlibs.node.html',
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
                        objlib.father = $scope.object.uuid;

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
                }, function (reject) {
                  $scope.handleRejectionDialog(reject);
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
            if(args.oid == $scope.object.uuid){
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
                $scope.component.child = $scope.component.child.uuid;
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
                        if (x.objects[i].uuid != myself.uuid) {
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
                .title(gettextCatalog.getString('Detach component'))
                .textContent(gettextCatalog.getString('The selected component will be detached from the current asset.'))
                .ariaLabel(gettextCatalog.getString('Detach component'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Detach'))
                .cancel(gettextCatalog.getString('Cancel'));

            $mdDialog.show(confirm).then(function () {
                ObjlibService.deleteObjlibNode(node.linkid, function () {
                    if($scope.mode != undefined && $scope.mode == "anr"){
                        $scope.updateInstances();
                    }
                    $parentScope.updateObjlib();
                    toastr.success(gettextCatalog.getString('The asset has been detached successfully'), gettextCatalog.getString('Component detached'));
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
            mosp: false,
            simple_mode: true,
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.exportData);
        };
    }

    function PublishObjectDialog($scope, $mdDialog, UserProfileService, toastr, gettextCatalog, $http, objectUuid, anrId) {

        let exportUrl = 'api/client-anr/' + anrId + '/objects/' + objectUuid + '/export';
        $http.post(exportUrl, {id: objectUuid, mosp: true}).then(function (data) {

            $scope.mospObject = {
              name : data.data.object.object.name,
              description : data.data.object.object.label,
              org_id :  4,
              schema_id : 21,
              json_object : data.data
            }

            UserProfileService.getProfile().then(function (data) {

              if (data.mospApiKey) {
                getMOSPData(data.mospApiKey);
              } else{
                  var setMospApiKey = $mdDialog.prompt()
                    .theme('light')
                    .title('What is your MOSP API Key?')
                    .textContent('Please register your API Key associated with your MOSP account or request one by emailing info@cases.lu.')
                    .placeholder('MOSP API Key')
                    .multiple(true)
                    .required(true)
                    .ok('Save')
                    .cancel('Cancel');

                  validateMospPApiKey();
              }

              function validateMospPApiKey() {
                $mdDialog.show(setMospApiKey).then(function (mospApiKey) {
                  UserProfileService.updateProfile({mospApiKey: mospApiKey}, function () {
                    getMOSPData(mospApiKey);
                  });
                }, function () {
                  $mdDialog.cancel();
                });
              };

              function getMOSPData(mospApiKey){
                let params = {
                    headers : {
                      // Authorization : 'Token ' + data.mospApiKey,
                      'X-API-KEY' : mospApiKey,
                      // 'Content-Type' : 'application/json',
                      Accept : 'application/json'
                    }
                };

                $http.get($rootScope.mospApiUrl + 'user/me', params).then(function (data){
                  $scope.mospAccount = {
                    // organization : 'MONARC',
                    organization_id : 4,
                    mospApiKey: mospApiKey,
                  }
                }, function () {
                  UserProfileService.updateProfile({mospApiKey: ''}, function () {
                    toastr.error(gettextCatalog.getString('Wrong MOSP API Key. Try again.'), gettextCatalog.getString('Error'));
                    validateMospPApiKey();
                  });
                });
              }
            });

        })


        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.publish = function() {
            $mdDialog.hide($scope.exportData);
        };
    }
})();

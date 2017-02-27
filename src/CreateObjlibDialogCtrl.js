function CreateObjlibDialogCtrl($scope, $mdDialog, toastr, gettextCatalog, AssetService, ObjlibService, ConfigService, TagService, $q, mode, objLibDialog, objlib) {
    $scope.mode = mode;
    $scope.languages = ConfigService.getLanguages();
    $scope.language = ConfigService.getDefaultLanguageIndex();
    $scope.assetSearchText = '';
    $scope.categories = [];
    var $parentScope = objLibDialog;

    $scope.importObject = objLibDialog.importObject;

    if (objLibDialog.__objlibDialog_ParentScope && objLibDialog.__objlibDialog_ParentScope.model) {
        $scope.model = objLibDialog.__objlibDialog_ParentScope.model;
    }

    if ($scope.OFFICE_MODE == 'FO') {
        $scope.language = $scope.getAnrLanguage();
    }

    if (objlib != undefined && objlib != null) {
        $scope.objlib = objlib;

        if ($scope.objlib.category && $scope.objlib.category.id) {
            $scope.objlib.category = $scope.objlib.category.id;
        }
    } else {
        $scope.objlib = {
            mode: ($scope.model !== undefined && $scope.model.isRegulator) ? 1 : 0,
            scope: 1,
            label1: '',
            label2: '',
            label3: '',
            label4: '',
            name1: '',
            name2: '',
            name3: '',
            name4: '',
            implicitPosition: 2,
            previous: null
        };
    }

    ObjlibService.getObjlibsCats().then(function (x) {
        // Recursively build items
        var buildItemRecurse = function (children, parentPath) {
            var output = [];

            for (var i = 0; i < children.length; ++i) {
                var child = children[i];

                if (parentPath != "") {
                    child[$scope._langField('label')] = parentPath + " >> " + $scope._langField(child,'label');
                }

                output.push(child);

                if (child.child && child.child.length > 0) {
                    var child_output = buildItemRecurse(child.child, $scope._langField(child,'label'));
                    output = output.concat(child_output);
                }
            }

            return output;
        };

        $scope.categories = buildItemRecurse(x.categories, "");
    });

    $scope.specificityStr = function (type) {
        switch (type) {
            case 0: return gettextCatalog.getString('Generic');
            case 1: return gettextCatalog.getString('Specific');
        }
    };

    $scope.queryAssetSearch = function (query) {
        var q = $q.defer();

        AssetService.getAssets({filter: query, order: $scope._langField('label')}).then(function (x) {
            q.resolve(x.assets);
        }, function (x) {
            q.reject(x);
        });

        return q.promise;
    };

    $scope.selectedAssetItemChange = function (item) {
        $scope.objlib.asset = item;

        if (!item || item.type != 1) {
            // Only primary assets can have a ROLF Tag set
            $scope.objlib.rolfTag = null;
        }
    };

    $scope.createCategory = function (ev, catName) {
        $mdDialog.show({
            controller: ['$scope', '$mdDialog', '$q', 'toastr', 'gettextCatalog', 'ConfigService', 'ObjlibService', 'categories', 'catName', CreateObjlibCategoryDialogCtrl],
            templateUrl: '/views/anr/create.objlibs.categories.html',
            clickOutsideToClose: false,
            preserveScope: false,
            scope: $scope.$dialogScope.$new(),
            locals: {
                'catName': catName,
                'categories': $scope.categories
            }
        })
            .then(function (category) {
                ObjlibService.createObjlibCat(category,
                    function (cat) {
                        // Set the created category on the object
                        ObjlibService.getObjlibCat(cat.categ.id).then(function (new_category) {
                            $scope.objlib.category = new_category;

                            // Display the dialog again
                            if (objLibDialog.editObjlib) {
                                objLibDialog.editObjlib(null, $scope.objlib, true);
                            } else if (objLibDialog.createAttachedObject) {
                                if ($scope.OFFICE_MODE == 'FO') {
                                    objLibDialog.createAttachedObject($parentScope, $mdDialog,
                                        $parentScope.__objlibDialog_State, $parentScope.__objlibDialog_Location,
                                        $parentScope.__objlibDialog_ParentScope, $parentScope.__objlibDialog_AnrService,
                                        null, $scope.objlib, true);
                                } else {
                                    objLibDialog.createAttachedObject(null, $scope.objlib);
                                }
                            }


                            toastr.success(gettextCatalog.getString('The category "{{categoryLabel}}" has been created successfully.',
                                {categoryLabel: $scope._langField(category,'label')}), gettextCatalog.getString('Creation successful'));
                        });
                    }
                );

            }, function () {
                if (objLibDialog.editObjlib) {
                    objLibDialog.editObjlib(null, $scope.objlib);
                } else if (objLibDialog.createAttachedObject) {
                    if ($scope.OFFICE_MODE == 'FO') {
                        objLibDialog.createAttachedObject($parentScope, $mdDialog,
                            $parentScope.__objlibDialog_State, $parentScope.__objlibDialog_Location,
                            $parentScope.__objlibDialog_ParentScope, $parentScope.__objlibDialog_AnrService,
                            null, $scope.objlib, true);
                    } else {
                        objLibDialog.createAttachedObject(null, $scope.objlib);
                    }
                }
            });
    };

    $scope.editCategory = function (ev, cat) {
        ObjlibService.getObjlibCat(cat).then(function (cat) {
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'toastr', 'gettextCatalog', 'ConfigService', 'ObjlibService', 'categories', 'catName', 'category', CreateObjlibCategoryDialogCtrl],
                templateUrl: '/views/anr/create.objlibs.categories.html',
                clickOutsideToClose: false,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                locals: {
                    'categories': $scope.categories,
                    'catName': null,
                    'category': cat
                }
            })
                .then(function (category) {
                    ObjlibService.updateObjlibCat(category,
                        function () {
                            if (objLibDialog.editObjlib) {
                                objLibDialog.editObjlib(null, $scope.objlib, true);
                            } else if (objLibDialog.createAttachedObject) {
                                if ($scope.OFFICE_MODE == 'FO') {
                                    objLibDialog.createAttachedObject($parentScope, $mdDialog,
                                        $parentScope.__objlibDialog_State, $parentScope.__objlibDialog_Location,
                                        $parentScope.__objlibDialog_ParentScope, $parentScope.__objlibDialog_AnrService,
                                        null, $scope.objlib, true);
                                } else {
                                    objLibDialog.createAttachedObject(null, $scope.objlib);
                                }
                            }

                            toastr.success(gettextCatalog.getString('The category "{{categoryLabel}}" has been updated successfully.',
                                {categoryLabel: $scope._langField(category,'label')}), gettextCatalog.getString('Update successful'));
                        }
                    );
                }, function () {
                    if (objLibDialog.editObjlib) {
                        objLibDialog.editObjlib(null, $scope.objlib);
                    } else if (objLibDialog.createAttachedObject) {
                        if ($scope.OFFICE_MODE == 'FO') {
                            objLibDialog.createAttachedObject($parentScope, $mdDialog,
                                $parentScope.__objlibDialog_State, $parentScope.__objlibDialog_Location,
                                $parentScope.__objlibDialog_ParentScope, $parentScope.__objlibDialog_AnrService,
                                null, $scope.objlib, true);
                        } else {
                            objLibDialog.createAttachedObject(null, $scope.objlib);
                        }
                    }
                });
        });
    };

    $scope.queryObjectSearch = function (query) {
        var q = $q.defer();

        ObjlibService.getObjlibs({filter: query, category: $scope.objlib.category, lock: true}).then(function (x) {
            var objFiltered = [];
            for (var i = 0; i < x.objects.length; ++i) {
                if (x.objects[i].id != $scope.objlib.id) {
                    objFiltered.push(x.objects[i]);
                }
            }

            q.resolve(objFiltered);
        });

        return q.promise;
    }

    $scope.queryCategorySearch = function (query) {
        var q = $q.defer();

        ObjlibService.getObjlibsCats({filter: query}).then(function (x) {
            // Recursively build items
            var buildItemRecurse = function (children, depth) {
                var output = [];

                for (var i = 0; i < children.length; ++i) {
                    var child = children[i];

                    for (var j = 0; j < depth; ++j) {
                        child[$scope._langField('label')] = " >> " + $scope._langField(child,'label');
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

        }, function (x) {
            q.reject(x);
        });

        return q.promise;
    };

    $scope.selectedCategoryItemChange = function (item) {
        $scope.objlib.category = item;
    };

    $scope.queryTagSearch = function (query) {
        var q = $q.defer();

        TagService.getTags({filter: query}).then(function (x) {
            q.resolve(x.tags);
        }, function (x) {
            q.reject(x);
        });

        return q.promise;
    };

    $scope.selectedTagItemChange = function (item) {
        $scope.objlib.rolfTag = item;
    };

    $scope.selectedPreviousObjItemChange = function (item) {
        $scope.objlib.previous = item;
    };


    $scope.cancel = function() {
        $mdDialog.cancel();
    };

    $scope.create = function() {
        if ($scope.objlib.previous) {
            $scope.objlib.previous = $scope.objlib.previous.id;
        }
        $mdDialog.hide($scope.objlib);
    };

    $scope.createAndContinue = function () {
        $scope.objlib.cont = true;
        $scope.create();
    }
}

function CreateObjlibCategoryDialogCtrl($scope, $mdDialog, $q, toastr, gettextCatalog, ConfigService, ObjlibService, categories, catName, category) {
    $scope.languages = ConfigService.getLanguages();
    $scope.language = ConfigService.getDefaultLanguageIndex();
    $scope.implicitPosition = null;
    $scope.showConfirmDeletion = false;
    $scope.categories = categories;

    if ($scope.OFFICE_MODE == 'FO') {
        $scope.language = $scope.getAnrLanguage();
    }

    $scope.destroy = function() {
        $scope.showConfirmDeletion = true;
    };

    $scope.destroyConfirm = function() {
        ObjlibService.deleteObjlibCat($scope.category.id, function () {
            $mdDialog.cancel();
            toastr.success(gettextCatalog.getString('The category "{{categoryLabel}}" has been deleted.',
                {categoryLabel: category.label1}), gettextCatalog.getString('Deletion successful'));
        });
    };

    $scope.cancel = function() {
        $mdDialog.cancel();
    };

    $scope.create = function() {
        if ($scope.implicitPosition == 1 || $scope.implicitPosition == 2) {
            // -1 ==> At the beginning
            // -2 ==> In the end
            $scope.category.position = -$scope.implicitPosition;
        }

        $mdDialog.hide($scope.category);
    };

    $scope.updateCategoryChildren = function () {
        ObjlibService.getObjlibsCats({lock: true, parentId: $scope.category.parent ? $scope.category.parent : 0, catid: $scope.category.id}).then(function (x) {
            $scope.childrenCategories = x.categories;
        });
    };

    if (category != undefined && category != null) {
        $scope.category = category;

        if ($scope.category.parent) {
            $scope.category.parent = $scope.category.parent.id;
        }
        if (category.previous) {
            $scope.updateCategoryChildren();
        }
    } else {
        $scope.category = {
            parent: null,
            implicitPosition: 2,
            position: null,
            label1: catName,
            label2: '',
            label3: '',
            label4: '',
        };
    }
}

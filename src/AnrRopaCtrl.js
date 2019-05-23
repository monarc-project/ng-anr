(function () {
    angular
        .module('AnrModule')
        .controller('AnrRopaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog',
            '$state', '$stateParams', '$q', 'RecordService', 'TableHelperService',
            AnrRopaCtrl
        ]);

    /**
    * ANR > RECORD OF PROCESSING ACTIVITIES
    */
    function AnrRopaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog,
        $state, $stateParams, $q, RecordService, TableHelperService) {
        $scope.language = $scope.getAnrLanguage();
        $scope.records = {};
        RecordService.getRecords({order: 'label1'}).then(function (data) {
            $scope.records.items = data;
            if (data['records'][0]) {
                $scope.records.selected = data['records'][0].id;
                $scope.recordTabSelected = 0;
            }
        });

        $scope.createNewRecord = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
                templateUrl: 'views/anr/create.records.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'record' : record,
                    'anrId': $scope.model.anr.id
                }
            })
            .then(function (record) {
                var cont = record.cont;
                record.cont = undefined;
                console.log(record);
                RecordService.createRecord(record,
                    function (status) {
                        $scope.records.selected = status.id;
                        $scope.recordTabSelected = $scope.records.items.count + 1;
                        console.log("abasdasd");
                        toastr.success(gettextCatalog.getString('The record has been created successfully.',
                              {recordLabel: $scope._langField(record,'label')}), gettextCatalog.getString('Creation successful'));
                        if (cont) {
                            $scope.createNewRecord(ev);
                        }
                    },

                    function () {
                        console.log("wqeeeeeeeeeeeee");
                        $scope.createNewRecord(ev, record);
                    }
                );
            });
        };

        $scope.editRecord = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RecordService.getRecord(record).then(function (recordData) {
                $mdDialog.show({
                    controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
                    templateUrl: 'views/anr/create.records.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'record': recordData,
                        'anrId': $scope.model.anr.id
                    }
                })
                .then(function (record) {
                    RecordService.updateRecord(record,
                        function () {
                            $scope.updateRecords();
                            toastr.success(gettextCatalog.getString('The record has been edited successfully.',
                                {recordLabel: record.label1}), gettextCatalog.getString('Edition successful'));
                        },

                        function () {
                            $scope.editRecord(ev, record);
                        }
                    );
                });
            });
        };
        $scope.deleteRecord = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete record?',
                    {label: item.label1}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                RecordService.deleteRecord(item,
                    function () {
                        $scope.updateRecords();
                        toastr.success(gettextCatalog.getString('The record has been deleted.',
                                    {label: item.label1}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            });
        };
    }
    function CreateRecordDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, ConfigService, record) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        var defaultLang = angular.copy($scope.language);

        if (record != undefined && record != null) {
            $scope.record = record;
        } else {
          $scope.record = {
              label1: '',
              label2: '',
              label3: '',
              label4: '',
              controller: {},
              recipientCategories: [],
              processors: [],
              jointControllers: [],
          };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            for (var i = 1; i <=4; i++) {
              if ($scope.record['label' + i] == '' && i != defaultLang) {
                $scope.record['label' + i] = $scope.record['label' + defaultLang];
              }
            }
            $scope.record['cont'] = false;
            $mdDialog.hide($scope.record);
        };
        $scope.createAndContinue = function () {
            for (var i = 1; i <=4; i++) {
              if ($scope.record['label' + i] == '' && i != defaultLang) {
                $scope.record['label' + i] = $scope.record['label' + defaultLang];
              }
            }
            $scope.record.cont = true;
            $mdDialog.hide($scope.record);
        };
        $scope.controllerItemSelected = function () {
            if ($scope.selectedController !== null)
                $scope.record.controller = $scope.selectedController;
            else {
                $scope.record.controller = {};
            }
        };
        $scope.controllerTextChanged = function () {
            $scope.record.controller['label'] = $scope.controllerSearchText;
        };
        $scope.queryRecordControllerSearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordControllers({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e['record-controllers'].length; ++j) {
                    var found = false;

                    for (var i = 0; i < $scope.record.jointControllers.length; ++i) {
                        if ($scope.record.jointControllers[i].id == e['record-controllers'][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e['record-controllers'][j]);
                    }
                }
                promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });
            return promise.promise;
        };
        $scope.toggleJointControllerOn = function () {
            $scope.joint={};
            $scope.addJointController = true;
        };
        $scope.toggleJointControllerOff = function () {
            $scope.addJointController = false;
        };
        $scope.addNewJointController = function () {
            var newJoint = {'label' : $scope.joint.name,
                            'contact' : $scope.joint.contact};
            RecordService.createRecordController(newJoint,
                function (status) {
                    $scope.record.jointControllers.push({   'id': status.id,
                                                            'label' : newJoint.label,
                                                            'contact' : newJoint.contact});
                    console.log($scope.record);
                    toastr.success(gettextCatalog.getString('The joint controller has been created successfully.',
                    {controllerLabel: $scope._langField(newJoint,'label')}), gettextCatalog.getString('Creation successful'));
                }
            );
            $scope.joint  = {};
            $scope.addJointController = false;
        };

        $scope.queryRecordRecipientCategorySearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordRecipientCategories({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e['record-recipient-categories'].length; ++j) {
                    var found = false;

                    for (var i = 0; i < $scope.record.recipientCategories.length; ++i) {
                        if ($scope.record.recipientCategories[i].id == e['record-recipient-categories'][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e['record-recipient-categories'][j]);
                    }
                }
                promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });
            return promise.promise;
        };
        $scope.createNewRecipientCategory = function (ev, recipientCategory) {
            var newRecipientCategory = {'label' : $scope.recipientCategorySearchText};
            RecordService.createRecordRecipientCategory(newRecipientCategory,
                function (status) {
                    $scope.record.recipientCategories.push({'id': status.id,
                                                            'label' : newRecipientCategory['label']});
                    toastr.success(gettextCatalog.getString('The recipient category has been created successfully.',
                    {recipientCategoryLabel: $scope._langField(newRecipientCategory,'label')}), gettextCatalog.getString('Creation successful'));
                }
            );
            $scope.joint  = {};
            $scope.addJointController = false;
        };


        $scope.queryRecordProcessorSearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordProcessors({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e['record-processors'].length; ++j) {
                    var found = false;

                    for (var i = 0; i < $scope.record.processors.length; ++i) {
                        if ($scope.record.processors[i].id == e['record-processors'][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e['record-processors'][j]);
                    }
                }

                promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });
            return promise.promise;
        };
        $scope.addNewProcessor = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'anrId', AddProcessorDialogCtrl],
                templateUrl: 'views/anr/add.processor.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'anrId': $scope.anrId
                }
            })
            .then(function (processor) {
                RecordService.createRecordProcessor(processor,
                    function (status) {
                        processor['id'] = status.id;
                        $scope.record.processors.push(processor);
                        console.log($scope.record);
                        toastr.success(gettextCatalog.getString('The processor has been created successfully.',
                        {processorLabel: $scope._langField(processor,'label')}), gettextCatalog.getString('Creation successful'));
                    }
                );
            })
            .finally( function () {
                $mdDialog.show({
                    controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
                    templateUrl: 'views/anr/create.records.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'record' : $scope.record,
                        'anrId': $scope.anrId
                    }
                })
            });
        };
    }

    function AddProcessorDialogCtrl($scope, toastr, $mdDialog, gettextCatalog, $q, RecordService, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.behalf = {   name : '',
                            contactDetail : ''};
        var defaultLang = angular.copy($scope.language);
        $scope.processor = {
            label: '',
            controllers: [],
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.addProcessor = function() {
            $mdDialog.hide($scope.processor);
        };
        $scope.queryRecordControllerSearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordControllers({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e['record-controllers'].length; ++j) {
                    var found = false;

                    for (var i = 0; i < $scope.processor.controllers.length; ++i) {
                        if ($scope.processor.controllers[i].id == e['record-controllers'][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e['record-controllers'][j]);
                    }
                }

                promise.resolve(filtered);
            }, function (e) {
                promise.reject(e);
            });
            return promise.promise;
        };
        $scope.toggleBehalfControllerOn = function () {
            $scope.behalf={};
            $scope.addBehalfController = true;
        }
        $scope.toggleBehalfControllerOff = function () {
            $scope.addBehalfController = false;
        }
        $scope.addNewBehalfController = function () {
            var newBehalf = {'label' : $scope.behalf.name,
                             'contact' : $scope.behalf.contact};
            RecordService.createRecordController(newBehalf,
                function (status) {
                    $scope.processor.controllers.push({ 'id': status.id,
                                                        'label' : newBehalf.label,
                                                        'contact' : newBehalf.contact});
                    console.log($scope.processor);
                    toastr.success(gettextCatalog.getString('The behalf controller has been created successfully.',
                    {controllerLabel: $scope._langField(newBehalf,'label')}), gettextCatalog.getString('Creation successful'));
                }
            );
            $scope.behalf = {};
            $scope.addJointController = false;
        }
    }
})();

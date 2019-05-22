(function () {
    angular
        .module('AnrModule')
        .controller('AnrRopaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state',
            '$stateParams', '$q', 'RecordService', 'RecordControllerService', 'RecordProcessorService',
            'RecordRecipientCategoryService', 'TableHelperService',
            AnrRopaCtrl
        ]);

    /**
    * ANR > RECORD OF PROCESSING ACTIVITIES
    */
    function AnrRopaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog,
        $state, $stateParams, $q, RecordService, RecordControllerService,
        RecordProcessorService, RecordRecipientCategoryService, TableHelperService) {
        $scope.language = $scope.getAnrLanguage();

        $scope.createNewRecord = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdMedia', '$mdDialog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
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
                /*if(!record.controller.id) {
                    RecordControllerService.createRecordController(record.controller)
                    .then(function (controller) {
                        record.controller = controller.id;
                    })
                }*/
                var jointControllerIds = [];
                for (var i = 0; i < record.jointControllers.length; ++i) {
                    if(!record.jointControllers[i].id) {
                        RecordControllerService.createRecordController(record.jointControllers[i])
                        .then(function (controller) {
                            jointControllerIds.push(controller.id);
                        })
                    }
                }
                record.jointControllers = jointControllerIds;
                console.log(record);
                RecordService.createRecord(record,
                    function () {
                        $scope.recordTabSelected = $scope.records.items.count + 1;
                        toastr.success(gettextCatalog.getString('The record has been created successfully.',
                              {recordLabel: $scope._langField(record,'label')}), gettextCatalog.getString('Creation successful'));
                        console.log('sadasdas');
                        if (cont) {
                            $scope.createNewRecord(ev);
                        }
                    },

                    function () {
                        $scope.createNewRecord(ev, record);
                        console.log('wqeeeeeeeeeeeeeee');
                    }
                );
            });
        };

        $scope.editRecord = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RecordService.getRecord(record).then(function (recordData) {
                $mdDialog.show({
                    controller: ['$scope', '$mdMedia', '$mdDialog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
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
    function CreateRecordDialogCtrl($scope, $mdMedia, $mdDialog, $q, RecordService, ConfigService, record) {
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
              recipients: [],
              processors: [],
              jointControllers: [],
          };
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            for (var i = 1; i <=4; i++) {
              if (!$scope.record.controller['label' + i] && i != defaultLang) {
                $scope.record.controller['label' + i] = $scope.record.controller['label' + defaultLang];
              }
            }
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
        }
        $scope.addRecipient = function () {
            $scope.record.recipients.push($scope.recipient);
        }
        $scope.removeRecipient = function (x) {
            $scope.record.recipients.splice(x, 1);
        }
        $scope.addNewProcessor = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', '$q', 'ConfigService', 'anrId', AddProcessorDialogCtrl],
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
                $scope.record.processors.push(processor);
            })
            .finally( function () {
                $mdDialog.show({
                    controller: ['$scope', '$mdMedia', '$mdDialog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
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
        }
    }
    function AddProcessorDialogCtrl($scope, $mdDialog, $q, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.behalf = {   name : '',
                            contactDetail : ''};
        var defaultLang = angular.copy($scope.language);
        $scope.processor = {
            label1: '',
            label2: '',
            label3: '',
            label4: '',
            controllers: [],
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.addProcessor = function() {
            $mdDialog.hide($scope.processor);
        };
        $scope.addBehalfController = function () {
            $scope.processor.controllers.push( {'name' : $scope.behalf.name,
                                                'contactDetail' : $scope.behalf.contact} );
            console.log($scope.processor);
            $scope.behalf = {   name : '',
                                contactDetail : ''};
            $scope.addNewController = false;
        }
        $scope.removeController = function (x) {
            $scope.processor.controllers.splice(x, 1);
        }
        $scope.cancelNewBehalfController = function () {
            $scope.addNewController = false;
        }
    }
})();

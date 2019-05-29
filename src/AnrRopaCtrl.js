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
        $scope.records = {
            'items' : [],
            'selected' : -1
        };
        $scope.createNewRecord = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
                templateUrl: 'views/anr/create.records.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
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
                RecordService.createRecord(record,
                    function (status) {
                        $scope.records.selected = status.id;
                        $scope.recordTabSelected = $scope.records.items.count + 1;
                        $scope.updateRecords();
                        toastr.success(gettextCatalog.getString('The record has been created successfully.',
                              {recordLabel: $scope._langField(record,'label')}), gettextCatalog.getString('Creation successful'));
                        if (cont) {
                            $scope.createNewRecord(ev);
                        }
                    },

                    function () {
                        $scope.createNewRecord(ev, record);
                    }
                );
            });
        };

        $scope.editRecord = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RecordService.getRecord(record).then(function (recordData) {
                recordData['erasure'] = (new Date(recordData['erasure']));
                $mdDialog.show({
                    controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'record', 'anrId', CreateRecordDialogCtrl],
                    templateUrl: 'views/anr/create.records.html',
                    targetEvent: ev,
                    preserveScope: true,
                    scope: $scope,
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
                            $scope.records.selected = record.id;
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
        $scope.selectRecord = function(recordId, index) {
            $scope.recordTabSelected = index;
            RecordService.getRecord(recordId).then(function (data) {
                data['erasure'] = (new Date(data['erasure']));
                $scope.records.selected = recordId;
                $scope.record = data;
            });
        };

        $scope.updateRecords = function() {
            RecordService.getRecords({order: 'created_at'}).then(function (data) {
                for (var j = 0; j < data.records.length; ++j) {
                    data['records'][j]['erasure'] = (new Date(data['records'][j]['erasure']));
                }
                $scope.records.items = data;
                if ($scope.records.items.count>0 && $scope.records.selected === -1) {
                    $scope.selectRecord($scope.records.items.records[0].id);
                    $scope.recordTabSelected = 0;
                }
            });
        };
        $scope.updateRecords();

        $scope.export = function () {
            finalArray=[];
            recLine = 0;
            RecordService.getRecord($scope.records.selected).then(function (data) {

                finalArray[recLine]= gettextCatalog.getString('Record label');
                finalArray[recLine]+=','+"\""+$scope._langField(data,'label')+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Controller name');
                finalArray[recLine]+=','+"\""+data.controller.label+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Controller contact');
                finalArray[recLine]+=','+"\""+data.controller.contact+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString("Controller\'s representative");
                finalArray[recLine]+=','+"\""+data.representative+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Data protection officer');
                finalArray[recLine]+=','+"\""+data.dpo+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Purposes of the processing');
                finalArray[recLine]+=','+"\""+data.purposes+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Description of the categories of data subjects and of the categories of personal data');
                finalArray[recLine]+=','+"\""+data.description+"\"";
                if(data.idThirdCountry!=null) {
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString('ID of third country or internation organisation recipient');
                    finalArray[recLine]+=','+"\""+data.idThirdCountry+"\"";
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString("Third country or internation organisation\'s data protection officer");
                    finalArray[recLine]+=','+"\""+data.dpoThirdCountry+"\"";
                }
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Time limits for erasure');
                finalArray[recLine]+=','+"\""+data.erasure.slice(0,10)+"\"";
                recLine++;
                finalArray[recLine]= gettextCatalog.getString('Technical and organisational security measures');
                finalArray[recLine]+=','+"\""+data.secMeasures+"\"";
                if(data["jointControllers"].length > 0) {
                    recLine++;
                    finalArray[recLine]="\""+' '+"\"";
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString('Joint controllers');
                    finalArray[recLine]+=','+gettextCatalog.getString('Name');
                    finalArray[recLine]+=','+gettextCatalog.getString('Contact');
                    for(var j = 0; j < data["jointControllers"].length; ++j) {
                        recLine++;
                        finalArray[recLine]="\""+' '+"\"";
                        finalArray[recLine]+=','+"\""+data["jointControllers"][j].label+"\"";
                        finalArray[recLine]+=','+"\""+data["jointControllers"][j].contact+"\"";
                    }
                }
                if(data["recipients"].length > 0) {
                    recLine++;
                    finalArray[recLine]="\""+' '+"\"";
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString('Recipient Categories');
                    for(var j = 0; j < data["recipients"].length; ++j) {
                        finalArray[recLine]+=','+"\""+data["recipients"][j].label+"\"";
                        if(j != data["recipients"].length -1) {
                            recLine++;
                            finalArray[recLine]="\""+' '+"\"";
                        }
                    }
                }
                if(data["processors"].length > 0) {
                    recLine++;
                    finalArray[recLine]="\""+' '+"\"";
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString('Data processors');
                    finalArray[recLine]+=','+gettextCatalog.getString('Name');
                    finalArray[recLine]+=','+gettextCatalog.getString('Contact');
                    for(var j = 0; j < data["processors"].length; ++j) {
                        recLine++;
                        finalArray[recLine]="\""+' '+"\"";
                        finalArray[recLine]+=','+"\""+data["processors"][j].label+"\"";
                        finalArray[recLine]+=','+"\""+data["processors"][j].contact+"\"";
                    }
                }
                let csvContent = "data:text/csv;charset=UTF-8,\uFEFF";
                for(var j = 0; j < finalArray.length; ++j) {
                    let row = finalArray[j].toString().replace(/\n|\r/g,' ') + "," + "\r\n";
                    csvContent += row ;
                }

                var encodedUri = encodeURI(csvContent);
                var link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "recordOfProcessingActivities.csv");
                document.body.appendChild(link);
                link.click();  // This will download the data file named "soa.csv".
            });
        };
    }

    function CreateRecordDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, ConfigService, record) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        var defaultLang = angular.copy($scope.language);

        if (record != undefined && record != null) {
            $scope.controllerSearchText = record.controller.label;
            $scope.record = record;
        } else {
            $scope.controllerSearchText = "";
            $scope.record = {
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                controller: {},
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
            $scope.record.jointControllers.push({   'label' : $scope.joint.name,
                                                    'contact' : $scope.joint.contact });
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

                    for (var i = 0; i < $scope.record.recipients.length; ++i) {
                        if ($scope.record.recipients[i].id == e['record-recipient-categories'][j].id) {
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
        $scope.createNewRecipientCategory = function (ev, recipientCategorySearchText) {
            $scope.record.recipients.push({'label' : recipientCategorySearchText});
            $scope.recipientCategorySearchText="";
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
                $scope.record.processors.push(processor);
            })
            .finally( function () {
                if(!$scope.record.id) {
                    $scope.createNewRecord(ev, $scope.record);
                }
                else {
                    $scope.editRecord(ev, $scope.record.id);
                }
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
            $scope.processor.controllers.push({ 'label' : $scope.behalf.name,
                                                'contact' : $scope.behalf.contact});
            $scope.behalf = {};
            $scope.addBehalfController = false;
        }
    }
})();

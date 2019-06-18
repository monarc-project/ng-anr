(function () {
    angular
        .module('AnrModule')
        .controller('AnrRopaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog',
            '$state', 'DownloadService', '$http', '$stateParams', '$q', 'RecordService', 'TableHelperService',
            AnrRopaCtrl
        ]);

    /**
    * ANR > RECORD OF PROCESSING ACTIVITIES
    */
    function AnrRopaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog,
        $state, DownloadService, $http, $stateParams, $q, RecordService, TableHelperService) {
        $scope.language = $scope.getAnrLanguage();
        $scope.recordTabSelected = 0;
        $scope.records = {
            'items' : [],
            'selected' : -1
        };
        $scope.createNewRecord = function (ev) {
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
                    'record' : null,
                    'anrId': $scope.model.anr.id
                }
            })
            .then(function (record) {
                var cont = record.cont;
                record.cont = undefined;
                $scope.record = undefined;
                RecordService.createRecord(record,
                    function (status) {
                        $scope.updateRecords();
                        $scope.selectRecord(status.id, $scope.records.items.count);
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
            }).catch(angular.noop);
        };

        $scope.editRecord = function (ev, recordId) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RecordService.getRecord(recordId).then(function (recordData) {
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
                    $scope.record = undefined;
                    RecordService.updateRecord(record,
                        function () {
                            $scope.updateRecords();
                            $scope.selectRecord(record.id);
                            toastr.success(gettextCatalog.getString('The record has been edited successfully.',
                                {recordLabel: $scope._langField(record,'label')}), gettextCatalog.getString('Edition successful'));
                        },

                        function () {
                            $scope.editRecord(ev, recordId);
                        }
                    );
                }).catch(angular.noop);
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
                                    {label: $scope._langField(item,'label')}), gettextCatalog.getString('Deletion successful'));
                    }
                );
            }).catch(angular.noop);
        };

        $scope.editProcessor = function (ev, processorId) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RecordService.getRecordProcessor(processorId).then(function (processorData) {
                $mdDialog.show({
                    controller: ['$scope', 'toastr', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'processor', 'anrId', AddProcessorDialogCtrl],
                    templateUrl: 'views/anr/add.processor.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'processor': processorData,
                        'anrId': $scope.model.anr.id
                    }
                })
                .then(function (processor) {
                    RecordService.updateRecordProcessor(processor,
                        function () {
                            $scope.updateRecords();
                            $scope.selectRecord($scope.currentRecord.id);
                            toastr.success(gettextCatalog.getString('The processor has been edited successfully.',
                                {processorLabel: processor.label}), gettextCatalog.getString('Edition successful'));
                        },

                        function () {
                            $scope.editProcessor(ev, processorId);
                        }
                    );
                }).catch(angular.noop);
            });
        };

        $scope.unbindProcessor = function (ev, recordId, processorId) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            RecordService.getRecord(recordId).then(function (recordData) {
                recordData['erasure'] = (new Date(recordData['erasure']));
                for( var i = 0; i < recordData['processors'].length; i++){
                   if ( recordData['processors'][i].id === processorId) {
                       recordData['processors'].splice(i, 1);
                   }
                }
                RecordService.updateRecord(recordData,
                    function () {
                        $scope.updateRecords();
                        $scope.selectRecord(recordData['id']);
                        toastr.success(gettextCatalog.getString('The processor has been detached successfully.'));
                    },

                    function () {
                        $scope.editRecord(ev, recordId);
                    }
                );
            }).catch(angular.noop);
        };

        $scope.selectRecord = function(recordId, index = -1) {
            $scope.selectingRecord = true;
            RecordService.getRecord(recordId).then(function (data) {
                data['erasure'] = (new Date(data['erasure']));
                $scope.currentRecord = data;
                $scope.records.selected = recordId;
                if(index !== -1) {
                    $scope.recordTabSelected = index;
                }
                $scope.step = { // Deliverable data
                  num:6,
                  record : recordId
                };
                $scope.selectingRecord = false;
            });
        };

        $scope.updateRecords = function() {
            $scope.updatingRecords = true;
            RecordService.getRecords({order: 'created_at'}).then(function (data) {
                for (var j = 0; j < data.records.length; ++j) {
                    data['records'][j]['erasure'] = (new Date(data['records'][j]['erasure']));
                }
                $scope.records.items = data;
                if ($scope.records.items.count>0 && $scope.records.selected === -1) {
                    $scope.selectRecord($scope.records.items.records[0].id, 0);
                }
                $scope.updatingRecords = false;
            });
        };
        $scope.updateRecords();

        $scope.jsonExport = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', ExportRecordDialogCtrl],
                templateUrl: 'views/anr/export.record.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                }
            }).then(function (exports) {
                var cliAnr = '';
                var method = $http.get;
                if ($scope.OFFICE_MODE == 'FO') {
                    cliAnr = 'client-';
                    method = $http.post;
                }
                method('api/'+cliAnr+'anr/' + $scope.model.anr.id + '/records/' + $scope.currentRecord.id + '/export', {id: $scope.currentRecord.id, password: exports.password}).then(function (data) {
                    var contentD = data.headers('Content-Disposition'),
                        contentT = data.headers('Content-Type');
                    contentD = contentD.substring(0,contentD.length-1).split('filename="');
                    contentD = contentD[contentD.length-1];
                    DownloadService.downloadJSON(data.data, contentD);
                    toastr.success(gettextCatalog.getString('The record has been exported successfully.'), gettextCatalog.getString('Export successful'));
                })
            }).catch(angular.noop);
        }

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
                finalArray[recLine]= gettextCatalog.getString('Description of the processing activity');
                finalArray[recLine]+=','+"\""+data.description+"\"";
                if(data.idThirdCountry!=null) {
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString('ID of third country or international organisation recipient');
                    finalArray[recLine]+=','+"\""+data.idThirdCountry+"\"";
                    recLine++;
                    finalArray[recLine]= gettextCatalog.getString("Third country or international organisation\'s data protection officer");
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
                link.click();  // This will download the data file named "record.csv".
            });
        };
    }

    function CreateRecordDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, ConfigService, record) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.joint={};
        $scope.recipientCategorySearchText = '';
        $scope.dataSubject = '';
        $scope.toggleIcon = "add_to_photos";
        $scope.addJointController = false;
        var defaultLang = angular.copy($scope.language);
        $scope.checkboxInternational = false;

        if (record != undefined && record != null) {
            $scope.controllerSearchText = record.controller.label;
            $scope.record = record;
            if(!Array.isArray($scope.record['jointControllers'])) {
                $scope.record['jointControllers'] = [];
            }
            if(!Array.isArray($scope.record['recipients'])) {
                $scope.record['recipients'] = [];
            }
            if(!Array.isArray($scope.record['processors'])) {
                $scope.record['processors'] = [];
            }
            if(!Array.isArray($scope.record['dataSubjects'])) {
                $scope.record['dataSubjects'] = [];
            }
            if($scope.record["idThirdCountry"]) {
                $scope.checkboxInternational = true;
            }
        } else {
            $scope.controllerSearchText = "";
            $scope.processor = undefined;
            $scope.record = {
                label1: '',
                label2: '',
                label3: '',
                label4: '',
                controller: {},
                recipients: [],
                processors: [],
                jointControllers: [],
                dataSubjects: [],
                representative: '',
                dpo: '',
                purposes: '',
                description: '',
                erasure: null,
                secMeasures: '',
                idThirdCountry: '',
                dpoThirdCountry: '',
            };
        }
        if($scope.processor) {
            $scope.record.processors.push($scope.processor);
            $scope.processor = undefined;
        }

        $scope.cancel = function() {
            if($scope.records.items.count > 0){
                $scope.selectRecord($scope.records.items.records[$scope.recordTabSelected].id, $scope.recordTabSelected);
            }
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

        $scope.toggleJointController = function () {
            if($scope.addJointController) {
                $scope.joint={};
                $scope.addJointController = false;
                $scope.toggleIcon = "add_to_photos";
            } else {
                $scope.addJointController = true;
                $scope.toggleIcon = "cancel";
            }
        };

        $scope.addNewJointController = function () {
            $scope.record.jointControllers.push({   'label' : $scope.joint.name,
                                                    'contact' : $scope.joint.contact });
            $scope.toggleJointController();
        };

        $scope.toggleCheckboxInternational = function () {
            $scope.record.idThirdCountry = '';
            $scope.record.dpoThirdCountry = '';
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
            $scope.recipientCategorySearchText = "";
        };

        $scope.addDataSubject = function (ev, dataSubject) {
            $scope.record.dataSubjects.push(dataSubject);
            $scope.dataSubject = '';
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
                controller: ['$scope', 'toastr', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', 'processor', 'anrId', AddProcessorDialogCtrl],
                templateUrl: 'views/anr/add.processor.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'processor': null,
                    'anrId': $scope.anrId
                }
            })
            .then(function (processor) {
                $scope.processor = processor;
            })
            .catch(angular.noop)
            .finally( function () {
                if(!$scope.record.id) {
                    $scope.createNewRecord(ev, $scope.record);
                }
                else {
                    $scope.editRecord(ev, $scope.record.id);
                }
            });
        };

        $scope.importRecord = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AnrService', 'toastr', 'gettextCatalog', 'Upload', ImportRecordDialogCtrl],
                templateUrl: 'views/anr/import.record.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                locals: {},
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            }).then(function (id) {
                $scope.updateRecords();
                $scope.selectRecord(id, $scope.records.items.count);
            }).catch(angular.noop);
        };
    }

    function AddProcessorDialogCtrl($scope, toastr, $mdDialog, gettextCatalog, $q, RecordService, ConfigService, processor) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.behalf = {   name : '',
                            contactDetail : ''};
        var defaultLang = angular.copy($scope.language);
        $scope.toggleIcon = "add_to_photos";
        $scope.checkboxInternationalProcessor = false;

        if (processor != undefined && processor != null) {
            $scope.processor = processor;
            if(!Array.isArray($scope.processor['controllers'])) {
                $scope.processor['controllers'] = [];
            }
            if($scope.processor["idThirdCountry"]) {
                $scope.checkboxInternationalProcessor = true;
            }
        }
        else {
            $scope.processor = {
                label: '',
                controllers: [],
            };
        }

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
        $scope.toggleBehalfController = function () {
            if($scope.addBehalfController) {
                $scope.behalf={};
                $scope.addBehalfController = false;
                $scope.toggleIcon = "add_to_photos";
            } else {
                $scope.addBehalfController = true;
                $scope.toggleIcon = "cancel";
            }
        }
        $scope.addNewBehalfController = function () {
            $scope.processor.controllers.push({ 'label' : $scope.behalf.name,
                                                'contact' : $scope.behalf.contact});
            $scope.toggleBehalfController();
        }
        $scope.toggleCheckboxInternational = function () {
            $scope.processor.idThirdCountry = '';
            $scope.processor.dpoThirdCountry = '';
        };
    }

    function ImportRecordDialogCtrl($scope, $mdDialog, AnrService, toastr, gettextCatalog, Upload) {
        $scope.file = [];
        $scope.file_range = 0;
		$scope.isImportingIn = false;
        $scope.import = {
            password: '',
        };

        $scope.uploadFile = function (file) {
        	$scope.isImportingIn = true;
            file.upload = Upload.upload({
                url: 'api/client-anr/' + $scope.getUrlAnrId() + '/records/import',
                data: {file: file, password: $scope.import.password}
            });

            file.upload.then(function (response) {
                $scope.isImportingIn = false;
                if (response.data.errors && response.data.errors.length > 0) {
                    toastr.warning(gettextCatalog.getString("Some files could not be imported"));
                } else {
                    toastr.success(gettextCatalog.getString("The record has been imported successfully"));
                    $mdDialog.hide(response.data.id[0]);
                }
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

    function ExportRecordDialogCtrl($scope, $mdDialog) {
        $scope.exportData = {
            simple_mode: true,
            password: ''
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.export = function() {
            $mdDialog.hide($scope.exportData);
        };

    }
})();

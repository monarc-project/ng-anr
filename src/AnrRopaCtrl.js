(function () {
    angular
        .module('AnrModule')
        .controller('AnrRopaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog',
            'DownloadService', '$http', '$q', 'RecordService',
            AnrRopaCtrl
        ]);

    /**
    * ANR > RECORD OF PROCESSING ACTIVITIES
    */
    function AnrRopaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog,
        DownloadService, $http, $q, RecordService) {
        $scope.language = $scope.getAnrLanguage();
        $scope.recordTabSelected = 0;
        $scope.records = {
            'items' : [],
            'selected' : -1
        };

        $scope.createNewRecord = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', CreateRecordDialogCtrl],
                templateUrl: 'views/anr/create.records.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            })
            .then(function (record) {
                var cont = record.cont;
                RecordService.createRecord(record,
                    function (status) {
                        $scope.updateRecords();
                        $scope.selectRecord(status.id, $scope.records.items.count);
                        toastr.success(gettextCatalog.getString('The record has been created successfully.',
                              {recordLabel: $scope._langField(record,'label')}), gettextCatalog.getString('Creation successful'));
                        if (cont) {
                            $scope.createNewRecord(ev);
                        }
                    }
                );
            }).catch(angular.noop);
        };

        $scope.onRecordTableEdited = function (model, name) {
            var promise = $q.defer();

            // This record changed, update it
            RecordService.updateRecord(model, function (data) {
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
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
                    {label: item.label}))
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
                $scope.records.items = data;
                if ($scope.records.items.count>0 && $scope.records.selected === -1) {
                    $scope.selectRecord($scope.records.items.records[0].id, 0);
                }
                console.log($scope.records.items);
                $scope.updatingRecords = false;
            });
        };
        $scope.updateRecords();

        $scope.initController = function (record) {
            $scope.selectedItemController = record["controller"];
        }

        $scope.initDpo = function (record) {
            $scope.selectedItemDpo = record["dpo"];
        }

        $scope.initRepresentative = function (record) {
            $scope.selectedItemRepresentative = record["representative"];
        }

        $scope.queryRecordActorSearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordActors({filter: query}).then(function (e) {
                promise.resolve(e["record-actors"]);
            });
            return promise.promise;
        };

        $scope.actorItemSelected = function (record, selectedItem, field) {
            if (selectedItem !== undefined && selectedItem !== null) {
                var activeElement = document.activeElement;
                if (activeElement) {
                    activeElement.blur();
                }
                record[patchField] = selectedItem;
            }
            else {
                if(record[field]["contact"]){
                    return;
                }
                record[field] = {};
            }
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The record has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'));
            });
        };

        $scope.updateActorLabel = function (record, actor, actorField) {
            if((actor.id == undefined || actor.id == null)) {
                if(actor.label) {
                    RecordService.createRecordActor(actor,
                        function (status) {
                            actor["id"] = status.id;
                            record[actorField] = actor;
                            RecordService.updateRecord(record, function (data) {
                                RecordService.getRecords({order: 'created_at'}).then(function (data) {
                                    $scope.records.items = data;
                                    $scope.selectRecord(record.id);
                                });
                                record[actorField].id = status.id;
                                toastr.success( gettextCatalog.getString('The actor has been created successfully.'),
                                                gettextCatalog.getString('Creation successful'));
                            });
                        }
                    );
                }
            }
            else {
                RecordService.updateRecordActor(actor, function (data) {
                    RecordService.getRecords({order: 'created_at'}).then(function (data) {
                        console.log(data);
                        $scope.records.items = data;
                        $scope.selectRecord(record.id);
                    });
                    toastr.success( gettextCatalog.getString('The actor has been edited successfully.'),
                                    gettextCatalog.getString('Edition successful'));
                });
            }
        }

        $scope.jointControllerItemSelected = function (recordId, selectedItem, jointControllers, index) {
            if (selectedItem !== null) {
                jointControllers[index] = selectedItem;
                var ids = [];
                for (var jc in jointControllers) {
                    ids.push(jc.id);
                }
                RecordService.patchRecord(recordId, {"jointControllers": ids}, function (data) {
                    promise.resolve(true);
                }, function () {
                    promise.reject(false);
                });
            }
            else {
                unset(jointControllers[index].id);
            }
        }

        $scope.updateJointControllerLabel = function (record, actor, index) {
            if(actor.id == null) {
                RecordService.createRecordActor(actor,
                    function (status) {
                        record["jointControllers"][index]["id"] = status.id;
                        RecordService.updateRecord(record, function (data) {
                            toastr.success( gettextCatalog.getString('The actor has been created successfully.'),
                                            gettextCatalog.getString('Creation successful'));
                        });
                    }
                );
            }
            else {
                RecordService.updateRecordActor(actor, function (data) {
                    RecordService.getRecords({order: 'created_at'}).then(function (data) {
                        $scope.records.items = data;
                        $scope.selectRecord(record.id);
                    });
                    toastr.success( gettextCatalog.getString('The actor has been edited successfully.'),
                                    gettextCatalog.getString('Edition successful'));
                });
            }
        }


        $scope.onActorContactEdit = function (actor) {
            var promise = $q.defer();

            // This record changed, update it
            RecordService.updateRecordActor(actor, function (data) {
                RecordService.getRecords({order: 'created_at'}).then(function (data) {
                    $scope.records.items = data;
                });
                toastr.success( gettextCatalog.getString('The actor has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
            return promise.promise;
        };


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

        $scope.jsonExportAll = function (ev) {
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
                method('api/'+cliAnr+'anr/' + $scope.model.anr.id + '/records/export', {export:"All", password: exports.password}).then(function (data) {
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

    function CreateRecordDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $scope.record['cont'] = false;
            $mdDialog.hide($scope.record);
        };

        $scope.createAndContinue = function () {
            $scope.record['cont'] = true;
            $mdDialog.hide($scope.record);
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
})();

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
                RecordService.createRecord(record, function (status) {
                    $scope.updateRecords().then(function() {
                        $scope.selectRecord(status.id, $scope.records.items.count);
                        toastr.success(gettextCatalog.getString('The record has been created successfully.',
                              {recordLabel: $scope._langField(record,'label')}), gettextCatalog.getString('Creation successful'));
                        if (cont) {
                            $scope.createNewRecord(ev);
                        }
                    });
                });
            }).catch(angular.noop);
        };

        $scope.onRecordTableEdited = function (model, name) {
            var promise = $q.defer();
            // This record changed, update it
            RecordService.updateRecord(model, function (data) {
                toastr.success( gettextCatalog.getString('The record has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        };

        $scope.onPersonalDataTableEdited = function (model, name) {
            var promise = $q.defer();

            // This record personal data changed, update it
            RecordService.updateRecordPersonalData(model, function (data) {
                toastr.success( gettextCatalog.getString('The personal data has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
            return promise.promise;
        }

        $scope.onRecipientTableEdited = function(model, name) {
            var promise = $q.defer();

            // This record recipient changed, update it
            RecordService.updateRecordRecipient(model, function (data) {
                toastr.success( gettextCatalog.getString('The personal data has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        }

        $scope.onTransferTableEdited = function(model, name) {
            var promise = $q.defer();
            // This international transfer record changed, update it
            RecordService.updateRecordInternationalTransfer(model, function (data) {
                toastr.success( gettextCatalog.getString('The international transfer record has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        }

        $scope.onProcessorTableEdited = function (model, name) {
            var promise = $q.defer();
            // This processor changed, update it
            RecordService.updateRecordProcessor(model, function (data) {
                toastr.success( gettextCatalog.getString('The processor has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
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

        $scope.detachProcessor = function (ev, record, index) {
            record['processors'].splice(index, 1);
            RecordService.updateRecord(record, function () {
                toastr.success(gettextCatalog.getString('The processor has been detached successfully.'));
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
            var promise = $q.defer();
            RecordService.getRecords({order: 'created_at'}).then(function (data) {
                for(var i = 0; i < data.records.length; ++i) {
                    if(!Array.isArray(data.records[i]['jointControllers'])) {
                        data.records[i]['jointControllers'] = [];
                    }
                    if(!Array.isArray(data.records[i]['personalData'])) {
                        data.records[i]['personalData'] = [];
                    } else {
                        for(var j = 0; j < data.records[i]['personalData'].length; ++j) {
                            data.records[i]['personalData'][j]["record"] = data.records[i]["id"];
                            if(!Array.isArray(data.records[i]['personalData'][j]['dataSubjects'])) {
                                data.records[i]['personalData'][j]['dataSubjects'] = [];
                            }
                            if(!Array.isArray(data.records[i]['personalData'][j]['dataCategories'])) {
                                data.records[i]['personalData'][j]['dataCategories'] = [];
                            }
                        }
                    }
                    if(!Array.isArray(data.records[i]['recipients'])) {
                        data.records[i]['recipients'] = [];
                    }
                    if(!Array.isArray(data.records[i]['internationalTransfers'])) {
                        data.records[i]['internationalTransfers'] = [];
                    } else {
                        for(var j = 0; j < data.records[i]['internationalTransfers'].length; ++j) {
                            data.records[i]['internationalTransfers'][j]["record"] = data.records[i]["id"];
                        }
                    }
                    if(!Array.isArray(data.records[i]['processors'])) {
                        data.records[i]['processors'] = [];
                    } else {
                        for(var j = 0; j < data.records[i]['processors'].length; ++j) {
                            if(!Array.isArray(data.records[i]['processors'][j]['activities'])) {
                                data.records[i]['processors'][j]['activities'] = [];
                            }
                            if(!Array.isArray(data.records[i]['processors'][j]['cascadedProcessors'])) {
                                data.records[i]['processors'][j]['cascadedProcessors'] = [];
                            }
                            if(!Array.isArray(data.records[i]['processors'][j]['internationalTransfers'])) {
                                data.records[i]['processors'][j]['internationalTransfers'] = [];
                            } else {
                                for(var k = 0; k < data.records[i]['processors'][j]['internationalTransfers'].length; ++k) {
                                    data.records[i]['processors'][j]['internationalTransfers'][k]["processor"] = data.records[i]['processors'][j]['internationalTransfers'][k]["processor"]["id"];
                                }
                            }
                        }
                    }
                }
                $scope.records.items = data;
                if ($scope.records.items.count>0 && $scope.records.selected === -1) {
                    $scope.selectRecord($scope.records.items.records[0].id, 0);
                }
                promise.resolve(true);
            });
            return promise.promise;
        };

        $scope.updatingRecords = true;
        $scope.updateRecords().then( function() {
            $scope.updatingRecords = false;
        });

        $scope.queryRecordActorSearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordActors({filter: query}).then(function (e) {
                promise.resolve(e["record-actors"]);
            });
            return promise.promise;
        };

        $scope.actorItemSelected = function (record, selectedItem, field, index) {
            if (selectedItem == undefined) {
                selectedItem = null;
            }
            var activeElement = document.activeElement;
            if (activeElement) {
                activeElement.blur();
            }
            if(field == "jointControllers") {
                if (selectedItem == null) {
                    record["jointControllers"].splice(index, 1);
                } else {
                    record["jointControllers"][index] = selectedItem;
                }
            } else {
                record[field] = selectedItem;
            }
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The record has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'));
            });
        };

        $scope.detachActor = function (record, field, index) {
            if(field == "jointControllers") {
                record["jointControllers"].splice(index, 1);
            } else {
                record[field] = null;
            }
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The actor has been detached successfully.'),
                                gettextCatalog.getString('Edition successful'));
            });
        }

        $scope.updateActorLabel = function (record, actor, actorField, index) {
            if(actor == null) {
                return;
            }
            if((actor.id == undefined || actor.id == null)) {
                if(actor.label) {
                    RecordService.createRecordActor(actor,
                        function (status) {
                            actor["id"] = status.id;
                            if(actorField == "jointControllers") {
                                record["jointControllers"][index] = actor;
                            } else {
                                record[actorField] = actor;
                            }
                            RecordService.updateRecord(record, function (data) {
                                toastr.success( gettextCatalog.getString('The actor has been created successfully.'),
                                                gettextCatalog.getString('Creation successful'));
                            });
                        }
                    );
                }
            }
            else {
                if(!actor.label) {
                    if(actorField == "jointControllers") {
                        record["jointControllers"].splice(index, 1);
                    } else {
                        record[actorField] = null;
                    }
                    RecordService.updateRecord(record, function (data) {
                        toastr.success( gettextCatalog.getString('The actor has been detached successfully.'));
                    });
                }
                else {
                    RecordService.updateRecordActor(actor, function (data) {
                        toastr.success( gettextCatalog.getString('The actor has been edited successfully.'),
                                        gettextCatalog.getString('Edition successful'));
                    });
                }
            }
        }

        $scope.addJointControllers = function (record) {
            record["jointControllers"].push( { "label": "", "contact": [] } );
        }

        $scope.addNewContact = function (contact, actor) {
            for(var i = 0; i < actor["contact"].length; ++i) {
                if (actor["contact"][i]== contact){
                    return;
                }
            }
            actor["contact"].push(contact);
            $scope.onActorContactEdit(actor);
        }

        $scope.onActorContactEdit = function (actor) {
            var promise = $q.defer();
            // This record actor changed, update it
            RecordService.updateRecordActor(actor, function (data) {
                toastr.success( gettextCatalog.getString('The actor has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'))
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
            return promise.promise;
        };

        $scope.addPersonalData = function(record) {
            record["personalData"].push( { "dataSubjects": [], "dataCategories": [], "description": "", "retentionPeriod" : 0, "retentionPeriodMode" : 0, "retentionPeriodDescription" : "", "record" : record["id"]} );
        }

        $scope.queryRecordDataSubjectSearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordDataSubjects({filter: query}).then(function (e) {
                promise.resolve(e["record-data-subjects"]);
            });
            return promise.promise;
        };

        $scope.queryRecordDataCategorySearch = function (query) {
            var promise = $q.defer();
            RecordService.getRecordDataCategories({filter: query}).then(function (e) {
                promise.resolve(e["record-data-categories"]);
            });
            return promise.promise;
        };

        $scope.onPersonalDataEdit = function (record, personalData, index) {
            var promise = $q.defer();
            // This personal data changed, update it
            if((personalData.id == undefined || personalData.id == null)) {
                RecordService.createRecordPersonalData(personalData, function (status) {
                    console.log(status);
                    RecordService.getRecordPersonalData(status.id).then(function (data) {
                        personalData = data;
                        record["personalData"][index] = personalData;
                        RecordService.updateRecord(record, function (data) {
                            toastr.success( gettextCatalog.getString('The personal data has been created successfully.'),
                                            gettextCatalog.getString('Creation successful'));
                        });
                    });
                }, function () {
                    promise.reject(false);
                });
                return promise.promise;
            }
            else {
                RecordService.updateRecordPersonalData(personalData, function (data) {
                    toastr.success( gettextCatalog.getString('The personal data has been edited successfully.'),
                                    gettextCatalog.getString('Edition successful'));
                }, function () {
                    promise.reject(false);
                });
                return promise.promise;
            }
        };

        $scope.addNewDataSubject = function (record, dataSubjectSearchText, personalData, index) {
            personalData["dataSubjects"].push({"label" : dataSubjectSearchText});
            $scope.onPersonalDataEdit(record, personalData, index);
        }

        $scope.addNewDataCategory = function (record, dataCategorySearchText, personalData, index) {
            personalData["dataCategories"].push({"label" : dataCategorySearchText});
            $scope.onPersonalDataEdit(record, personalData, index);
        }

        $scope.transformChip = function(chip) {
            if (angular.isObject(chip)) {
                return chip;
            }
            return {
                "label" : chip
            };
        }

        $scope.deletePersonalData = function(record, index) {
            record["personalData"].splice(index, 1);
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The personal data has been deleted successfully.'),
                                gettextCatalog.getString('Deletion successful'));
            });
        }

        $scope.addRecipient = function(record) {
            record["recipients"].push( { "label" : "", "description": "" } );
        }

        $scope.queryRecordRecipientSearch = function (query, record) {
            var promise = $q.defer();
            RecordService.getRecordRecipients({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e["record-recipients"].length; ++j) {
                    var found = false;

                    for (var i = 0; i < record.recipients.length; ++i) {
                        if (record.recipients[i].id == e["record-recipients"][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e["record-recipients"][j]);
                    }
                }

                promise.resolve(filtered);
            });
            return promise.promise;
        };

        $scope.recipientItemSelected = function (record, selectedItem, index) {
            if (selectedItem == undefined) {
                selectedItem = null;
            }
            var activeElement = document.activeElement;
            if (activeElement) {
                activeElement.blur();
            }
            if (selectedItem == null) {
                record["recipients"].splice(index, 1);
            } else {
                record["recipients"][index] = selectedItem;
            }
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The record has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'));
            });
        };

        $scope.deleteRecipient = function (record, index) {
            record["recipients"].splice(index, 1);
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The recipient has been deleted successfully.'),
                                gettextCatalog.getString('Deletion successful'));
            });
        }

        $scope.updateRecipientLabel = function (record, recipient, index) {
            if(recipient == null) {
                return;
            }
            if((recipient.id == undefined || recipient.id == null)) {
                if(recipient.label){
                    RecordService.createRecordRecipient(recipient,
                        function (status) {
                            recipient["id"] = status.id;
                            record["recipients"][index] = recipient;
                            RecordService.updateRecord(record, function (data) {
                                toastr.success( gettextCatalog.getString('The recipient has been created successfully.'),
                                                gettextCatalog.getString('Creation successful'));
                            });
                        }
                    );
                }
            }
            else {
                if(!recipient.label) {
                    record["recipients"].splice(index, 1);
                    RecordService.updateRecord(record, function (data) {
                        toastr.success( gettextCatalog.getString('The recipient has been deleted successfully.'));
                    });
                }
                else {
                    RecordService.updateRecordRecipient(recipient, function (data) {
                        toastr.success( gettextCatalog.getString('The recipient has been edited successfully.'),
                                        gettextCatalog.getString('Edition successful'));
                    });
                }
            }
        }

        $scope.addInternationalTransfer = function(record) {
            var promise = $q.defer();
            var internationalTransfer = { "organisation" : "", "description": "", "country": "", "documents": [], "record": record["id"], "processor": null};
            // Create a new international transfer record
            RecordService.createRecordInternationalTransfer(internationalTransfer, function (status) {
                internationalTransfer["id"] = status.id;
                record["internationalTransfers"].push( internationalTransfer);
                RecordService.updateRecord(record, function (data) {
                    toastr.success( gettextCatalog.getString('The international transfer record has been created successfully.'),
                                    gettextCatalog.getString('Creation successful'))
                });
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
        }

        $scope.deleteInternationalTransfer = function (record, index) {
            record["internationalTransfers"].splice(index, 1);
            RecordService.updateRecord(record, function (data) {
                toastr.success( gettextCatalog.getString('The international transfer record has been deleted successfully.'),
                                gettextCatalog.getString('Deletion successful'));
            });
        }


        $scope.processorActorItemSelected = function (processor, selectedItem, field, index) {
            if (selectedItem == undefined) {
                selectedItem = null;
            }
            var activeElement = document.activeElement;
            if (activeElement) {
                activeElement.blur();
            }
            if(field == "cascadedProcessors") {
                if (selectedItem == null) {
                    processor["cascadedProcessors"].splice(index, 1);
                } else {
                    processor["cascadedProcessors"][index] = selectedItem;
                }
            } else {
                processor[field] = selectedItem;
            }
            RecordService.updateRecordProcessor(processor, function (data) {
                toastr.success( gettextCatalog.getString('The processor has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'));
            });
        };

        $scope.processorDetachActor = function (processor, field, index) {
            if(field == "cascadedProcessors") {
                processor["cascadedProcessors"].splice(index, 1);
            } else {
                processor[field] = null;
            }
            RecordService.updateRecordProcessor(processor, function (data) {
                toastr.success( gettextCatalog.getString('The actor has been detached successfully.'),
                                gettextCatalog.getString('Edition successful'));
            });
        }

        $scope.processorUpdateActorLabel = function (processor, actor, actorField, index) {
            if(actor == null) {
                return;
            }
            if((actor.id == undefined || actor.id == null)) {
                if(actor.label) {
                    RecordService.createRecordActor(actor,
                        function (status) {
                            actor["id"] = status.id;
                            if(actorField == "cascadedProcessors") {
                                processor["cascadedProcessors"][index] = actor;
                            } else {
                                processor[actorField] = actor;
                            }
                            RecordService.updateRecordProcessor(processor, function (data) {
                                toastr.success( gettextCatalog.getString('The actor has been created successfully.'),
                                                gettextCatalog.getString('Creation successful'));
                            });
                        }
                    );
                }
            }
            else {
                if(!actor.label) {
                    if(actorField == "cascadedProcessors") {
                        processor["cascadedProcessors"].splice(index, 1);
                    } else {
                        processor[actorField] = null;
                    }
                    RecordService.updateRecordProcessor(processor, function (data) {
                        toastr.success( gettextCatalog.getString('The actor has been detached successfully.'));
                    });
                }
                else {
                    RecordService.updateRecordActor(actor, function (data) {
                        toastr.success( gettextCatalog.getString('The actor has been edited successfully.'),
                                        gettextCatalog.getString('Edition successful'));
                    });
                }
            }
        }

        $scope.addCascadedProcessor = function (processor) {
            processor["cascadedProcessors"].push( { "label": "", "contact": [] } );
        }

        $scope.processorAddInternationalTransfer = function(processor) {
            var promise = $q.defer();
            var internationalTransfer = { "organisation" : "", "description": "", "country": "", "documents": [], "record": null, "processor": processor["id"]};
            // Create a new international transfer record
            RecordService.createRecordInternationalTransfer(internationalTransfer, function (status) {
                internationalTransfer["id"] = status.id;
                processor["internationalTransfers"].push(internationalTransfer);
                RecordService.updateRecordProcessor(processor, function (data) {
                    toastr.success( gettextCatalog.getString('The international transfer record has been created successfully.'),
                                    gettextCatalog.getString('Creation successful'))
                });
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
        }

        $scope.addnewDocument = function (doc, internationalTransfer) {
            for(var i = 0; i < internationalTransfer["documents"].length; ++i) {
                if (internationalTransfer["documents"][i] == doc){
                    return;
                }
            }
            internationalTransfer["documents"].push(doc);
            $scope.onTransferTableEdited(internationalTransfer);
        }

        $scope.createNewProcessor = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', CreateProcessorDialogCtrl],
                templateUrl: 'views/anr/create.processors.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            })
            .then(function (processor) {
                var cont = processor.cont;
                RecordService.createRecordProcessor(processor, function (status) {
                    processor["id"] = status.id;
                    record["processors"].push( processor);
                    RecordService.updateRecord(record, function (data) {
                        toastr.success(gettextCatalog.getString('The processor has been created successfully.',
                              {processorLabel: $scope._langField(processor,'label')}), gettextCatalog.getString('Creation successful'));
                        if (cont) {
                            $scope.createNewProcessor(ev);
                        }
                    });
                });
            }).catch(angular.noop);
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

    function CreateProcessorDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $scope.processor['cont'] = false;
            $mdDialog.hide($scope.processor);
        };

        $scope.createAndContinue = function () {
            $scope.processor['cont'] = true;
            $mdDialog.hide($scope.processor);
        };
    }
})();

(function () {
    angular
        .module('AnrModule')
        .directive('onReadRecordFile', ['$parse', '$mdDialog', 'gettextCatalog', function ($parse, $mdDialog, gettextCatalog) {
            return {
          		restrict: 'A',
          		scope: false,
          		link: function(scope, element, attrs) {
                    var fn = $parse(attrs.onReadRecordFile);
                    var reader = new FileReader();
                    reader.onload = function(onLoadEvent) {
                        scope.$apply(function() {
                            var data = onLoadEvent.target.result;
                            if (!scope.isJson) {
                                var workbook = XLSX.read(data, {
                                    type: 'binary'
                                });
                                var sheetName = workbook.SheetNames[0];
                                if (workbook.Sheets[sheetName].hasOwnProperty('!ref')) {
                                    var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                                    var chartset = jschardet.detect(csv);
                                    if (chartset.encoding == 'UTF-8') {
                                        fn(scope, {$fileContent:decodeURIComponent(escape(csv))});
                                    }else {
                                        fn(scope, {$fileContent:csv});
                                    }
                                }
                            }
                        });
                    };
          			element.on('change', function(onChangeEvent) {
                        var fileTypes = ['json', 'csv', 'xlsx', 'xls', 'bin']; // File types supported
                        var extension = onChangeEvent.target.files[0].name.split('.').pop().toLowerCase(); //Extract extension of file
                        var isSuccess = fileTypes.indexOf(extension) > -1; // Check file type
                        var size = onChangeEvent.target.files[0].size < 1e6; // Check fize size being less 1M

                        if (isSuccess && size) {
                          if (extension == "json" || extension == "bin") {
                              scope.isJson = true;
                              scope.file = onChangeEvent.target.files[0];
                          } else {
                              scope.import.password = '';
                              scope.isJson = false;
                              reader.readAsBinaryString(onChangeEvent.target.files[0]);
                          }
                        }
                        else {
                            var alert = $mdDialog.alert()
                                .multiple(true)
                                .title(gettextCatalog.getString('File error'))
                                .textContent(gettextCatalog.getString('File type not supported'))
                                .theme('light')
                                .ok(gettextCatalog.getString('Cancel'));
                            $mdDialog.show(alert);

                            onChangeEvent.target.value = null;
                        }
          			});
          		}
          	};
          }])
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
        $scope.updatingPersonalData = false;
        $scope.updatingActor = false;
        $scope.records = {
            'items' : [],
            'selected' : -1,
            'recordTabSelected' : 0
        };
        $scope.records.query = { 'filter' : "" };

        $scope.createNewRecord = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'ConfigService', CreateRecordDialogCtrl],
                templateUrl: 'views/anr/create.records.html',
                targetEvent: ev,
                preserveScope: true,
                scope: $scope,
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            })
            .then(function (record) {
                var cont = record.cont;
                delete $scope.newRecord;
                if(record.duplicateRecord) {
                    record.recordToDuplicate['label'] = record['label'];
                    RecordService.duplicateRecord(record.recordToDuplicate, function (data) {
                        $scope.updatingRecords = true;
                        $scope.updateRecords().then(function() {
                            $scope.updatingRecords = false;
                            $scope.selectRecord(status.id, $scope.records.items.count);
                            toastr.success(gettextCatalog.getString('The processing has been duplicated successfully.',
                                  {recordLabel: record.label}), gettextCatalog.getString('Creation successful'));
                            if (cont) {
                                $scope.createNewRecord(ev);
                            }
                        });
                    });
                }
                else {
                    RecordService.createRecord(record, function (status) {
                        $scope.updatingRecords = true;
                        $scope.updateRecords().then(function() {
                            $scope.updatingRecords = false;
                            $scope.selectRecord(status.id, $scope.records.items.count);
                            toastr.success(gettextCatalog.getString('The processing has been created successfully.',
                                  {recordLabel: record.label}), gettextCatalog.getString('Creation successful'));
                            if (cont) {
                                $scope.createNewRecord(ev);
                            }
                        });
                    });
                }
            }).catch(angular.noop);
        };

        $scope.onRecordTableEdited = function (model, name) {
            var promise = $q.defer();
            // This record changed, update it
            RecordService.updateRecord(model, function (data) {
                RecordService.getRecord(model.id).then(function (data) {
                    model["updatedAt"] = data["updatedAt"];
                });
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        };

        $scope.onActorTableEdited = function (model, name) {
            var promise = $q.defer();
            // This record actor changed, update it
            RecordService.updateRecordActor(model, function (data) {
                $scope.updateActor(model.id).then(function() {
                    promise.resolve(true);
                });
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        };

        $scope.onPersonalDataTableEdited = function (model, name) {
            var promise = $q.defer();

            // This record personal data changed, update it
            RecordService.updateRecordPersonalData(model, function (data) {
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
            return promise.promise;
        }

        $scope.onRecipientTableEdited = function(model, name) {
            var promise = $q.defer();
            if (!$scope.updatingRecords) {
                promise.resolve(true);
                return promise.promise;
            }
            // This record recipient changed, update it
            RecordService.updateRecordRecipient(model, function (data) {
                for (var i = 0; i < $scope.records.items.records.length; ++i ) {
                    for (var j = 0; j < $scope.records.items.records[i]["recipients"].length; ++j ) {
                        if ($scope.records.items.records[i]["recipients"][j]['id'] === model.id) {
                            $scope.records.items.records[i]["recipients"][j] = model;
                        }
                    }
                }
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
                for (var i = 0; i < $scope.records.items.records.length; ++i ) {
                    for (var j = 0; j < $scope.records.items.records[i]["processors"].length; ++j ) {
                        if ($scope.records.items.records[i]["processors"][j]['id'] === model.id) {
                            for(key in $scope.records.items.records[i]["processors"][j]) {
                                if(key != 'recordActivities' && key != 'recordSecMeasures') {
                                    $scope.records.items.records[i]["processors"][j][key] = model[key];
                                }
                            }
                        }
                    }
                }
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        };

        $scope.deleteRecord = function (ev, item) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete the processing?',
                    {label: item.label}))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .targetEvent(ev)
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                RecordService.deleteRecord(item, function () {
                        $scope.updatingRecords = true;
                        $scope.updateRecords().then(function() {
                            $scope.updatingRecords = false;
                        });
                    }
                );
            }).catch(angular.noop);
        };

        $scope.detachProcessor = function (ev, record, index) {
            record['processors'].splice(index, 1);
            RecordService.updateRecord(record, function (data) {
                RecordService.getRecord(record.id).then(function (data) {
                    record["updatedAt"] = data["updatedAt"];
                });
            });
        };

        $scope.selectRecord = function(recordId, index = -1) {
            var promise = $q.defer();
            $scope.records.selected = recordId;
            if(index !== -1) {
                $scope.records.recordTabSelected = index;
            }
            $scope.step = { // Deliverable data
              num:6,
              record : recordId
            };
            promise.resolve(true);
            return promise.promise;
        };

        $scope.updateActor = function (actorId) {
            var promise = $q.defer();
            $scope.updatingActor = true;
            RecordService.getRecordActor(actorId).then(function (data) {
                for(var j = 0; j < $scope.records.items.records.length; ++j) {
                    if($scope.records.items.records[j]['controller'] && $scope.records.items.records[j]['controller']['id'] == actorId) {
                        $scope.records.items.records[j]['controller'] = angular.copy(data);;
                    }
                    if($scope.records.items.records[j]['representative'] && $scope.records.items.records[j]['representative']['id'] == actorId) {
                        $scope.records.items.records[j]['representative'] = angular.copy(data);;
                    }
                    if($scope.records.items.records[j]['dpo'] && $scope.records.items.records[j]['dpo']['id'] == actorId) {
                        $scope.records.items.records[j]['dpo'] = angular.copy(data);;
                    }
                    if(Array.isArray($scope.records.items.records[j]['jointControllers'])) {
                        for(var i = 0; i < $scope.records.items.records[j]['jointControllers'].length; ++i) {
                            if($scope.records.items.records[j]['jointControllers'][i]['id'] == actorId) {
                                $scope.records.items.records[j]['jointControllers'][i] = angular.copy(data);;
                            }
                        }
                    }
                    if(Array.isArray($scope.records.items.records[j]['processors'])) {
                        for(var i = 0; i < $scope.records.items.records[j]['processors'].length; ++i) {
                            if($scope.records.items.records[j]['processors'][i]['representative'] && $scope.records.items.records[j]['processors'][i]['representative']['id'] == actorId) {
                                $scope.records.items.records[j]['processors'][i]['representative'] = angular.copy(data);;
                            }
                            if($scope.records.items.records[j]['processors'][i]['dpo'] && $scope.records.items.records[j]['processors'][i]['dpo']['id'] == actorId) {
                                $scope.records.items.records[j]['processors'][i]['dpo'] = angular.copy(data);;
                            }
                        }
                    }
                }
                $scope.updatingActor = false;
                promise.resolve(true);
            });
            return promise.promise;
        }

        $scope.updateRecords = function() {
            var query = angular.copy($scope.records.query);
            var promise = $q.defer();
            RecordService.getRecords({order: 'createdAt', filter: query.filter}).then(function (data) {
                for(var i = 0; i < data.records.length; ++i) {
                    if(!Array.isArray(data.records[i]['jointControllers'])) {
                        data.records[i]['jointControllers'] = [{ "label": "", "contact": "" }];
                    }
                    if(!Array.isArray(data.records[i]['personalData'])) {
                        data.records[i]['personalData'] = [];
                    } else {
                        for(var j = 0; j < data.records[i]['personalData'].length; ++j) {
                            data.records[i]['personalData'][j]["record"] = data.records[i]["id"];
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
                }
                $scope.records.items = data;
                promise.resolve(true);
            });
            return promise.promise;
        };

        $scope.updatingRecords = true;
        $scope.updateRecords().then( function() {
            if ($scope.records.items.count>0) {
                $scope.selectRecord($scope.records.items.records[0].id, 0);
            }
            $scope.updatingRecords = false;
        });

        $scope.debounce = function(cb, interval) {
            var timeout = null;
            return function(data) {
              if (timeout) {
                clearTimeout(timeout);
              }
              timeout = setTimeout(function() {
                cb(data);
              }, interval);
            };
        };

        $scope.$watch('records.query.filter', $scope.debounce(function() {
            $scope.updateRecords();
        },500));

        $scope.getRecordProcessor = function (id, recordId) {
            var promise = $q.defer();
            RecordService.getRecordProcessor(id).then(function (data) {
                promise.resolve(data);
            });
            return promise.promise;
        }

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
            $scope.updatingActor = true;
            RecordService.updateRecord(record, function (data) {
                RecordService.getRecord(record.id).then(function (data) {
                    record["updatedAt"] = data["updatedAt"];
                });
                $scope.updatingActor = false;
            });
        };

        $scope.detachActor = function (record, field, index) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to detach actor?'))
                .textContent(gettextCatalog.getString('This actor will be deleted if it is not used anymore in the risk analysis.'))
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                if(field == "jointControllers") {
                    record["jointControllers"].splice(index, 1);
                } else {
                    record[field] = null;
                }
                RecordService.updateRecord(record, function (data) {
                    RecordService.getRecord(record.id).then(function (data) {
                        record["updatedAt"] = data["updatedAt"];
                    });
                    if(field == "jointControllers" && record["jointControllers"].length == 0) {
                        record["jointControllers"].push({ "label": "", "contact": "" } );
                    }
                });
            }).catch(angular.noop);
        }

        $scope.updateActorLabel = function (record, recordIndex, actor, actorField, index) {
            if(actor == null) {
                return;
            }
            if((actor.id == undefined || actor.id == null)) {
                if(actor.label) {
                    actor["contact"] = "";
                    RecordService.createRecordActor(actor, function (status) {
                        actor["id"] = status.id;
                        if(actorField == "jointControllers") {
                            record["jointControllers"][index] = actor;
                        } else {
                            record[actorField] = actor;
                        }
                        $scope.updatingActor = true;
                        RecordService.updateRecord(record, function (data) {
                            RecordService.getRecord(record.id).then(function (data) {
                                record["updatedAt"] = data["updatedAt"];
                            });
                            $scope.updatingActor = false;
                        });
                    });
                };
            }
            else {
                if(!actor.label) {
                    if(actorField == "jointControllers") {
                        record["jointControllers"].splice(index, 1);
                    } else {
                        record[actorField] = null;
                    }
                    $scope.updatingActor = true;
                    RecordService.updateRecord(record, function (data) {
                        RecordService.getRecord(record.id).then(function (data) {
                            record["updatedAt"] = data["updatedAt"];
                        });
                        $scope.updatingActor = false;
                        if(actorField == "jointControllers" && record["jointControllers"].length == 0) {
                            record["jointControllers"].push({ "label": "", "contact": "" } );
                        }
                    });
                }
                else {
                    $scope.updatingActor = true;
                    RecordService.updateRecordActor(actor, function (data) {
                        $scope.updateActor(actor.id).then(function() {
                            $scope.updatingActor = false;
                        });
                    });
                }
            }
        }

        $scope.addJointControllers = function (record) {
            record["jointControllers"].push({ "label": "", "contact": "" } );
        }

        $scope.addPersonalData = function(record) {
            personalData = { "dataSubject": "", "dataCategories": [], "description": "", "retentionPeriod" : 0, "retentionPeriodMode" : 0, "retentionPeriodDescription" : "", "record" : record["id"]};
            RecordService.createRecordPersonalData(personalData, function (status) {
                personalData["id"] = status.id;
                record["personalData"].push(personalData);
                RecordService.updateRecord(record, function (status) {
                    RecordService.getRecord(record.id).then(function (data) {
                        record["updatedAt"] = data["updatedAt"];
                    });
                });
            });
        }

        $scope.queryRecordDataCategorySearch = function (query, personalData) {
            var promise = $q.defer();
            RecordService.getRecordDataCategories({filter: query}).then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e["record-data-categories"].length; ++j) {
                    var found = false;

                    for (var i = 0; i < personalData.dataCategories.length; ++i) {
                        if (personalData.dataCategories[i].id == e["record-data-categories"][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e["record-data-categories"][j]);
                    }
                }

                promise.resolve(filtered);
            });
            return promise.promise;
        };

        $scope.onPersonalDataEdit = function (record, personalData, index) {
            $scope.updatingPersonalData = true;
            RecordService.updateRecordPersonalData(personalData, function () {
                RecordService.getRecordPersonalData(personalData.id).then(function (data) {
                    personalData = data;
                    record["personalData"][index] = personalData;
                    $scope.updatingPersonalData = false;
                });
            });
        };

        $scope.addNewDataCategory = function (record, dataCategorySearchText, personalData, index) {
            if(dataCategorySearchText) {
                personalData["dataCategories"].push({"label" : dataCategorySearchText});
                $scope.onPersonalDataEdit(record, personalData, index);
            }
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
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete personal data category?'))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                record["personalData"].splice(index, 1);
                RecordService.updateRecord(record, function (data) {
                    RecordService.getRecord(record.id).then(function (data) {
                        record["updatedAt"] = data["updatedAt"];
                    });
                });
            }).catch(angular.noop);
        }

        $scope.addRecipient = function(record) {
            record["recipients"].push({ "label" : "", "type": "0", "description": ""});
        }

        $scope.queryRecordRecipientSearch = function (record, query) {
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
                RecordService.getRecord(record.id).then(function (data) {
                    record["updatedAt"] = data["updatedAt"];
                });
            });
        };

        $scope.deleteRecipient = function (record, index) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete recipient?'))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                record["recipients"].splice(index, 1);
                RecordService.updateRecord(record, function (data) {
                    RecordService.getRecord(record.id).then(function (data) {
                        record["updatedAt"] = data["updatedAt"];
                    });
                });
            }).catch(angular.noop);
        }

        $scope.updateRecipientLabel = function (record, recipient, index) {
            if(recipient == null) {
                return;
            }
            if(recipient.id == undefined || recipient.id == null) {
                if(recipient.label){
                    RecordService.createRecordRecipient(recipient, function (status) {
                        RecordService.getRecordRecipient(status.id).then(function (data) {
                            recipient = data;
                            record["recipients"][index] = recipient;
                            RecordService.updateRecord(record, function (data) {
                                RecordService.getRecord(record.id).then(function (data) {
                                    record["updatedAt"] = data["updatedAt"];
                                });
                            });
                        });
                    });
                }
            }
            else {
                if(!recipient.label) {
                    record["recipients"].splice(index, 1);
                    RecordService.updateRecord(record, function (data) {
                        RecordService.getRecord(record.id).then(function (data) {
                            record["updatedAt"] = data["updatedAt"];
                        });
                    });
                }
                else {
                    RecordService.updateRecordRecipient(recipient, function (data) {});
                }
            }
        }

        $scope.addInternationalTransfer = function(record) {
            var promise = $q.defer();
            var internationalTransfer = { "organisation" : "", "description": "", "country": "", "documents": "", "record": record["id"]};
            // Create a new international transfer record
            RecordService.createRecordInternationalTransfer(internationalTransfer, function (status) {
                internationalTransfer["id"] = status.id;
                record["internationalTransfers"].push(internationalTransfer);
                RecordService.updateRecord(record, function (data) {
                    RecordService.getRecord(record.id).then(function (data) {
                        record["updatedAt"] = data["updatedAt"];
                    });
                });
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
        }

        $scope.deleteInternationalTransfer = function (record, index) {
            var confirm = $mdDialog.confirm()
                .title(gettextCatalog.getString('Are you sure you want to delete international transfer?'))
                .textContent(gettextCatalog.getString('This operation is irreversible.'))
                .theme('light')
                .ok(gettextCatalog.getString('Delete'))
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function() {
                record["internationalTransfers"].splice(index, 1);
                RecordService.updateRecord(record, function (data) {
                    RecordService.getRecord(record.id).then(function (data) {
                        record["updatedAt"] = data["updatedAt"];
                    });
                });
            }).catch(angular.noop);
        }


        $scope.processorActorItemSelected = function (processor, selectedItem, field) {
            if (selectedItem == undefined) {
                selectedItem = null;
            }
            var activeElement = document.activeElement;
            if (activeElement) {
                activeElement.blur();
            }
            processor[field] = selectedItem;
            $scope.updatingActor = true;
            RecordService.updateRecordProcessor(processor, function (data) {
                for (var i = 0; i < $scope.records.items.records.length; ++i ) {
                    for (var j = 0; j < $scope.records.items.records[i]["processors"].length; ++j ) {
                        if ($scope.records.items.records[i]["processors"][j]['id'] === processor.id) {
                            $scope.records.items.records[i]["processors"][j] = processor;
                        }
                    }
                }
                $scope.updatingActor = false;
            });
        };

        $scope.processorDetachActor = function (processor, field) {
            processor[field] = null;
            RecordService.updateRecordProcessor(processor, function (data) {
                for (var i = 0; i < $scope.records.items.records.length; ++i ) {
                    for (var j = 0; j < $scope.records.items.records[i]["processors"].length; ++j ) {
                        if ($scope.records.items.records[i]["processors"][j]['id'] == processor.id) {
                            $scope.records.items.records[i]["processors"][j] = processor;
                        }
                    }
                }
            });
        }

        $scope.processorUpdateActorLabel = function (processor, actor, actorField) {
            if(actor == null) {
                return;
            }
            if((actor.id == undefined || actor.id == null)) {
                if(actor.label) {
                    actor["contact"] = "";
                    RecordService.createRecordActor(actor, function (status) {
                        RecordService.getRecordActor(status.id).then(function (data) {
                            actor = data;
                            processor[actorField] = actor;
                            $scope.updatingActor = true;
                            RecordService.updateRecordProcessor(processor, function (data) {
                                for (var i = 0; i < $scope.records.items.records.length; ++i ) {
                                    for (var j = 0; j < $scope.records.items.records[i]["processors"].length; ++j ) {
                                        if ($scope.records.items.records[i]["processors"][j]['id'] == processor.id) {
                                            $scope.records.items.records[i]["processors"][j] = processor;
                                        }
                                    }
                                }
                                $scope.updatingActor = false;
                            });
                        });
                    });
                }
            }
            else {
                if(!actor.label) {
                    processor[actorField] = null;
                    $scope.updatingActor = true;
                    RecordService.updateRecordProcessor(processor, function (data) {
                        for (var i = 0; i < $scope.records.items.records.length; ++i ) {
                            for (var j = 0; j < $scope.records.items.records[i]["processors"].length; ++j ) {
                                if ($scope.records.items.records[i]["processors"][j]['id'] == processor.id) {
                                    $scope.records.items.records[i]["processors"][j] = processor;
                                }
                            }
                        }
                        $scope.updatingActor = false;
                    });
                }
                else {
                    RecordService.updateRecordActor(actor, function (data) {
                        $scope.updateActor(actor.id).then(function() {
                            $scope.updatingActor = true;
                            $scope.updatingActor = false;
                        });
                    });
                }
            }
        }

        $scope.createNewProcessor = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$q', 'RecordService', 'record', 'ConfigService', CreateProcessorDialogCtrl],
                templateUrl: 'views/anr/create.processors.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    'record' : record,
                }
            })
            .then(function (processor) {
                var cont = processor.cont;
                if(processor.mode) {
                    processor["contact"] = "";
                    RecordService.createRecordProcessor(processor, function (status) {
                        $scope.getRecordProcessor(status.id, record.id).then(function (data) {
                            processor = data;
                            record["processors"].push(processor);
                            RecordService.updateRecord(record, function (data) {
                                RecordService.getRecord(record.id).then(function (data) {
                                    record["updatedAt"] = data["updatedAt"];
                                });
                                if (cont) {
                                    $scope.createNewProcessor(ev);
                                }
                            });
                        });
                    });
                }
                else {
                    $scope.getRecordProcessor(processor.id, record.id).then(function (data) {
                        record["processors"].push(data);
                        RecordService.updateRecord(record, function (data) {
                            RecordService.getRecord(record.id).then(function (data) {
                                record["updatedAt"] = data["updatedAt"];
                            });
                            if (cont) {
                                $scope.createNewProcessor(ev);
                            }
                        });
                    });
                }

            }).catch(angular.noop);
        };

        $scope.jsonExport = function (ev, record) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', ExportRecordDialogCtrl],
                templateUrl: 'views/anr/export.record.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {}
            }).then(function (exports) {
                var cliAnr = '';
                var method = $http.get;
                if ($scope.OFFICE_MODE == 'FO') {
                    cliAnr = 'client-';
                    method = $http.post;
                }
                method('api/'+cliAnr+'anr/' + $scope.model.anr.id + '/records/' + record.id + '/export', {id: record.id, password: exports.password}).then(function (data) {
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
                locals: {}
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

        $scope.generateRecordContentCsv = function(recordId) {
            var promise = $q.defer();
            var finalArray = [];
            var result = "";
            var recLine = 0;
            RecordService.getRecord(recordId).then(function (data) {
                var nbJointControllerLine = Array.isArray(data.jointControllers)? data.jointControllers.length : 0;
                var nbDataLine = Array.isArray(data.personalData)? data.personalData.length : 0;
                var nbRecipientLine = Array.isArray(data.recipients)? data.recipients.length : 0;
                var nbInternationalTransferLine = Array.isArray(data.internationalTransfers)? data.internationalTransfers.length : 0;
                var nbProcessorLine = Array.isArray(data.processors)? data.processors.length: 0;
                var nbLine = Math.max(nbJointControllerLine, nbDataLine, nbRecipientLine, nbInternationalTransferLine, nbProcessorLine, 1);

                while(recLine < nbLine) {
                    if(recLine === 0) {
                        finalArray[recLine]="\""+data.label+"\"";
                        finalArray[recLine]+=','+"\""+data.createdAt.date.substring(0,10)+"\"";
                        if(data.updatedAt) {
                            finalArray[recLine]+=','+"\""+data.updatedAt.date.substring(0,10)+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        if(data.purposes) {
                            finalArray[recLine]+=','+"\""+data.purposes+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        if(data.secMeasures) {
                            finalArray[recLine]+=','+"\""+data.secMeasures+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] ="\""+' '+"\""
                                            +','+"\""+' '+"\""
                                            +','+"\""+' '+"\""
                                            +','+"\""+' '+"\""
                                            +','+"\""+' '+"\"" ;
                    }


                    if(data.controller && recLine === 0) {
                        finalArray[recLine] +=','+"\""+data.controller.label+"\"";
                        if(data.controller.contact) {
                            finalArray[recLine]+=','+"\""+data.controller.contact+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }
                    if(data.representative && recLine === 0) {
                        finalArray[recLine] +=','+"\""+data.representative.label+"\"";
                        if(data.representative.contact) {
                            finalArray[recLine]+=','+"\""+data.representative.contact+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }
                    if(data.dpo && recLine === 0) {
                        finalArray[recLine] +=','+"\""+data.dpo.label+"\"";
                        if(data.dpo.contact) {
                            finalArray[recLine]+=','+"\""+data.dpo.contact+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }
                    if(recLine < nbJointControllerLine) {
                        finalArray[recLine] +=','+"\""+data.jointControllers[recLine].label+"\"";
                        if(data.jointControllers[recLine].contact) {
                            finalArray[recLine]+=','+"\""+data.jointControllers[recLine].contact+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }

                    if(recLine < nbDataLine) {
                        var dataCategoriesString = '';
                        if(Array.isArray(data.personalData[recLine].dataCategories)) {
                            dataCategoriesString += data.personalData[recLine].dataCategories[0].label;
                            for(var k = 1; k <data.personalData[recLine].dataCategories.length; ++k) {
                                dataCategoriesString += ", " + data.personalData[recLine].dataCategories[k].label;
                            }
                        }
                        if(data.personalData[recLine].dataSubject) {
                            finalArray[recLine] +=','+"\""+data.personalData[recLine].dataSubject+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        finalArray[recLine] +=','+"\""+dataCategoriesString+"\"";
                        if(data.personalData[recLine].description) {
                            finalArray[recLine] +=','+"\""+data.personalData[recLine].description+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        finalArray[recLine] +=','+"\""+data.personalData[recLine].retentionPeriod+"\"";
                        if(data.personalData[recLine].retentionPeriodMode === 0) {
                            finalArray[recLine] +=','+"\""+ 'day(s)' +"\"";
                        } else if (data.personalData[recLine].retentionPeriodMode === 1) {
                            finalArray[recLine] +=','+"\""+ 'month(s)'+"\"";
                        } else {
                            finalArray[recLine] +=','+"\""+ 'year(s)' +"\"";
                        }
                        if(data.personalData[recLine].retentionPeriodDescription) {
                            finalArray[recLine] +=','+"\""+data.personalData[recLine].retentionPeriodDescription+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }

                    if(recLine < nbRecipientLine) {
                        finalArray[recLine] +=','+"\""+data.recipients[recLine].label+"\"";
                        if(data.recipients[recLine].type == 0) {
                            finalArray[recLine] +=','+"\""+ 'internal' +"\"";
                        } else {
                            finalArray[recLine] +=','+"\""+ 'external' +"\"";
                        }
                        if(data.recipients[recLine].description) {
                            finalArray[recLine] +=','+"\""+data.recipients[recLine].description+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }

                    if(recLine < nbInternationalTransferLine) {
                        if(data.internationalTransfers[recLine].organisation) {
                            finalArray[recLine] +=','+"\""+data.internationalTransfers[recLine].organisation+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        if(data.internationalTransfers[recLine].description) {
                            finalArray[recLine] +=','+"\""+data.internationalTransfers[recLine].description+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        if(data.internationalTransfers[recLine].country) {
                            finalArray[recLine] +=','+"\""+data.internationalTransfers[recLine].country+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                        if(data.internationalTransfers[recLine].documents) {
                            finalArray[recLine] +=','+"\""+data.internationalTransfers[recLine].documents+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }

                    if(recLine < nbProcessorLine) {
                        finalArray[recLine] +=','+"\""+data.processors[recLine].label+"\"";
                        if(data.processors[recLine].contact) {
                            finalArray[recLine]+=','+"\""+data.processors[recLine].contact+"\"";
                        } else {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }

                        if(data.processors[recLine].representative) {
                            finalArray[recLine] +=','+"\""+data.processors[recLine].representative.label+"\"";
                            if(data.processors[recLine].representative.contact) {
                                finalArray[recLine]+=','+"\""+data.processors[recLine].representative.contact+"\"";
                            } else {
                                finalArray[recLine]+=','+"\""+' '+"\"";
                            }
                        }
                        else {
                            finalArray[recLine] +=','+"\""+' '+"\""
                                                + ','+"\""+' '+"\"";
                        }
                        if(data.processors[recLine].dpo) {
                            finalArray[recLine] +=','+"\""+data.processors[recLine].dpo.label+"\"";
                            if(data.processors[recLine].dpo.contact) {
                                finalArray[recLine]+=','+"\""+data.processors[recLine].dpo.contact+"\"";
                            } else {
                                finalArray[recLine]+=','+"\""+' '+"\"";
                            }
                        }
                        else {
                            finalArray[recLine] +=','+"\""+' '+"\""
                                                + ','+"\""+' '+"\"";
                        }
                    }
                    else {
                        finalArray[recLine] +=','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\""
                                            + ','+"\""+' '+"\"";
                    }
                    recLine ++;
                }

                for(var j = 0; j < finalArray.length; ++j) {
                    let row = finalArray[j].toString().replace(/\n|\r/g,' ') + "," + "\r\n";
                    result += row ;
                }
                promise.resolve(result);
            });
            return promise.promise;
        }

        $scope.generateAllRecordsContentCsv = function () {
            var promise = $q.defer();
            var promises = [];
            var result = "";
            var numRecords = 0;
            let promiseQueue = $scope.records.items.records.reduce(function(accumulatorPromise, nextRecord) {
                return accumulatorPromise.then(function() {
                    return $scope.generateRecordContentCsv(nextRecord.id).then(function(data) {
                        result += data;
                    });
                });
            }, Promise.resolve());

            promiseQueue.then(function() {
                promise.resolve(result);
            });
            return promise.promise;
        }

        $scope.export = function (ev, all, record) {
            finalArray=[];
            recLine = 0;
            let csvContent = "data:text/csv;charset=UTF-8,\uFEFF";
            finalArray[recLine]= 'Name';
            finalArray[recLine]+=','+'Creation date';
            finalArray[recLine]+=','+'Last updated date';
            finalArray[recLine]+=','+'Purposes';
            finalArray[recLine]+=','+'Security measures';

            finalArray[recLine]+=','+'Controller name';
            finalArray[recLine]+=','+'Controller contact';
            finalArray[recLine]+=','+'Representative name';
            finalArray[recLine]+=','+'Representative contact';
            finalArray[recLine]+=','+'Data protection officer name';
            finalArray[recLine]+=','+'Data protection officer contact';
            finalArray[recLine]+=','+'Joint controllers name';
            finalArray[recLine]+=','+'Joint controllers contact';

            finalArray[recLine]+=','+'Data subject';
            finalArray[recLine]+=','+'Data categories';
            finalArray[recLine]+=','+'Description';
            finalArray[recLine]+=','+'Retention period';
            finalArray[recLine]+=','+'Retention period unit';
            finalArray[recLine]+=','+'Retention period description';

            finalArray[recLine]+=','+'Data recipient';
            finalArray[recLine]+=','+'Data recipient type';
            finalArray[recLine]+=','+'Description';

            finalArray[recLine]+=','+'Organisation of international transfer';
            finalArray[recLine]+=','+'Description';
            finalArray[recLine]+=','+'Country';
            finalArray[recLine]+=','+'Documents';

            finalArray[recLine]+=','+'Data processor name';
            finalArray[recLine]+=','+'Data processor contact';
            finalArray[recLine]+=','+'Activities';
            finalArray[recLine]+=','+'Data processor security measures';
            finalArray[recLine]+=','+'Data processor representative name';
            finalArray[recLine]+=','+'Data processor representative contact';
            finalArray[recLine]+=','+'Data processor data protection officer name';
            finalArray[recLine]+=','+'Data processor data protection officer contact';
            let row = finalArray[0].toString().replace(/\n|\r/g,' ') + "," + "\r\n";
            csvContent += row ;
            if(all == true) {
                $scope.generateAllRecordsContentCsv().then(function(data) {
                    csvContent += data;
                    var encodedUri = encodeURI(csvContent);
                    var link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "records_list.csv");
                    document.body.appendChild(link);
                    link.click();  // This will download the data file named "record.csv".
                });
            } else {
                $scope.generateRecordContentCsv(record.id).then(function(data) {
                    csvContent += data;
                    var encodedUri = encodeURI(csvContent);
                    var link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    var fileName = record.label + ".csv";
                    link.setAttribute("download", fileName);
                    document.body.appendChild(link);
                    link.click();  // This will download the data file named "record.csv".
                });
            }
        }
    }

    function CreateRecordDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.newRecord =  { 'duplicateRecord' : false,
                              'recordToDuplicate' : {}
                            }

        $scope.cancel = function() {
            delete $scope.newRecord;
            $scope.recordSearchText = '';
            $mdDialog.cancel();
        };

        $scope.queryRecordSearch = function(query) {
            var promise = $q.defer();
            RecordService.getRecords({filter: query}).then(function (e) {
                $scope.options = e["records"];
                promise.resolve(e["records"]);
            });
            return promise.promise;
        }

        $scope.recordItemSelected = function (selectedRecord) {
            if(selectedRecord != null) {
                $scope.newRecord.recordToDuplicate['record'] = selectedRecord.id;
                $scope.newRecord.duplicateRecord = true;
            }else {
                $scope.newRecord.recordToDuplicate['record'] = null;
                $scope.newRecord.duplicateRecord = false;
            }
        }

        $scope.create = function() {
            $scope.newRecord['cont'] = false;
            $scope.recordSearchText = '';
            $mdDialog.hide($scope.newRecord);
        };

        $scope.createAndContinue = function () {
            $scope.newRecord['cont'] = true;
            $scope.recordSearchText = '';
            $mdDialog.hide($scope.newRecord);
        };

        $scope.importRecord = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AnrService', 'toastr', 'gettextCatalog', 'Upload', 'DownloadService', ImportRecordDialogCtrl],
                templateUrl: 'views/anr/import.record.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                locals: {},
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
            }).then(function (id) {
                $scope.updatingRecords = true;
                $scope.updateRecords().then(function() {
                    $scope.updatingRecords = false;
                    $scope.selectRecord(id, $scope.records.items.count);
                });
            }).catch(angular.noop);
        };
    }

    function CreateProcessorDialogCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $q, RecordService, record, ConfigService) {
        $scope.languages = ConfigService.getLanguages();
        $scope.language = $scope.getAnrLanguage();
        $scope.record = record;
        $scope.processor = {"mode" : true, "label" : ""};

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.queryRecordProcessorSearch = function() {
            var promise = $q.defer();
            RecordService.getRecordProcessors().then(function (e) {
                // Filter out values already selected
                var filtered = [];
                for (var j = 0; j < e["record-processors"].length; ++j) {
                    var found = false;

                    for (var i = 0; i < $scope.record.processors.length; ++i) {
                        if ($scope.record.processors[i].id == e["record-processors"][j].id) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        filtered.push(e["record-processors"][j]);
                    }
                }
                $scope.options = filtered;
                promise.resolve(filtered);
            });
            return promise.promise;
        }

        $scope.processorItemSelected = function (selectedProcessor) {
            if(selectedProcessor) {
                $scope.processor = selectedProcessor;
                $scope.processor["mode"] = false;
            } else {
                $scope.processor = {"mode" : true, "label" : ""};
            }
        }

        $scope.create = function() {
            $scope.processor['cont'] = false;
            $mdDialog.hide($scope.processor);
        };

        $scope.createAndContinue = function () {
            $scope.processor['cont'] = true;
            $mdDialog.hide($scope.processor);
        };
    }

    function ImportRecordDialogCtrl($scope, $mdDialog, AnrService, toastr, gettextCatalog, Upload, DownloadService) {
        $scope.isImportingIn = false;
        $scope.isJson = false;
        $scope.import = {
            password: '',
        };
        $scope.items = {
            'type' : {
                'jsonField' : 'type',
                'required' : true,
                'type' : 'text',
                'value' : 'record'
            },
            'name' : {
                'jsonField' : 'name',
                'csvField' : 'Name',
                'required' : true,
                'type' : 'text',
                'example' : gettextCatalog.getString('January payroll account, summer recruitment')
            },
            'purposes' : {
                'jsonField' : 'purposes',
                'csvField' : 'Purposes',
                'required' : false,
                'type' : 'text',
                'example' : gettextCatalog.getString('Payroll, personnel file, recruitment')
            },
            'security measures' : {
                'jsonField' : 'security_measures',
                'csvField' : 'Security measures',
                'required' : false,
                'type' : 'text',
                'example' : gettextCatalog.getString('Payroll, personnel file, recruitment')
            },
            'controller' : {
                'jsonField' : 'controller',
                'csvField' : 'Controller',
                'required' : false,
                'type' : 'object',
                'subfield' : {
                    'name' :  {
                        'jsonField' : 'name',
                        'csvField' : 'Controller name',
                        'required' : true,
                        'type' : 'text'
                    },
                    'contact' :  {
                        'jsonField' : 'contact',
                        'csvField' : 'Controller contact',
                        'required' : false,
                        'type' : 'text'
                    },
                }
            },
            'representative' : {
                'jsonField' : 'representative',
                'csvField' : 'Representative',
                'required' : false,
                'type' : 'object',
                'subfield' : {
                    'name' :  {
                        'jsonField' : 'name',
                        'csvField' : 'Representative name',
                        'required' : true,
                        'type' : 'text'
                    },
                    'contact' :  {
                        'jsonField' : 'contact',
                        'csvField' : 'Representative contact',
                        'required' : false,
                        'type' : 'text'
                    },
                }
            },
            'data protection officer' : {
                'jsonField' : 'data_protection_officer',
                'csvField' : 'Data protection officer',
                'required' : false,
                'type' : 'object',
                'subfield' : {
                    'name' :  {
                        'jsonField' : 'name',
                        'csvField' : 'Data protection officer name',
                        'required' : true,
                        'type' : 'text'
                    },
                    'contact' :  {
                        'jsonField' : 'contact',
                        'csvField' : 'Data protection officer contact',
                        'required' : false,
                        'type' : 'text'
                    },
                }
            },
            'joint controllers' : {
                'jsonField' : 'joint_controllers',
                'csvField' : 'Joint controllers',
                'required' : false,
                'type' : 'array',
                'subfield' : {
                    'name' :  {
                        'jsonField' : 'name',
                        'csvField' : 'Joint controllers name',
                        'required' : true,
                        'type' : 'text'
                    },
                    'contact' :  {
                        'jsonField' : 'contact',
                        'csvField' : 'Joint controllers contact',
                        'required' : false,
                        'type' : 'text'
                    }
                }
            },
            'personal data' : {
                'jsonField' : 'personal_data',
                'csvField' : 'Personal data',
                'required' : false,
                'type' : 'array',
                'subfield' : {
                    'data subject' :  {
                        'jsonField' : 'data_subject',
                        'csvField' : 'Data subject',
                        'required' : false,
                        'type' : 'text',
                        'example' : gettextCatalog.getString( 'Employee, existing customers, recruitment candidates')
                    },
                    'data categories' :  {
                        'jsonField' : 'data_categories',
                        'csvField' : 'Data categories',
                        'required' : false,
                        'type' : 'array',
                        'example' : gettextCatalog.getString( 'Contact details, bank details, qualifications')
                    },
                    'description' :  {
                        'jsonField' : 'description',
                        'csvField' : 'Description',
                        'required' : false,
                        'type' : 'text'
                    },
                    'retention period' :  {
                        'jsonField' : 'retention_period',
                        'csvField' : 'Retention period',
                        'required' : false,
                        'type' : 'integer'
                    },
                    'retention period mode' :  {
                        'jsonField' : 'retention_period_mode',
                        'csvField' : 'Retention period unit',
                        'required' : false,
                        'type' : 'text',
                        'value' : 'day(s) / month(s) / year(s)'
                    },
                    'retention period description' :  {
                        'jsonField' : 'retention_period_description',
                        'csvField' : 'Retention period description',
                        'required' : false,
                        'type' : 'text',
                        'example' : gettextCatalog.getString( 'Post-employment, end of customer relationship')
                    },
                }
            },
            'recipients' : {
                'jsonField' : 'recipients',
                'csvField' : 'Data recipients',
                'required' : false,
                'type' : 'array',
                'subfield' : {
                    'name' : {
                        'jsonField' : 'name',
                        'csvField' : 'Data recipient',
                        'required' : true,
                        'type' : 'text',
                        'example' : gettextCatalog.getString( 'Suppliers, credit agencies, government departments')
                    },
                    'type' : {
                        'jsonField' : 'type',
                        'csvField' : 'Data recipient type',
                        'required' : false,
                        'type' : 'text',
                        'value' : 'internal / external'
                    },
                    'description' : {
                        'jsonField' : 'description',
                        'csvField' : 'Description',
                        'required' : false,
                        'type' : 'text'
                    }
                }
            },
            'international transfers' : {
                'jsonField' : 'international_transfers',
                'csvField' : 'International transfers',
                'required' : false,
                'type' : 'array',
                'subfield' : {
                    'organisation' : {
                        'jsonField' : 'organisation',
                        'csvField' : 'Organisation of international transfer',
                        'required' : false,
                        'type' : 'text'
                    },
                    'description' : {
                        'jsonField' : 'description',
                        'csvField' : 'Description',
                        'required' : false,
                        'type' : 'text'
                    },
                    'country' : {
                        'jsonField' : 'country',
                        'csvField' : 'Country',
                        'required' : false,
                        'type' : 'text',
                        'example' : gettextCatalog.getString( 'Ireland, UK, Canada')
                    },
                    'documents' : {
                        'jsonField' : 'documents',
                        'csvField' : 'Documents',
                        'required' : false,
                        'type' : 'text'
                    }
                }
            },
            'processors' : {
                'jsonField' : 'processors',
                'csvField' : 'Processors',
                'required' : false,
                'type' : 'array',
                'subfield' : {
                    'name' :  {
                        'jsonField' : 'name',
                        'csvField' : 'Data processor name',
                        'required' : true,
                        'type' : 'text'
                    },
                    'contact' :  {
                        'jsonField' : 'contact',
                        'csvField' : 'Data processor contact',
                        'required' : false,
                        'type' : 'text'
                    },
                    'activities' :  {
                        'jsonField' : 'activities',
                        'csvField' : 'Activities',
                        'required' : false,
                        'type' : 'text',
                        'example' : gettextCatalog.getString( 'Financial management, talent research')
                    },
                    'security measures' :  {
                        'jsonField' : 'security_measures',
                        'csvField' : 'Data processor security measures',
                        'required' : false,
                        'type' : 'text',
                        'example' : gettextCatalog.getString('Encrypted storage, access controls')
                    }
                }
            }
        };

        $scope.downloadExampleFile = function(){
            var fields = [];
            for(var index in $scope.items) {
                if ($scope.items[index]['csvField']) {
                    if ($scope.items[index]['subfield']) {
                        for(var subfieldIndex in $scope.items[index]['subfield']) {
                            fields.push($scope.items[index]['subfield'][subfieldIndex]['csvField']);
                        }
                    } else {
                        fields.push($scope.items[index]['csvField']);
                    }
                }
            }
            data = encodeURI('data:text/csv;charset=UTF-8,\uFEFF' + fields.join());
            link = document.createElement('a');
            link.setAttribute('href', data);
            link.setAttribute('download', 'ExampleFile.csv');
            document.body.appendChild(link);
            link.click();
        }

        $scope.downloadExampleJson = function() {
            var data = {};
            for(var index in $scope.items) {
                if ($scope.items[index]['jsonField']) {
                    if ($scope.items[index]['type'] == "array") {
                        data[($scope.items[index]['jsonField'])] = [];
                        if ($scope.items[index]['subfield']) {
                            data[($scope.items[index]['jsonField'])][0] = {};
                            for(var subfieldIndex in $scope.items[index]['subfield']) {
                                data[($scope.items[index]['jsonField'])][0][($scope.items[index]['subfield'][subfieldIndex]['jsonField'])] = "";
                            }
                        } else {
                            data[($scope.items[index]['jsonField'])][0] = "";
                        }
                    }
                    else {
                        if ($scope.items[index]['subfield']) {
                            data[($scope.items[index]['jsonField'])] = {};
                            for(var subfieldIndex in $scope.items[index]['subfield']) {
                                data[($scope.items[index]['jsonField'])][($scope.items[index]['subfield'][subfieldIndex]['jsonField'])] = "";
                            }
                        } else {
                            data[($scope.items[index]['jsonField'])] = "";
                        }
                    }
                }
            }
            data["type"] = "record";
            DownloadService.downloadJSON(data, "ExampleFile.json");
        }

        $scope.toggleGuide = function () {
            $scope.guideVisible = !$scope.guideVisible;
        };

        $scope.parseFile = function (fileContent) {
            Papa.parse(fileContent, {
                            header: true,
                            skipEmptyLines: true,
                            trimHeaders : true,
                            beforeFirstChunk: function( chunk ) {
                                var rows = chunk.split( /\r\n|\r|\n/ );
                                rows[0] = rows[0].toLowerCase();
                                return rows.join( '\n' );
                            },
                            complete: function(importData) {
                                $scope.csvFile = importData.data;
                            }
                    });
        };

        $scope.uploadFile = function () {
            $scope.isImportingIn = true;
            if($scope.isJson) {
                $scope.csvFile = [];
            }
            $scope.upload = Upload.upload({
                url: 'api/client-anr/' + $scope.getUrlAnrId() + '/records/import',
                data: {file: $scope.file, isJson: $scope.isJson, csv: $scope.csvFile, password: $scope.import.password}
            });

            $scope.upload.then(function (response) {
                $scope.isImportingIn = false;
                if (response.data.errors && response.data.errors.length > 0) {
                    toastr.warning(gettextCatalog.getString("Some files could not be imported"));
                } else {
                    toastr.success(gettextCatalog.getString("The record has been imported successfully"));
                    $mdDialog.hide(response.data.id[0]);
                }
            });
        }

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

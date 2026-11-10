(function() {

    angular
        .module('AnrModule')
        .controller('AnrSoaCtrl', [
            '$scope', '$rootScope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', '$stateParams',
            'MeasureService', 'SOACategoryService', 'ClientSoaService', '$q', 'ReferentialService', 'TableHelperService',
            'MeasureMeasureService', 'DownloadService', AnrSoaCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY
     */
    function AnrSoaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, $stateParams,
        MeasureService, SOACategoryService, ClientSoaService, $q, ReferentialService, TableHelperService,
        MeasureMeasureService, DownloadService) {

        $scope.referentials = {items: {referentials: []}};

        $scope.updateSoaReferentials = function() {
            $scope.soa_measures = {};
            $scope.updatingReferentials = false;
            ReferentialService.getReferentials({
                order: 'createdAt'
            }).then(function(data) {
                $scope.referentials.items = data;
                $scope.referentials.items.referentials.forEach(function(ref) {
                    let uuid = ref.uuid;
                    $scope.soa_measures[uuid] = TableHelperService.build('m.code', 20, 1, '');
                    $scope.soa_measures[uuid].selectedCategory = 0;
                });
                var selected = data.referentials.find(function(ref) {
                    return ref.uuid === $scope.referential_uuid;
                }) || data.referentials[0];
                if (selected) {
                    $scope.selectReferential(selected.uuid);
                } else {
                    $scope.referential_uuid = null;
                    if ($scope.listener) {
                        $scope.listener();
                        $scope.listener = null;
                    }
                }
                $scope.updatingReferentials = true;
                if (document.querySelector('#tabRef')) {
                    document.querySelector('#tabRef').click(); //Force ng-click over first referential
                }
            })
        };

        $scope.updateSoaReferentials();

        var removeReferentialsListener = $rootScope.$on('referentialsUpdated', function() {
            $scope.referential_uuid = null;
            $scope.referentialsUpdated = true;
        });

        var removeControlsListener = $rootScope.$on('controlsUpdated', function() {
            $scope.updateSoaMeasures();
        });

        var removeScaleListener = $rootScope.$on('soaScaleUpdated', function() {
            $scope.updateSoaMeasures();
        });

        $scope.$on('$destroy', function() {
            removeReferentialsListener();
            removeControlsListener();
            removeScaleListener();
        });

        $scope.listener = null;
        $scope.selectReferential = function(referentialId) {
            if ($scope.listener !== null) {
                $scope.listener();
            }
            $scope.referential_uuid = referentialId;
            $scope.updateSoaMeasures();
            $scope.updateCategories(referentialId);

            $scope.listener = $scope.$watchGroup(
                [
                    "soa_measures[" + "'" + referentialId + "'" + "].selectedCategory",
                    "soa_measures[" + "'" + referentialId + "'" + "].query.filter",
                    "soa_measures[" + "'" + referentialId + "'" + "].query.order"
                ],
                function(newValues,oldValues) {
                    if (!newValues.every((val, idx) => val === oldValues[idx]) && $scope.referential_uuid) {
                        $scope.updateSoaMeasures();
                    }
                }
            );
            $scope.step = { // Deliverable data
                num: 5,
                referential: $scope.referential_uuid
            };
        };

        $scope.$watch('referentialsUpdated', function() {
            if ($scope.referentialsUpdated) {
                $scope.updateSoaReferentials();
                $scope.referentialsUpdated = false
            }
        });

        $scope.updateSoaMeasures = function() {
            var table = $scope.soa_measures[$scope.referential_uuid];
            if (!table) {
                return;
            }
            $scope.updatingMeasures = false;
            var query = angular.copy(table.query);
            query.category = table.selectedCategory;
            query.referential = $scope.referential_uuid;

            if (table.previousQueryOrder != table.query.order) {
                table.query.page = query.page = 1;
                table.previousQueryOrder = table.query.order;
            }

            table.promise = ClientSoaService.getSoas(query);
            table.promise.then(
                function(data) {
                    table.items = data;
                    if ($scope.soa_measures[$scope.referential_uuid] === table) {
                        $scope.updatingMeasures = true;
                    }
                }
            )
        };

        // get the list of categories
        $scope.updateCategories = function(ref) {
            SOACategoryService.getCategories({
                order: $scope._langField('label'),
                referential: ref
            }).then(function(data) {
                $scope.Categories = data['categories'];
            });
        }

        $scope.onTableEdited = function(model, name) {
            var promise = $q.defer();

            if (name === "EX" || name === "LR" || name === "CO" || name === "BR" || name === "BP" || name === "RRA") {
                if (model[name] == 0) {
                    model[name] = 1
                } else
                    model[name] = 0;
            }
            if (name == 'soaScaleComment') {
                var soaScaleComment = getSoaScaleCommentByIndex(model[name]['scaleIndex']);
                model.soaScaleComment = soaScaleComment.id;
            }

            ClientSoaService.updateSoa(model.id, {[name] : model[name]}, function() {
                if (soaScaleComment) {
                    model.soaScaleComment = soaScaleComment;
                }
                promise.resolve(true);
            }, function() {
                promise.reject(false);
            });
            return promise.promise;
        };

        $scope.sortByCode = function() {
            if ($scope.soa_measures[$scope.referential_uuid].query.order == 'm.code') { // set m.code because it's a joined table and his alias is m for measure
                $scope.soa_measures[$scope.referential_uuid].query.order = '-m.code';
            } else {
                $scope.soa_measures[$scope.referential_uuid].query.order = 'm.code';
            }
        }

        $scope.goToSoaSheet = function(measure) {
            $state.get('main.project.anr.soa.sheet').data = measure;
            $rootScope.$broadcast('soaSheet', measure);
            $state.transitionTo('main.project.anr.soa.sheet', {
                modelId: $stateParams.modelId
            }, {
                inherit: true,
                notify: true,
                reload: false,
                location: 'replace'
            });
            $scope.display.anrSelectedTabIndex = 6;
        };

        $scope.import = function(ev, referential) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            var importOptions = ['remarks', 'evidences', 'actions'];
            var justificationOptions = ['EX', 'LR', 'CO', 'BR', 'BP', 'RRA'];

            $mdDialog.show({
                    controller: ['$scope', '$mdDialog', 'referentials', 'referential', 'anrId', importSoaFromDialogCtrl],
                    templateUrl: 'views/anr/import.soa.html',
                    targetEvent: ev,
                    preserveScope: false,
                    scope: $scope.$dialogScope.$new(),
                    clickOutsideToClose: false,
                    fullscreen: useFullScreen,
                    locals: {
                        'referentials': $scope.referentials.items['referentials'],
                        'referential': referential,
                        'anrId': $scope.model.anr.id
                    }
                })
                .then(function(importSoa) {
                    ClientSoaService.getSoas({
                        referential: $scope.referential_uuid
                    }).then(function(data) {
                        var children = data['soaMeasures'];
                        ClientSoaService.getSoas({
                            referential: importSoa.refSelected
                        }).then(function(data) {
                            var fathers = data['soaMeasures'];
                            children.forEach(child => {
                                let fathersFiltered = [];
                                let avg = [];
                                child.measure.linkedMeasures.forEach(linkedMeasure => {
                                    fathersFiltered.push(fathers.filter(father => father.measure.uuid == linkedMeasure))
                                });
                                fathersFiltered.flat().forEach(father => {
                                    importOptions.forEach(function(option) {
                                        if (importSoa[option] && father[option]) {
                                            if (child[option]) {
                                                child[option] += "\r\n" + father[option];
                                            } else {
                                                child[option] = father[option];
                                            }
                                        }
                                    });
                                    if (importSoa.justification) {
                                        justificationOptions.forEach(function(option) {
                                            if (father[option] == 1) {
                                                if (child.EX && father[option] != 'EX') {
                                                    child.EX = 0;
                                                }
                                                child[option] = father[option];
                                            }
                                        });
                                    }
                                    if (importSoa.compliance && father.soaScaleComment !== null && !child.EX) {
                                        if (child.soaScaleComment == null || child.soaScaleComment.isHidden) {
                                            child.soaScaleComment = getSoaScaleCommentByIndex(0);
                                        }
                                        if (father.soaScaleComment.isHidden) {
                                            father.soaScaleComment = getSoaScaleCommentByIndex(0);
                                        }
                                        if (importSoa.calcul == 'average') {
                                            if (avg.length == 0) {
                                                avg.push(child.soaScaleComment.scaleIndex);
                                            }
                                            avg.push(father.soaScaleComment.scaleIndex);
                                            let sum = avg.reduce((acc, x) => acc + x, 0);
                                            child.soaScaleComment = getSoaScaleCommentByIndex(Math.round(sum / avg.length));
                                        } else if (child.soaScaleComment == null || child.soaScaleComment.scaleIndex > father.soaScaleComment.scaleIndex) {
                                            child.soaScaleComment = father.soaScaleComment;
                                        }
                                    }
                                });
                            });

                            ClientSoaService.updateSoa(null, children, function() {
                                $scope.updateSoaMeasures();
                                toastr.success(gettextCatalog.getString('The SOA has been imported successfully.'),
                                    gettextCatalog.getString('Import successful'));
                            });
                        })
                    });
                }, function(reject) {
                    $scope.handleRejectionDialog(reject);
                });
        }

        $scope.export = function() {
            finalArray = [];
            recLine = 0;
            finalArray[recLine] = gettextCatalog.getString('Category');
            finalArray[recLine] += ',' + gettextCatalog.getString('Code');
            finalArray[recLine] += ',' + gettextCatalog.getString('Control');
            finalArray[recLine] += ',' + gettextCatalog.getString('Inclusion/Exclusion');
            finalArray[recLine] += ',' + gettextCatalog.getString('Remarks/Justification');
            finalArray[recLine] += ',' + gettextCatalog.getString('Evidences');
            finalArray[recLine] += ',' + gettextCatalog.getString('Actions');
            finalArray[recLine] += ',' + gettextCatalog.getString('Level of compliance');

            ClientSoaService.getSoas({
                referential: $scope.referential_uuid,
                order: 'm.code'
            }).then(function(data) {
                soas = data['soaMeasures'];
                for (soa in soas) {
                    recLine++;

                    finalArray[recLine] = "\"" + $scope._langField(soas[soa].measure.category, 'label') + "\"";
                    finalArray[recLine] += ',' + "\"" + soas[soa].measure.code + "\"";
                    finalArray[recLine] += ',' + "\"" + $scope._langField(soas[soa].measure, 'label') + "\"";

                    //Inclusion/exclusion

                    finalArray[recLine] += ',' + "\"" + ' ';
                    if (soas[soa].EX == 1)
                        finalArray[recLine] += gettextCatalog.getString('Excluded');
                    if (soas[soa].LR == 1)
                        finalArray[recLine] += gettextCatalog.getString('Legal requirements') + "  ";
                    if (soas[soa].CO == 1)
                        finalArray[recLine] += gettextCatalog.getString('Contractual obligations') + "  ";
                    if (soas[soa].BR == 1)
                        finalArray[recLine] += gettextCatalog.getString('Business requirements') + "  ";
                    if (soas[soa].BP == 1)
                        finalArray[recLine] += gettextCatalog.getString('Best practices') + "  ";
                    if (soas[soa].RRA == 1)
                        finalArray[recLine] += gettextCatalog.getString('Results of risk assessment') + "  ";
                    finalArray[recLine] += "\"";

                    // Remarks
                    if (soas[soa].remarks == null)
                        finalArray[recLine] += ',' + "\"" + ' ' + "\"";
                    else
                        finalArray[recLine] += ',' + "\"" + soas[soa].remarks + "\"";

                    // evidences
                    if (soas[soa].evidences == null)
                        finalArray[recLine] += ',' + "\"" + ' ' + "\"";
                    else
                        finalArray[recLine] += ',' + "\"" + soas[soa].evidences + "\"";

                    // actions
                    if (soas[soa].actions == null)
                        finalArray[recLine] += ',' + "\"" + ' ' + "\"";
                    else
                        finalArray[recLine] += ',' + "\"" + soas[soa].actions + "\"";

                    // compliance
                    if (soas[soa].soaScaleComment == null || soas[soa].EX == 1 || soas[soa].soaScaleComment.isHidden)
                        finalArray[recLine] += ',' + "\"" + ' ' + "\"";
                    else {
                        finalArray[recLine] += ',' +
                            "\"" +
                            soas[soa].soaScaleComment.comment +
                            "\"";
                    }
                }

                let csvContent = "";
                for (var j = 0; j < finalArray.length; ++j) {
                    let row = finalArray[j].toString().replace(/\n|\r/g, ' ') + "," + "\r\n";
                    csvContent += row;
                }

                DownloadService.downloadCSV(csvContent, 'soa.csv', 'text/csv');
            });

        };

        function getSoaScaleCommentByIndex(index) {
            return angular.copy($scope.soaScale.comments)
                .find(comment => comment.scaleIndex == index);
        }
    }

    function importSoaFromDialogCtrl($scope, $mdDialog, referentials, referential, anr) {

        $scope.referential = referential;
        $scope.referentials = referentials;
        $scope.importSoa = {
            refSelected: null,
            justification: true,
            remarks: true,
            evidences: true,
            actions: true,
            compliance: true,
            calcul: 'average'
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.create = function() {
            $mdDialog.hide($scope.importSoa);
        };
    }
})();

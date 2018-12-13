(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state', 'MeasureService',
            'SOACategoryService' , 'ClientSoaService',  '$q', 'ReferentialService', 'TableHelperService', 'MeasureMeasureService',
            AnrSoaCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY
     */
    function AnrSoaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, MeasureService, SOACategoryService,
                                  ClientSoaService,  $q, ReferentialService, TableHelperService, MeasureMeasureService) {
        // Options for Soa Table
        $scope.soa_measures = TableHelperService.build('measure', 20, 1, '');
        $scope.updatingReferentials = false;
        $scope.referentials = [];
        ReferentialService.getReferentials({order: 'createdAt'}).then(function (data) {
            $scope.referentials.items = data;
            $scope.updatingReferentials = true;
        })

        $scope.selectReferential = function (referentialId) {
            $scope.soa_measures.selectedCategory = 0;
            $scope.referential_uniqid = referentialId;
            $scope.updateCategories(referentialId);
        };

        $scope.$watchGroup(['soa_measures.selectedCategory', 'referential_uniqid', 'soa_measures.query.filter', 'soa_measures.query.order'], function(newValue, oldValue) {
                $scope.updateSoaMeasures();
        });

        $scope.updateSoaMeasures = function () {
            var query = angular.copy($scope.soa_measures.query);
            query.category = $scope.soa_measures.selectedCategory;
            query.referential = $scope.referential_uniqid;

            if ($scope.soa_measures.previousQueryOrder != $scope.soa_measures.query.order) {
                $scope.soa_measures.query.page = query.page = 1;
                $scope.soa_measures.previousQueryOrder = $scope.soa_measures.query.order;
            }

            $scope.soa_measures.promise = ClientSoaService.getSoas(query);
            $scope.soa_measures.promise.then(
                function (data) {
                    $scope.soa_measures.items = data;
                }
            )
        };

        // get the list of categories
        $scope.updateCategories = function (ref) {
          SOACategoryService.getCategories({order: $scope._langField('label') , referential: ref}).then(function (data) {
            $scope.Categories = data['categories'];
          });
        }

        $scope.onTableEdited = function (model, name) {
            var promise = $q.defer();

            if (name === "EX" || name === "LR" || name === "CO" || name === "BR" || name === "BP" || name === "RRA" ) {
                if (model[name] == 0) {
                  model[name] = 1
                }else
                model[name] = 0;
            }
            ClientSoaService.updateSoa(model.id, model, function () {
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });
            return promise.promise;
        };

        $scope.sortByCode = function() {
          if ($scope.soa_measures.query.order == 'measure') {
            $scope.soa_measures.query.order = '-measure';
          }else {
            $scope.soa_measures.query.order = 'measure';
          }
        }

        $scope.import = function (ev,referential) {
          var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
          var importOptions = ['remarks', 'evidences', 'actions'];
          var justificationOptions = ['EX','LR', 'CO', 'BR', 'BP', 'RRA'];
          var avg = [];

          $mdDialog.show({
              controller: ['$scope', '$mdDialog', 'referentials', 'referential', 'anrId', importSoaFromDialogCtrl],
              templateUrl: 'views/anr/import.soa.html',
              targetEvent: ev,
              preserveScope: false,
              scope: $scope.$dialogScope.$new(),
              clickOutsideToClose: false,
              fullscreen: useFullScreen,
              locals: {
                'referentials' : $scope.referentials.items['referentials'],
                'referential' : referential,
                'anrId': $scope.model.anr.id
              }
          })
              .then(function (importSoa) {
                MeasureMeasureService.getMeasuresMeasures().then(function (data) {
                  var measuresLinked = data['measuresmeasures'];
                  ClientSoaService.getSoas({referential:$scope.referential_uniqid }).then(function(data){
                    var childrens = data['soaMeasures'];
                    ClientSoaService.getSoas({referential: importSoa.refSelected }).then(function(data){
                      var fathers = data['soaMeasures'];
                      for (var i = 0; i < measuresLinked.length; i++) {
                        fathers.forEach((father)=>childrens.forEach((child=>{
                          if (father.measure.uniqid == measuresLinked[i].father.uniqid) {
                            if (child.measure.uniqid == measuresLinked[i].child.uniqid) {

                              importOptions.forEach(function(option){
                                if (importSoa[option] && father[option]) {
                                  if (child[option]) {
                                    child[option] += "\r\n" + father[option] ;
                                  }else {
                                      child[option] = father[option];
                                  }
                                }
                              });

                              if (importSoa.justification) {
                                justificationOptions.forEach(function(option){
                                  if (father[option] == 1) {
                                    child[option] = father[option];
                                  }
                                });
                              }

                              if (importSoa.compliance && father['compliance']) {

                                switch (importSoa.calcul) {
                                  case 'average':
                                  if (child['compliance']) {
                                    avg.push(child['compliance'] , father['compliance']);
                                    var sum = avg.reduce(function(a, b) { return a + b; }, 0);
                                    child['compliance'] = Math.round(sum / avg.length);
                                  }else {
                                      child['compliance'] = father['compliance']
                                  }
                                  break;
                                  default:
                                    if (child['compliance'] && child['compliance'] > father['compliance']) {
                                        child['compliance'] = father['compliance'];
                                    }else if (child['compliance'] && child['compliance'] < father['compliance']) {

                                    }else {
                                        child['compliance'] = father['compliance']
                                    }
                                }
                              }
                            }
                          }
                        })));
                      }

                      for (var i = 0; i < childrens.length; i++) {
                        ClientSoaService.updateSoa(childrens[i].id, childrens[i], function () {
                            if (i = childrens.length - 1) {
                              $scope.updateSoaMeasures();
                            }
                        });
                      }
                    })
                  });
                });
              });
        }

        $scope.export = function () {
            finalArray=[];
            recLine = 0;
            finalArray[recLine]= gettextCatalog.getString('Category');
            finalArray[recLine]+=','+gettextCatalog.getString('Ref.');
            finalArray[recLine]+=','+gettextCatalog.getString('Control');
            finalArray[recLine]+=','+gettextCatalog.getString('Inclusion/Exclusion');
            finalArray[recLine]+=','+gettextCatalog.getString('Remarks');
            finalArray[recLine]+=','+gettextCatalog.getString('Evidences');
            finalArray[recLine]+=','+gettextCatalog.getString('Actions');
            finalArray[recLine]+=','+gettextCatalog.getString('Level of compliance');

            soas = $scope.soa_measures.items['soaMeasures'];
            for (soa in soas) {
                recLine++;

                finalArray[recLine]="\""+$scope._langField(soas[soa].measure.category,'label')+"\"";
                finalArray[recLine]+=','+"\""+soas[soa].measure.code+"\"";
                finalArray[recLine]+=','+"\""+$scope._langField(soas[soa].measure,'label')+"\"";

                //Inclusion/exclusion

                finalArray[recLine]+=','+"\""+' ';
                if(soas[soa].EX == 1)
                    finalArray[recLine] += gettextCatalog.getString('EX') + "- ";
                if(soas[soa].LR == 1)
                    finalArray[recLine] += gettextCatalog.getString('LR') + "- ";
                if(soas[soa].CO == 1)
                    finalArray[recLine] += gettextCatalog.getString('CO') + "- ";
                if(soas[soa].BR == 1)
                    finalArray[recLine] += gettextCatalog.getString('BR') + "- ";
                if(soas[soa].BP == 1)
                    finalArray[recLine] += gettextCatalog.getString('BP') + "- ";
                if(soas[soa].RRA == 1)
                    finalArray[recLine] += gettextCatalog.getString('RRA');
                finalArray[recLine] += "\"";

                // Remarks
                if(soas[soa].remarks==null)
                    finalArray[recLine] += ','+"\""+' '+"\"";
                else
                    finalArray[recLine] += ','+"\""+soas[soa].remarks+"\"";

                // evidences
                if(soas[soa].evidences==null)
                    finalArray[recLine] += ','+"\""+' '+"\"";
                else
                    finalArray[recLine] += ','+"\""+soas[soa].evidences+"\"";

                // actions
                if (soas[soa].actions==null)
                    finalArray[recLine] += ','+"\""+' '+"\"";
                else
                    finalArray[recLine] += ','+"\""+soas[soa].actions+"\"";

                // compliance
                if(soas[soa].compliance==null || soas[soa].EX==1)
                    finalArray[recLine] += ','+"\""+' '+"\"";
                else {
                    if(soas[soa].compliance == 1)
                        finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Initial') + "\"";
                    if(soas[soa].compliance == 2)
                        finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Developing') + "\"";
                    if(soas[soa].compliance == 3)
                        finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Defined') + "\"";
                    if(soas[soa].compliance == 4)
                        finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Managed') + "\"";
                    if(soas[soa].compliance == 5)
                        finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Optimized') + "\"";
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
            link.setAttribute("download", "soaslist.csv");
            document.body.appendChild(link);
            link.click();  // This will download the data file named "soaslist.csv".
        };
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

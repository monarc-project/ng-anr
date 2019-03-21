(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state', '$stateParams', 'MeasureService',
            'SOACategoryService' , 'ClientSoaService',  '$q', 'ReferentialService', 'TableHelperService', 'MeasureMeasureService',
            AnrSoaCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY
     */
    function AnrSoaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, $stateParams, MeasureService, SOACategoryService,
                                  ClientSoaService,  $q, ReferentialService, TableHelperService, MeasureMeasureService) {

        $scope.updateSoaReferentials = function () {
            $scope.soa_measures = [];
            $scope.updatingReferentials = false;
            ReferentialService.getReferentials({order: 'createdAt'}).then(function (data) {
                $scope.referentials.items = data;
                $scope.referentials.items.referentials.forEach(function (ref){
                  let uuid = ref.uuid;
                  $scope.soa_measures[uuid] = TableHelperService.build('m.code', 20, 1, '');
                  $scope.soa_measures[uuid].selectedCategory = 0;
                });
                if (!$scope.referential_uuid && $scope.referentials.items.referentials.length > 0) {
                  $scope.referential_uuid = $scope.referentials.items.referentials[0].uuid;
                }
                $scope.selectReferential($scope.referential_uuid);
                $scope.updatingReferentials = true;
            })
        };

        $scope.updateSoaReferentials();

        $rootScope.$on('referentialsUpdated', function () {
            $scope.referentialsUpdated = true;
         });

         $rootScope.$on('controlsUpdated', function () {
             $scope.updateSoaMeasures();
          });

        $scope.selectReferential = function (referentialId) {
            $scope.referential_uuid = referentialId;
            $scope.updateSoaMeasures();
            $scope.updateCategories(referentialId);

            $scope.$watchGroup(["soa_measures["+ "'" + referentialId + "'" +"].selectedCategory" ,
                                "soa_measures["+ "'" + referentialId + "'" +"].query.filter",
                                "soa_measures["+ "'" + referentialId + "'" +"].query.order"], function() {

                  $scope.updateSoaMeasures();
            });
            $scope.step = { // Deliverable data
              num:5,
              referential : $scope.referential_uuid
             };
        };

        $scope.$watch('referentialsUpdated', function() {
          if ($scope.referentialsUpdated) {
            $scope.updateSoaReferentials();
            $scope.referentialsUpdated = false
          }
        });

        $scope.updateSoaMeasures = function () {
            $scope.updatingMeasures = false;
            var query = angular.copy($scope.soa_measures[$scope.referential_uuid].query);
            query.category = $scope.soa_measures[$scope.referential_uuid].selectedCategory;
            query.referential = $scope.referential_uuid;

            if ($scope.soa_measures[$scope.referential_uuid].previousQueryOrder != $scope.soa_measures[$scope.referential_uuid].query.order) {
                $scope.soa_measures[$scope.referential_uuid].query.page = query.page = 1;
                $scope.soa_measures[$scope.referential_uuid].previousQueryOrder = $scope.soa_measures[$scope.referential_uuid].query.order;
            }

            $scope.soa_measures[$scope.referential_uuid].promise = ClientSoaService.getSoas(query);
            $scope.soa_measures[$scope.referential_uuid].promise.then(
                function (data) {
                    $scope.soa_measures[$scope.referential_uuid].items = data;
                    $scope.updatingMeasures = true;
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
          if ($scope.soa_measures[$scope.referential_uuid].query.order == 'm.code') { // set m.code because it's a joined table and his alias is m for measure
            $scope.soa_measures[$scope.referential_uuid].query.order = '-m.code';
          }else {
            $scope.soa_measures[$scope.referential_uuid].query.order = 'm.code';
          }
        }

        $scope.goToSoaSheet = function (measure) {
            $state.get('main.project.anr.soa.sheet').data = measure;
            $rootScope.$broadcast('soaSheet', measure);
            $state.transitionTo('main.project.anr.soa.sheet', {modelId: $stateParams.modelId},{inherit:true,notify:true,reload:false,location:'replace'});
            $scope.display.anrSelectedTabIndex = 5;
        };

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
                  ClientSoaService.getSoas({referential:$scope.referential_uuid }).then(function(data){
                    var childrens = data['soaMeasures'];
                    ClientSoaService.getSoas({referential: importSoa.refSelected }).then(function(data){
                      var fathers = data['soaMeasures'];
                      for (var i = 0; i < measuresLinked.length; i++) {
                        fathers.forEach((father)=>childrens.forEach((child=>{
                          if (father.measure.uuid == measuresLinked[i].father) {
                            if (child.measure.uuid == measuresLinked[i].child) {

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
                                    if (child['EX'] && father[option] != 'EX') {
                                      child['EX'] = 0;
                                    }
                                    child[option] = father[option];
                                  }
                                });
                              }

                              if (importSoa.compliance && father['compliance'] && !child['EX']) {

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

                        ClientSoaService.updateSoa(null,childrens, function () {
                              $scope.updateSoaMeasures();
                              toastr.success(gettextCatalog.getString('The SOA has been imported successfully.'),
                                  gettextCatalog.getString('Import successful'));
                        });
                    })
                  });
                });
              });
        }

        $scope.export = function () {
            finalArray=[];
            recLine = 0;
            finalArray[recLine]= gettextCatalog.getString('Category');
            finalArray[recLine]+=','+gettextCatalog.getString('Code');
            finalArray[recLine]+=','+gettextCatalog.getString('Control');
            finalArray[recLine]+=','+gettextCatalog.getString('Inclusion/Exclusion');
            finalArray[recLine]+=','+gettextCatalog.getString('Remarks/Justification');
            finalArray[recLine]+=','+gettextCatalog.getString('Evidences');
            finalArray[recLine]+=','+gettextCatalog.getString('Actions');
            finalArray[recLine]+=','+gettextCatalog.getString('Level of compliance');

            ClientSoaService.getSoas({referential:$scope.referential_uuid, order: 'm.code'}).then(function (data) {
                soas = data['soaMeasures'];
                for (soa in soas) {
                    recLine++;

                    finalArray[recLine]="\""+$scope._langField(soas[soa].measure.category,'label')+"\"";
                    finalArray[recLine]+=','+"\""+soas[soa].measure.code+"\"";
                    finalArray[recLine]+=','+"\""+$scope._langField(soas[soa].measure,'label')+"\"";

                    //Inclusion/exclusion

                    finalArray[recLine]+=','+"\""+' ';
                    if(soas[soa].EX == 1)
                        finalArray[recLine] += gettextCatalog.getString('Excluded');
                    if(soas[soa].LR == 1)
                        finalArray[recLine] += gettextCatalog.getString('Legal requirements') + "  ";
                    if(soas[soa].CO == 1)
                        finalArray[recLine] += gettextCatalog.getString('Contractual obligations') + "  ";
                    if(soas[soa].BR == 1)
                        finalArray[recLine] += gettextCatalog.getString('Business requirements') + "  ";
                    if(soas[soa].BP == 1)
                        finalArray[recLine] += gettextCatalog.getString('Best practices') + "  ";
                    if(soas[soa].RRA == 1)
                        finalArray[recLine] += gettextCatalog.getString('Results of risk assessment') + "  ";
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
                            finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Managed') + "\"";
                        if(soas[soa].compliance == 3)
                            finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Defined') + "\"";
                        if(soas[soa].compliance == 4)
                            finalArray[recLine] += ',' + "\"" + gettextCatalog.getString('Quantitatively Managed') + "\"";
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
                link.setAttribute("download", "soa.csv");
                document.body.appendChild(link);
                link.click();  // This will download the data file named "soa.csv".
            });

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

(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaSheetCtrl', [
            '$scope', '$rootScope', 'gettextCatalog', '$state', '$stateParams',
            AnrSoaSheetCtrl]);

    /**
    * ANR > STATEMENT OF APPLICABILITY > Risks
    */
    function AnrSoaSheetCtrl($scope, $rootScope, gettextCatalog, $state, $stateParams) {

        $scope.soaSheetfirstRefresh = true;

        getSoaRisks = function(measure){
          $scope.soaMeasureSheet = measure;
          $scope.soaMeasureRisks = measure.amvs;
          $scope.soaMeasureOpRisks = measure.rolfRisks;
        };


        // Get risks related to SOA Measure
        var soaSheetListener = $rootScope.$on('soaSheet', function (event, measure) {
          if (!$scope.soaSheetfirstRefresh) {
              getSoaRisks(measure);
          }
         });

         if ($scope.soaSheetfirstRefresh) {
           if ($state.current.data) {
             getSoaRisks($state.current.data);
           }else {
             $state.transitionTo('main.project.anr.soa',{modelId:$stateParams.modelId},{inherit:true,notify:true,reload:false,location:'replace'});
             $scope.display.anrSelectedTabIndex = 5;
             $scope.soaSheetfirstRefresh = false;
           }
         }

        // export to CSV
        $scope.exportSoaSheet = function (KindOfRisk) {

          finalArray=[];
          recLine = 0;
          if (KindOfRisk === 'InfoRisk') {
            finalArray[recLine]= gettextCatalog.getString('Asset');
            finalArray[recLine]+=','+gettextCatalog.getString('C Impact');
            finalArray[recLine]+=','+gettextCatalog.getString('I Impact');
            finalArray[recLine]+=','+gettextCatalog.getString('A Impact');
            finalArray[recLine]+=','+gettextCatalog.getString('Threat');
            finalArray[recLine]+=','+gettextCatalog.getString('Prob.');
            finalArray[recLine]+=','+gettextCatalog.getString('Vulnerability');
            finalArray[recLine]+=','+gettextCatalog.getString('Existing controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Qualif.');
            finalArray[recLine]+=','+gettextCatalog.getString('Current risk')+' C';
            finalArray[recLine]+=','+gettextCatalog.getString('Current risk')+' I';
            finalArray[recLine]+=','+gettextCatalog.getString('Current risk')+' '+gettextCatalog.getString('A');
            finalArray[recLine]+=','+gettextCatalog.getString('Treatment');
            finalArray[recLine]+=','+gettextCatalog.getString('Residual risk');

            risks = $scope.soaMeasureRisks;

            for (risk in risks) {
                recLine++;
                finalArray[recLine]="\""+$scope._langField(risks[risk],'instanceName')	+"\"";
                if (risks[risk].c_impact =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].c_impact+"\"";}

                if (risks[risk].i_impact =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].i_impact+"\"";}

                if (risks[risk].d_impact =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].d_impact+"\"";}

                finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'threatLabel')+"\"";

                if (risks[risk].threatRate =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].threatRate+"\"";}

                finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'vulnLabel')+"\"";

                if (risks[risk].comment ==null) {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].comment+"\"";}

                if (risks[risk].vulnerabilityRate =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].vulnerabilityRate+"\"";}

                if (risks[risk].c_risk =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].c_risk+"\"";}

                if (risks[risk].i_risk =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].i_risk+"\"";}

                if (risks[risk].d_risk =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].d_risk+"\"";}
                if (risks[risk].kindOfMeasure =='1') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Reduction')+"\"";

                } else if (risks[risk].kindOfMeasure =='2') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Denied')+"\"";

                } else if (risks[risk].kindOfMeasure =='3') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Accepted')+"\"";

                } else if (risks[risk].kindOfMeasure =='4') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Shared')+"\"";

                } else {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Not treated')+"\"";
                }
                if (risks[risk].target_risk =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                } else {
                finalArray[recLine]+=','+"\""+risks[risk].target_risk+"\"";
                }
            }
          } else {
            finalArray[recLine]= gettextCatalog.getString('Asset');
            finalArray[recLine]+=','+gettextCatalog.getString('Risk description');
            if ($scope.model.anr.showRolfBrut) {
              finalArray[recLine]+=','+gettextCatalog.getString('Prob.(Inherent risk)');
              $scope.opRiskImpactScales.forEach(scale => {
                  finalArray[recLine]+=',' + scale.label + '(' + gettextCatalog.getString('Inherent risk') + ')';
              })
              finalArray[recLine]+=','+gettextCatalog.getString('Inherent risk');
            }
            finalArray[recLine]+=','+gettextCatalog.getString('Prob.(Net risk)');
            $scope.opRiskImpactScales.forEach(scale => {
                finalArray[recLine]+=',' + scale.label + '(' + gettextCatalog.getString('Net risk') + ')';
            })
            finalArray[recLine]+=','+gettextCatalog.getString('Current risk (Net risk)');
            finalArray[recLine]+=','+gettextCatalog.getString('Existing controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Treatment');
            finalArray[recLine]+=','+gettextCatalog.getString('Residual risk');

            risks = $scope.soaMeasureOpRisks;

            for (risk in risks) {
                recLine++;
                finalArray[recLine]="\""+$scope._langField(risks[risk]['instanceInfos'],'name')	+"\"";
                finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'description')+"\"";
                if ($scope.model.anr.showRolfBrut) {
                    if (risks[risk].brutProb =='-1') {
                        finalArray[recLine]+=','+"\""+' '+"\"";
                    }else {
                        finalArray[recLine]+=','+"\""+risks[risk].brutProb+"\"";
                    }

                    for(scale in risks[risk].scales) {
                        if (risks[risk].scales[scale].brutValue == -1) {
                            finalArray[recLine]+=','+"\""+' '+"\"";
                        }else {
                            finalArray[recLine]+=','+"\""+risks[risk].scales[scale].brutValue+"\"";
                        }
                    }

                    if (risks[risk].cacheBrutRisk =='-1' ) {
                        finalArray[recLine]+=','+"\""+' '+"\"";
                    }else {
                        finalArray[recLine]+=','+"\""+risks[risk].cacheBrutRisk+"\"";
                    }
                }

                if (risks[risk].netProb =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                }else {
                    finalArray[recLine]+=','+"\""+risks[risk].netProb+"\"";
                }

                for(scale in risks[risk].scales) {
                    if (risks[risk].scales[scale].netValue == -1) {
                        finalArray[recLine]+=','+"\""+' '+"\"";
                    }else {
                        finalArray[recLine]+=','+"\""+risks[risk].scales[scale].netValue+"\"";
                    }
                }

                if (risks[risk].icacheNetRisk =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                }else {
                    finalArray[recLine]+=','+"\""+risks[risk].cacheNetRisk+"\"";
                }

                if (risks[risk].comment ==null) {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                }else {
                    finalArray[recLine]+=','+"\""+risks[risk].comment+"\"";
                }

                if (risks[risk].kindOfMeasure =='1') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Reduction')+"\"";
                }else if (risks[risk].kindOfMeasure =='2') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Denied')+"\"";
                }else if (risks[risk].kindOfMeasure =='3') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Accepted')+"\"";
                }else if (risks[risk].kindOfMeasure =='4') {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Shared')+"\"";
                }else {
                    finalArray[recLine]+=','+"\""+gettextCatalog.getString('Not treated')+"\"";
                }

                if (risks[risk].cacheTargetedRisk =='-1' && risks[risk].cacheNetRisk =='-1') {
                    finalArray[recLine]+=','+"\""+' '+"\"";
                }else if (risks[risk].cacheTargetedRisk =='-1') {
                    finalArray[recLine]+=','+"\""+risks[risk].cacheNetRisk+"\"";
                }else {
                    finalArray[recLine]+=','+"\""+risks[risk].cacheTargetedRisk+"\"";
                }
            }
          }

            let csvContent = "data:text/csv;charset=UTF-8,\uFEFF";
            for (var j = 0; j < finalArray.length; ++j) {
                let row = finalArray[j].toString().replace(/\n|\r/g,' ') +"," + "\r\n";
                csvContent += row ;
            }

            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", (KindOfRisk === 'InfoRisk') ? "soaInformationRisks.csv" : "soaOperationalRisks.csv");
            document.body.appendChild(link);
            link.click(); // This will download the data file named "soaRisks.csv".
        };

        $scope.backToList = function () {
          $state.transitionTo('main.project.anr.soa',{modelId:$stateParams.modelId},{inherit:true,notify:true,reload:false,location:'replace'});
          $scope.display.anrSelectedTabIndex = 5;
          $scope.soaSheetfirstRefresh = false;
          $scope.$on('$destroy', soaSheetListener);
        };

        $scope.goToInstance = function (instId, KindOfRisk) {
          $state.transitionTo('main.project.anr.instance', {modelId: $stateParams.modelId, instId: instId},{inherit:true,notify:true,reload:false,location:'replace'});
          $scope.display.anrSelectedTabIndex = 0;
          if (KindOfRisk === 'OperRisk') {
            $scope.ToolsAnrService.currentTab = 1;
          }
        };
    }
})();

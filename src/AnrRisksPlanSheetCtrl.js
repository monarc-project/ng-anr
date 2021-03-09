(function () {

    angular
        .module('AnrModule')
        .controller('AnrRisksPlanSheetCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', 'gettextCatalog', '$state', 'TreatmentPlanService',
            'ClientRecommandationService', '$q',
            AnrRisksPlanSheetCtrl
        ]);

    /**
     * ANR > RISKS PLAN PROCESSING
     */
    function AnrRisksPlanSheetCtrl($scope, toastr, $mdMedia, $mdDialog, $stateParams, gettextCatalog, $state,
                                   TreatmentPlanService, ClientRecommandationService, $q) {

        $scope.rec_risks = [];

        var updateRecs = function () {
            ClientRecommandationService.getRecommandation($stateParams.modelId, $stateParams.recId).then(function (data) {
                $scope.rec = data;
            });
            ClientRecommandationService.getRecommandationRisks($stateParams.modelId, $stateParams.recId).then(function (data) {
                // Filter out non-treated risks
                var recrisks = data['recommandations-risks'];
                $scope.rec_risks = [];
                $scope.rec_risksOp = [];

                for (var i in recrisks) {
                    var risk = recrisks[i];
                    if (risk.instanceRisk && risk.instanceRisk.kindOfMeasure != 5)   {
                        $scope.rec_risks.push(risk);
                    }
                    if(risk.instanceRiskOp && risk.instanceRiskOp.kindOfMeasure != 5){
                      $scope.rec_risksOp.push(risk);
                    }
                }
                //backToList when is the last validation of recommendation
                if ($scope.rec_risks.length == 0 && $scope.rec_risksOp.length == 0 ) {
                    $scope.backToList();
                }
            })

        }

        updateRecs();

        $scope.backToList = function () {
            $state.transitionTo('main.project.anr.risksplan', {modelId: $stateParams.modelId});
        };

        $scope.validate = function (ev, risk) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'recommendation', 'risk', ValidateMeasureDialog],
                templateUrl: 'views/anr/validate.recommandation.html',
                targetEvent: ev,
                preserveScope: false,
                scope: $scope.$dialogScope.$new(),
                clickOutsideToClose: false,
                fullscreen: useFullScreen,
                locals: {
                    recommendation: $scope.rec,
                    risk: risk
                }
            }).then(function (impl) {
                ClientRecommandationService.validateRecommandationRisk($scope.model.anr.id, risk.id, impl, function () {
                    toastr.success(gettextCatalog.getString("The recommendation has been successfully validated."));
                    updateRecs();
                })
            }, function (reject) {
              $scope.handleRejectionDialog(reject);
            });
        };

        $scope.onTableEdited = function (field, name) {
            var params = {};
            params[name] = field[name];

            ClientRecommandationService.updateRecommandationRisk($scope.model.anr.id, field.id, params, function () {

            });
            return true;
        };

        $scope.exportRiskPlanSheet = function () {
          finalArray=[];
          recLine = 0;

          risks = $scope.rec_risks;
          if (risks.length != 0)
          {
            finalArray[recLine]= gettextCatalog.getString('Asset');
            finalArray[recLine]+=','+gettextCatalog.getString('Threat');
            finalArray[recLine]+=','+gettextCatalog.getString('Vulnerability');
            finalArray[recLine]+=','+gettextCatalog.getString('Existing controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Current risk');
            finalArray[recLine]+=','+gettextCatalog.getString('New controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Residual risk');


            for (rec in risks)
            {
              recLine++;
              finalArray[recLine]="\""+$scope._langField(risks[rec].instance,'name')+"\"";
              finalArray[recLine]+=','+"\""+$scope._langField(risks[rec].threat,'label')+"\"";
              finalArray[recLine]+=','+"\""+$scope._langField(risks[rec].vulnerability,'label')+"\"";
              if(risks[rec].instanceRisk.comment != null)
                finalArray[recLine]+=','+"\""+risks[rec].instanceRisk.comment+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
              if(risks[rec].instanceRisk.cacheMaxRisk != -1)
                finalArray[recLine]+=','+"\""+risks[rec].instanceRisk.cacheMaxRisk+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
              if(risks[rec].instanceRisk.commentAfter != null)
                finalArray[recLine]+=','+"\""+risks[rec].instanceRisk.commentAfter+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
              if(risks[rec].instanceRisk.cacheTargetedRisk != -1)
                finalArray[recLine]+=','+"\""+risks[rec].instanceRisk.cacheTargetedRisk+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
            }
            recLine++;
          }

          risksOP = $scope.rec_risksOp;
          if(risksOP.length !=0)
          {
            finalArray[recLine]= gettextCatalog.getString('Asset');
            finalArray[recLine]+=','+gettextCatalog.getString('Risk description');
            finalArray[recLine]+=','+gettextCatalog.getString('Existing controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Current risk');
            finalArray[recLine]+=','+gettextCatalog.getString('New controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Residual risk');
            for (rec in risksOP)
            {
              recLine++;
              finalArray[recLine]="\""+$scope._langField(risksOP[rec].instance,'name')+"\"";
              finalArray[recLine]+=','+"\""+$scope._langField(risksOP[rec].instanceRiskOp,'riskCacheLabel')+"\"";
              if(risksOP[rec].instanceRiskOp.comment != null)
                finalArray[recLine]+=','+"\""+risksOP[rec].instanceRiskOp.comment+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
              if(risksOP[rec].instanceRiskOp.cacheNetRisk != -1)
                finalArray[recLine]+=','+"\""+risksOP[rec].instanceRiskOp.cacheNetRisk+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
              if(risksOP[rec].commentAfter != null)
                finalArray[recLine]+=','+"\""+risksOP[rec].commentAfter+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
              if(risksOP[rec].instanceRiskOp.cacheTargetedRisk != -1)
                finalArray[recLine]+=','+"\""+risksOP[rec].instanceRiskOp.cacheTargetedRisk+"\"";
              else
                finalArray[recLine]+=','+"\""+' '+"\"";
            }
          }
          let csvContent = "data:text/csv;charset=UTF-8,\uFEFF";
          for(var j = 0; j < finalArray.length; ++j)
              {
               let row = finalArray[j].toString().replace(/\n|\r/g,' ')+","+"\r\n";
               csvContent += row ;
              }


          var encodedUri = encodeURI(csvContent);
          var link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "recommendationrisks.csv");
          document.body.appendChild(link); // Required for FF
          link.click(); // This will download the data file named "my_data.csv".
        };

    }


    function ValidateMeasureDialog($scope, $mdDialog, recommendation, risk) {
        $scope.rec = recommendation;
        $scope.risk = risk;
        $scope.impl = {comment: null};

        $scope.create = function () {
            $mdDialog.hide($scope.impl);
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        }
    }



})();

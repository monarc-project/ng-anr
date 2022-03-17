(function () {

    angular
        .module('AnrModule')
        .controller('AnrRisksPlanHistoryCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', '$stateParams', 'gettextCatalog',
            '$state', 'TreatmentPlanService','ClientRecommandationService', 'DownloadService',
            '$q', AnrRisksPlanHistoryCtrl
        ]);

    /**
     * ANR > RISKS PLAN PROCESSING > HISTORY
     */


function AnrRisksPlanHistoryCtrl($scope, toastr, $mdMedia, $mdDialog, $stateParams, gettextCatalog,
                                $state, TreatmentPlanService, ClientRecommandationService, DownloadService,
                                $q) {

        $scope.backToList = function () {
            $state.transitionTo('main.project.anr.risksplan', {modelId: $stateParams.modelId});
        };

        $scope.formatDate = function (param) {
            if (param != null) {
                return param.substr(0, 10);
            }
        };

        $scope.treatmentStr = function (treatment) {
            switch (parseInt(treatment)) {
                case 1: return 'Reduction';
                case 2: return 'Denied';
                case 3: return 'Accepted';
                case 4: return 'Shared';
                default: return 'Not treated';
            }
        };

        ClientRecommandationService.getRecommandationHistory($stateParams.modelId).then(function (data) {
            $scope.history = data['recommandations-historics'];

        })

        $scope.exportHistory = function () {
          //updateRecs();
          finalArray=[];
          recLine = 0;

            finalArray[recLine]= gettextCatalog.getString('By');
            finalArray[recLine]+=','+gettextCatalog.getString('Recommendation');
            finalArray[recLine]+=','+gettextCatalog.getString('Comment');
            finalArray[recLine]+=','+gettextCatalog.getString('Deadline');
            finalArray[recLine]+=','+gettextCatalog.getString('Validation date:');
            finalArray[recLine]+=','+gettextCatalog.getString('Manager');
            finalArray[recLine]+=','+gettextCatalog.getString('Asset');
            finalArray[recLine]+=','+gettextCatalog.getString('Threat');
            finalArray[recLine]+=','+gettextCatalog.getString('Vulnerability');
            finalArray[recLine]+=','+gettextCatalog.getString('Risk description');
            finalArray[recLine]+=','+gettextCatalog.getString('Kind of treatment');
            finalArray[recLine]+=','+gettextCatalog.getString('Existing controls');
            finalArray[recLine]+=','+gettextCatalog.getString('New controls');
            finalArray[recLine]+=','+gettextCatalog.getString('Implementation comment');
            finalArray[recLine]+=','+gettextCatalog.getString('Risk before');
            finalArray[recLine]+=','+gettextCatalog.getString('Risk after');

          entries = $scope.history;

          for (entry in entries)
          {
            recLine++;
            finalArray[recLine]="\""+entries[entry].creator+"\"";
            finalArray[recLine]+=','+"\""+entries[entry].recoCode +' - '+entries[entry].recoDescription+"\"";
            if(entries[entry].recoComment !=null)
              finalArray[recLine]+=','+"\""+entries[entry].recoComment+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].recoDuedate !=null)
              finalArray[recLine]+=','+"\""+$scope.formatDate(entries[entry].recoDuedate.date)+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].createdAt !=null)
              finalArray[recLine]+=','+"\""+$scope.formatDate(entries[entry].createdAt.date)+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].recoResponsable !=null)
              finalArray[recLine]+=','+"\""+entries[entry].recoResponsable+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            finalArray[recLine]+=','+"\""+entries[entry].riskInstance+"\"";
            if(entries[entry].riskThreat !=null)
              finalArray[recLine]+=','+"\""+entries[entry].riskThreat+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].riskVul !=null)
            finalArray[recLine]+=','+"\""+entries[entry].riskVul+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].riskOpDescription !=null)
              finalArray[recLine]+=','+"\""+entries[entry].riskOpDescription+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            finalArray[recLine]+=','+"\""+gettextCatalog.getString($scope.treatmentStr(entries[entry].riskKindOfMeasure))+"\"";
            if(entries[entry].riskCommentBefore !=null)
              finalArray[recLine]+=','+"\""+entries[entry].riskCommentBefore+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].riskCommentAfter !=null)
              finalArray[recLine]+=','+"\""+entries[entry].riskCommentAfter+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].implComment !=null)
              finalArray[recLine]+=','+"\""+entries[entry].implComment+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].riskMaxRiskBefore != -1)
              finalArray[recLine]+=','+"\""+entries[entry].riskMaxRiskBefore+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
            if(entries[entry].riskMaxRiskAfter != -1)
              finalArray[recLine]+=','+"\""+entries[entry].riskMaxRiskAfter+"\"";
            else
              finalArray[recLine]+=','+"\""+' '+"\"";
          }
          let csvContent = "";
          for(var j = 0; j < finalArray.length; ++j)
              {
               let row = finalArray[j].toString().replace(/\n|\r/g,' ')+","+"\r\n";
               csvContent += row ;
              }

          DownloadService.downloadCSV(csvContent, 'implementationhistory.csv', 'text/csv');
        };
    }

})();

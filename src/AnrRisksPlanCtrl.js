(function () {

    angular
        .module('AnrModule')
        .controller('AnrRisksPlanCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog', 'gettextCatalog', '$state', 'TreatmentPlanService',
            'ClientRecommendationService', 'DownloadService', '$q',
            AnrRisksPlanCtrl
        ]);

    /**
     * ANR > RISKS PLAN PROCESSING
     */
    function AnrRisksPlanCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, TreatmentPlanService,
                              ClientRecommendationService, DownloadService, $q) {
        TreatmentPlanService.getTreatmentPlans({anr: $scope.model.anr.id}).then(function (data) {
            $scope.recommendations = data['recommendations-risks'];
        });

        $scope.clearDate = function (model) {
            this.rec.duedate = null;

            $scope.onTableEdited(this.rec, 'duedate');
        }

        $scope.onTableEdited = function (model, name) {
            var promise = $q.defer();

            var params = {
                uuid: model.uuid,
            };

            if (name == 'duedate') {
                if (model[name] != null) {
                    new_date = new Date(model[name]);
                    model[name] = new_date.toDateString();
                } else {
                    model[name] = '';
                }
            }
            params[name] = model[name];

            ClientRecommendationService.updateRecommendation(params, function () {
                promise.resolve(true);
            }, function () {
                promise.reject(false);
            });

            return promise.promise;
        };

        $scope.export = function () {
          finalArray=[];
          recLine = 0;
          finalArray[recLine]= gettextCatalog.getString('Recommendation');
          finalArray[recLine]+=','+gettextCatalog.getString('Description');
          finalArray[recLine]+=','+gettextCatalog.getString('Imp.');
          finalArray[recLine]+=','+gettextCatalog.getString('Comment');
          finalArray[recLine]+=','+gettextCatalog.getString('Manager');
          finalArray[recLine]+=','+gettextCatalog.getString('Deadline');
          finalArray[recLine]+=','+gettextCatalog.getString('Status');

          recommendations = $scope.recommendations;
          for (rec in recommendations)
          {
            recLine++;
            finalArray[recLine]="\""+recommendations[rec].code+"\"";
            finalArray[recLine]+=','+"\""+recommendations[rec].description+"\"";
            finalArray[recLine]+=','+"\""+recommendations[rec].importance+"\"";
            if(recommendations[rec].comment==null)
              finalArray[recLine]+=','+"\""+' '+"\"";
            else
              finalArray[recLine]+=','+"\""+recommendations[rec].comment+"\"";
            if(recommendations[rec].responsable==null)
              finalArray[recLine]+=','+"\""+' '+"\"";
            else
              finalArray[recLine]+=','+"\""+recommendations[rec].responsable+"\"";
            finalArray[recLine]+=','+"\""+recommendations[rec].duedate+"\"";
            if(recommendations[rec].counterTreated > 0)
              finalArray[recLine]+=','+gettextCatalog.getString('In progress');
            else
              finalArray[recLine]+=','+gettextCatalog.getString('Coming');
          }

          let csvContent = "";
          for(var j = 0; j < finalArray.length; ++j)
              {
               let row = finalArray[j].toString().replace(/\n|\r/g,' ')+","+"\r\n";
               csvContent += row ;
              }

          DownloadService.downloadCSV(csvContent, 'recommendationslist.csv', 'text/csv');
        };
    }

})();

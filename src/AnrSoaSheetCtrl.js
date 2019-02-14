(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaSheetCtrl', [
            '$scope', 'gettextCatalog', '$stateParams', 'AnrService', 'MeasureService', '$q',
            AnrSoaSheetCtrl]);

    /**
    * ANR > STATEMENT OF APPLICABILITY > Risks
    */
    function AnrSoaSheetCtrl($scope, gettextCatalog, $stateParams, AnrService, MeasureService, $q) {

        $scope.soaMeasureAmvIds = [];
        $scope.soaMeasureRolfRiskIds = [];

        getSoaRisks = function(Measureuuid){
            var promise = $q.defer();
            MeasureService.getMeasure(Measureuuid).then(function (measure) {
              $scope.soaMeasureSheet = measure;
              console.log(measure);
              if (measure.amvs) {
                for (var i = 0; i < measure.amvs.length; i++) {
                  $scope.soaMeasureAmvIds.push(measure.amvs[i].id);
                }
              }
              if (measure.rolfRisks) {
                for (var i = 0; i < measure.rolfRisks.length; i++) {
                  $scope.soaMeasureRolfRiskIds.push(measure.rolfRisks[i].id);
                }
              }

              soa_risks_filters = {
                  limit: -1,
                  amvs : [$scope.soaMeasureAmvIds]
              };

              AnrService.getInstanceRisks($scope.model.anr.id,null,soa_risks_filters).then(function(data) {
                  $scope.soaMeasureRisks = data.risks;
              });

              soa_opRisks_filters = {
                  limit: -1,
                  rolfRisks : [$scope.soaMeasureRolfRiskIds]
              };

              AnrService.getInstanceRisksOp($scope.model.anr.id,null,soa_opRisks_filters).then(function(data) {
                  $scope.soaMeasureOpRisks = data.oprisks;
              });

              promise.resolve(true);
            });
        };

        // Get risks related to SOA Measure
        getSoaRisks($stateParams.soaId);

        // export to CSV
        $scope.exportSoaSheet = function (KindOfRisk) {
            finalArray=[];
            recLine = 0;
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

            let csvContent = "data:text/csv;charset=UTF-8,\uFEFF";
            for (var j = 0; j < finalArray.length; ++j) {
                let row = finalArray[j].toString().replace(/\n|\r/g,' ') +"," + "\r\n";
                csvContent += row ;
            }

            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "soaRisks.csv");
            document.body.appendChild(link);
            link.click(); // This will download the data file named "soaRisks.csv".
        };

        $scope.backToList = function () {
            $scope.display.anrSelectedTabIndex = 4;
        };
    }
})();

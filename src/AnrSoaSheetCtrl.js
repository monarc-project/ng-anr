(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaSheetCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state' , '$stateParams', 'ClientSoaService','AmvService', 'AnrService', '$q', '$rootScope',
            AnrSoaSheetCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY S
     */
    function AnrSoaSheetCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, $stateParams,
                                  ClientSoaService,AmvService,AnrService,  $q) {





      ClientSoaService.getSoa({anr: $scope.model.anr.id, id: $stateParams.soaId}).then(function (data) {
          $scope.soa = data;
          $scope.soaDescription = $scope._langField(data.measure,'description');
      });


      $scope.soa_risks_filters = {
        order: 'maxRisk',
        order_direction: 'desc',
        thresholds: -1,
        page: 1,
        limit: -1
        };


      // get the full list of risks
      AnrService.getInstanceRisks($scope.model.anr.id,null,$scope.soa_risks_filters).then(function(data) {
          if (!$scope.risks || data.risks.length != $scope.risks.length) {
              $scope.risks_total = data.count;
              $scope.risks = data.risks;
          } else {
              $scope.risks_total = data.count;
              for (var i = 0; i < $scope.risks.length; ++i) {
                  for (var j in $scope.risks[i]) {
                      $scope.risks[i][j] = data.risks[i][j];
                  }
              }
          }

          $scope.anr_risks_table_loading = false;
      });



      AmvService.getAmvs({anr: $scope.model.anr.id}).then(function (data) {
          $scope.amvs = data['amvs'];

      });
      $scope.empty="false";

     $scope.onTableEdited = function (model, name) {
         var promise = $q.defer();

         var params = {
             anr: $scope.model.anr.id,
             id: model.id,
         };

         params[name] = model[name];

         ClientSoaService.updateSoa(params, function () {
            promise.resolve(true);
         }, function () {
            promise.reject(false);
         });


         return promise.promise;


         };


          $scope.exportSoaSheet = function () {
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

            soa = $scope.soa;
            amvs = $scope.amvs;
            risks = $scope.risks;
            instanceCache= $scope.instanceCache;

            for (amv in amvs){
              mes2_code=mes3_code="test";
              if(amvs[amv].measure2!=null){mes2_code=amvs[amv].measure2.code;}
              if(amvs[amv].measure3!=null){mes3_code=amvs[amv].measure3.code;}

              if( amvs[amv].measure1.code == soa.measure.code || mes2_code == soa.measure.code  || mes3_code == soa.measure.code){
                    for (risk in risks){
                      if(risks[risk].amv == amvs[amv].id ){
                              recLine++;
                              for (instance in instanceCache){
                                if(instanceCache[instance].id ==risks[risk].instance){
                              finalArray[recLine]="\""+$scope._langField(instanceCache[instance],'name')	+"\"";
                                }
                              }
                              if(risks[risk].c_impact =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].c_impact+"\"";}

                              if(risks[risk].i_impact =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].i_impact+"\"";}

                              if(risks[risk].d_impact =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].d_impact+"\"";}

                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'threatLabel')+"\"";

                              if(risks[risk].threatRate =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].threatRate+"\"";}


                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'vulnLabel')+"\"";

                              if(risks[risk].comment ==null){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].comment+"\"";}

                              if(risks[risk].vulnerabilityRate =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].vulnerabilityRate+"\"";}

                              if(risks[risk].c_risk =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].c_risk+"\"";}

                              if(risks[risk].i_risk =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].i_risk+"\"";}

                              if(risks[risk].d_risk =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].d_risk+"\"";}
                              if(risks[risk].kindOfMeasure =='1'){
                                finalArray[recLine]+=','+"\""+gettextCatalog.getString('Reduction')+"\"";

                               }else if (risks[risk].kindOfMeasure =='2') {
                                finalArray[recLine]+=','+"\""+gettextCatalog.getString('Denied')+"\"";

                              }else if (risks[risk].kindOfMeasure =='3') {
                                finalArray[recLine]+=','+"\""+gettextCatalog.getString('Accepted')+"\"";

                              }else if (risks[risk].kindOfMeasure =='4') {
                                finalArray[recLine]+=','+"\""+gettextCatalog.getString('Shared')+"\"";

                              }else if (risks[risk].kindOfMeasure =='5') {
                                finalArray[recLine]+=','+"\""+gettextCatalog.getString('Not treated')+"\"";

                              }

                              if(risks[risk].target_risk =='-1'){
                                  finalArray[recLine]+=','+"\""+' '+"\"";
                              }else{
                              finalArray[recLine]+=','+"\""+risks[risk].target_risk+"\"";}
                      }
                   }
              }
            }

            let csvContent = "data:text/csv;charset=utf-8,";
            for(var j = 0; j < finalArray.length; ++j)
                {
                 let row = finalArray[j].toString()+","+"\r\n";
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
     // $state.transitionTo('main.project.anr.soa', {modelId: $scope.model.anr.id});
     $scope.display.anrSelectedTabIndex = 4;


 };


}





})();

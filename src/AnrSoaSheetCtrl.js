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
      });


      $scope.risks_filters.limit = -1;
      $scope.risks_filters.page = 1;
      //     updateInstanceRisks ? updateInstanceRisks() : updateAnrRisksTable();

      AnrService.getInstanceRisks($scope.model.anr.id,null, $scope.risks_filters).then(function(data) {
          if (!$scope.risks || data.risks.length != $scope.risks.length) {
              $scope.risks_total = data.count;
              $scope.risks = data.risks; // for the _table_risks.html partial
          } else {
              // patch up only if we already have a risks table
              // if this cause a problem, add a flag to updateInstance so that we patch only in the risks
              // table callback, and do a full refresh otherwise
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

         $scope.soaRisk = function () {

                  soa = $scope.soa;
                  amvs = $scope.amvs;
                  risks = $scope.risks;
                              var list=[];

                              for (amv in amvs){
                                if(amvs[amv].measure1.id==soa.measure  || amvs[amv].measure2.id==soa.measure  ||amvs[amv].measure3.id==soa.measure  ){
                                      for (risk in risks){
                                        if(risks[risk].amv == amvs[amv].id ){

                                                test.asset=$scope ._langField(risks[risk],'assetLabel');
                                                test.assetd=$scope._langField(risks[risk],'assetDescription');


                                                test.threat=$scope._langField(risks[risk],'threatLabel');
                                                test.threatd=$scope._langField(risks[risk],'threatDescription');

                                                list.push(test);
                                        }
                                     }

                                 }


                                 $scope.list = list;
                             }


        }
        $scope.tiret="-";
        $scope.soaRisk();

          $scope.exportSoaSheet = function () {
            finalArray=[];
            recLine = 0;
            finalArray[recLine]= gettextCatalog.getString('asset');
            finalArray[recLine]+=','+gettextCatalog.getString('asset description');
            finalArray[recLine]+=','+gettextCatalog.getString('threat');
            finalArray[recLine]+=','+gettextCatalog.getString('threat description');
            finalArray[recLine]+=','+gettextCatalog.getString('vulnerability');
            finalArray[recLine]+=','+gettextCatalog.getString('vulnerability description');

            soa = $scope.soa;
            amvs = $scope.amvs;
            risks = $scope.risks;


            for (amv in amvs){
              mes2_code=mes3_code="test";
              if(amvs[amv].measure2!=null){mes2_code=amvs[amv].measure2.code;}
              if(amvs[amv].measure3!=null){mes3_code=amvs[amv].measure3.code;}

              if( amvs[amv].measure1.code == soa.reference || mes2_code == soa.reference  || mes3_code == soa.reference){
                    for (risk in risks){
                      if(risks[risk].amv == amvs[amv].id ){
                              recLine++;
                              finalArray[recLine]="\""+$scope._langField(risks[risk],'assetLabel')	+"\"";
                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'assetDescription')+"\"";

                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'threatLabel')+"\"";
                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'threatDescription')+"\"";
                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'vulnLabel')+"\"";
                              finalArray[recLine]+=','+"\""+$scope._langField(risks[risk],'vulnDescription')+"\"";
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
            document.body.appendChild(link); // Required for FF
            link.click(); // This will download the data file named "my_data.csv".


          };


 $scope.backToList = function () {
     $state.transitionTo('main.project.anr.soa', {modelId: $scope.model.anr.id});
 };


}





})();

(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaSheetCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state' , '$stateParams', 'ClientSoaService','AmvService', '$q', '$rootScope',
            AnrSoaSheetCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY S
     */
    function AnrSoaSheetCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, $stateParams,
                                  ClientSoaService,AmvService, $q) {












      ClientSoaService.getSoa({anr: $scope.model.anr.id, id: $stateParams.soaId}).then(function (data) {
          $scope.soa = data;
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

        $scope.soaRisk();

          $scope.exportSoaSheet = function () {
            finalArray=[];
            recLine = 0;
            finalArray[recLine]= gettextCatalog.getString('asset');
            finalArray[recLine]+=','+gettextCatalog.getString('asset description');
            finalArray[recLine]+=','+gettextCatalog.getString('threat');
            finalArray[recLine]+=','+gettextCatalog.getString('threat description');

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

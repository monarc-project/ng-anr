(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaSheetCtrl', [
            '$scope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state' , '$stateParams', 'ClientSoaService','ThreatService','AssetService','AmvService', '$q', '$rootScope',
            AnrSoaSheetCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY S
     */
    function AnrSoaSheetCtrl($scope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, $stateParams,
                                  ClientSoaService,ThreatService,AssetService,AmvService, $q) {









      ThreatService.getThreats({anr: $scope.model.anr.id}).then(function (data) {
          $scope.threats = data['threats'];

      });


      ClientSoaService.getSoa({anr: $scope.model.anr.id, id: $stateParams.soaId}).then(function (data) {
          $scope.soa = data;
      });


      AssetService.getAssets({anr: $scope.model.anr.id}).then(function (data) {
          $scope.assets = data['assets'];

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
                  assets = $scope.assets;
                  threats = $scope.threats;


                             var list=[];

                              for (amv in amvs){
                                if(amvs[amv].measure1.id==soa.measure  || amvs[amv].measure2.id==soa.measure  ||amvs[amv].measure3.id==soa.measure  ){
                                      for (risk in risks){
                                        if(risks[risk].amv == amvs[amv].id ){
                                              for (asset in assets){
                                                if(assets[asset].id == amvs[amv].asset.id ){

                                                test.asset=assets[asset].label2;
                                                test.assetd=assets[asset].description2;

                                                }
                                              }
                                              for (threat in threats){
                                                if(threats[threat].id == amvs[amv].threat.id ){
                                                  test.threat=threats[threat].label2;
                                                  test.threatd=threats[threat].description2;}
                                              }

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
            assets = $scope.assets;
            threats = $scope.threats;


            for (amv in amvs){

              if( (amvs[amv].measure1.id == soa.measure)){
                    for (risk in risks){
                      if(risks[risk].amv == amvs[amv].id ){
                            for (asset in assets){
                              if(assets[asset].id == amvs[amv].asset.id ){
                              recLine++;
                              finalArray[recLine]="\""+assets[asset].label2+"\"";
                              finalArray[recLine]+=','+"\""+assets[asset].description2+"\"";

                              }
                            }
                            for (threat in threats){
                              if(threats[threat].id == amvs[amv].threat.id ){
                              finalArray[recLine]+=','+"\""+threats[threat].label2+"\"";
                              finalArray[recLine]+=','+"\""+threats[threat].description2+"\"";
                              }
                            }

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

(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state', 'ClientCategoryService' , 'ClientSoaService',  '$q',
            AnrSoaCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY
     */
    function AnrSoaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, ClientCategoryService,
                                  ClientSoaService,  $q, $filter) {




      $scope.Category=[0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      $scope.CategoryIndex=[0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      ClientCategoryService.getCategories({anr: $scope.model.anr.id}).then(function (data) {
          $scope.Categories = data['categories'];
      });


      ClientSoaService.getSoas({anr: $scope.model.anr.id}).then(function (data) {
          $scope.soas = data['Soa-list'];
          $scope.soas.sort(compare);
          $scope.totalItems = $scope.soas.length ;   //$scope.soas.length
          for (soa in $scope.soas){
          if($scope.soas[soa].compliance != null)
                  $scope.soas[soa].compliance = $scope.soas[soa].compliance + "%";


          for (Category in $scope.Categories){

              if($scope.Categories[Category].id == $scope.soas[soa].category.id)
                   $scope.Category[$scope.Categories[Category].id-1]=$scope.Category[$scope.Categories[Category].id-1]+1;

          }

          }


          for(var i=1;i<$scope.Category.length;i++){
            $scope.CategoryIndex[i]=$scope.CategoryIndex[i-1]+$scope.Category[i-1];

          }





          console.log(  $scope.Category);
          console.log(  $scope.CategoryIndex);


      });




      function compare(a, b) {

        return a.category.id-b.category.id;

      }




     $scope.onTableEdited = function (model, name) {
         console.log('onTableEdited');
         var promise = $q.defer();

         var params = {
             anr: $scope.model.anr.id,
             id: model.id,
         };
         if(name === "EX" || name === "LR" || name === "CO" || name === "BR" || name === "BP" || name === "RRA" ){
           if (model[name] == 0) { model[name]=1}else  model[name]=0;
          }



         if(name === "compliance" && model[name].replace("%","")<= 100 && model[name].replace("%", "") >= 0 ){
           params[name] = model[name];
           model[name] = model[name] + '%';
          }

          else{
                if (name != "compliance"){
                  params[name] = model[name];}
                else{
                  toastr.error(gettextCatalog.getString('the value of the compliance must be between 0 and 100 '));
                }
          }


         ClientSoaService.updateSoa(params, function () {
            promise.resolve(true);
         }, function () {
            promise.reject(false);
         });


         return promise.promise;


 };


 $scope.viewby = 10;
 $scope.currentPage = 1;
 $scope.itemsPerPage = $scope.viewby;
 $scope.maxSize = 5; //Number of pager buttons to show

 $scope.setPage = function (pageNo) {
   $scope.currentPage = pageNo;
 };

 $scope.pageChanged = function() {
   console.log('Page changed to: ' + $scope.currentPage);
 };

$scope.setItemsPerPage = function(num) {
 $scope.itemsPerPage = num;
 $scope.currentPage = 1; //reset to first page
 $scope.numPage = $scope.totalItems/num;

}












 $scope.export = function () {
   finalArray=[];
   recLine = 0;
   finalArray[recLine]= gettextCatalog.getString('Category');
   finalArray[recLine]+=','+gettextCatalog.getString('Ref');
   finalArray[recLine]+=','+gettextCatalog.getString('Control');
   finalArray[recLine]+=','+gettextCatalog.getString('Requirement');
   finalArray[recLine]+=','+gettextCatalog.getString('Inclusion/exclusion');
   finalArray[recLine]+=','+gettextCatalog.getString('Remarks');
   finalArray[recLine]+=','+gettextCatalog.getString('Evidences');
   finalArray[recLine]+=','+gettextCatalog.getString('Actions');
   finalArray[recLine]+=','+gettextCatalog.getString('level of compliance');

   soas = $scope.soas;

   for (soa in soas)
   {
     recLine++;
    // finalArray[recLine]="\""+soas[soa].id+"\"";
     finalArray[recLine]="\""+$scope._langField(soas[soa].category,'label')+"\"";
     finalArray[recLine]+=','+"\""+soas[soa].reference+"\"";
     finalArray[recLine]+=','+"\""+soas[soa].control+"\"";
     if(soas[soa].requirement==null)
        finalArray[recLine]+=','+"\""+' '+"\"";
      else
        finalArray[recLine]+=','+"\""+soas[soa].requirement;
      //Inclusion/exclusion

      finalArray[recLine]+=','+"\""+' ';
      if(soas[soa].EX == 1)      finalArray[recLine]+=gettextCatalog.getString('EX')+"- ";
      if(soas[soa].LR == 1)      finalArray[recLine]+=gettextCatalog.getString('LR')+"- ";
      if(soas[soa].CO == 1)      finalArray[recLine]+=gettextCatalog.getString('CO')+"- ";
      if(soas[soa].BR == 1)      finalArray[recLine]+=gettextCatalog.getString('BR')+"- ";
      if(soas[soa].BP == 1)      finalArray[recLine]+=gettextCatalog.getString('BP')+"- ";
      if(soas[soa].RRA == 1)      finalArray[recLine]+=gettextCatalog.getString('RRA');
      finalArray[recLine]+="\"";





    //Remarks
     if(soas[soa].remarks==null)
        finalArray[recLine]+=','+"\""+' '+"\"";
      else
        finalArray[recLine]+=','+"\""+soas[soa].remarks+"\"";
    if(soas[soa].evidences==null)
        finalArray[recLine]+=','+"\""+' '+"\"";
      else
        finalArray[recLine]+=','+"\""+soas[soa].evidences+"\"";

     if(soas[soa].actions==null)
        finalArray[recLine]+=','+"\""+' '+"\"";
      else
        finalArray[recLine]+=','+"\""+soas[soa].actions+"\"";

    if(soas[soa].compliance==null)
       finalArray[recLine]+=','+"\""+' '+"\"";
     else
       finalArray[recLine]+=','+"\""+soas[soa].compliance+"\"";

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
   link.setAttribute("download", "soaslist.csv");
   document.body.appendChild(link);  // Required for FF
   link.click();  // This will download the data file named "my_data.csv".


 };




}





})();

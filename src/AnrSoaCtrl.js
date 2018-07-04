(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state', 'MeasureService', 'ClientCategoryService' , 'ClientSoaService',  '$q',
            AnrSoaCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY
     */
    function AnrSoaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, MeasureService, ClientCategoryService,
                                  ClientSoaService,  $q, $filter) {



      $scope.selectedCategory="all";
      $scope.order="category";
      $scope.orderReference=$scope.orderMeasure=$scope.orderCompliance="-1";


      $scope.Category=[0];
      $scope.CategoryIndex=[0];
      ClientCategoryService.getCategories({anr: $scope.model.anr.id}).then(function (data) {
          $scope.Categories = data['categories'];
      });







      ClientSoaService.getSoas({anr: $scope.model.anr.id}).then(function (data) {
          $scope.soas = data['Soa-list'];

          //
          // //tri par compliance
          // $scope.soas.sort(function (a, b) {
          //   return a.compliance-b.compliance;
          // });


          // //tri par measure
          // $scope.soas.sort(function (a, b) {
          //   return a.control.localeCompare(b.control);
          // });


          //tri par reference
          $scope.soas.sort(function (a, b) {
            return a.measure.code.localeCompare(b.measure.code);
          });

          //tri par category_id
          $scope.soas.sort(function (a, b) {
            return a.measure.category.id-b.measure.category.id;
          });





          $scope.totalItems = $scope.soas.length ;   //$scope.soas.length


          //for every soa
          // if($scope.soas[soa].compliance != null)
          //         $scope.soas[soa].compliance = $scope.soas[soa].compliance + "%";
          //

          for (Category in $scope.Categories){

            $scope.Category[$scope.Categories[Category].id-1]=0;
            $scope.CategoryIndex[$scope.Categories[Category].id-1]=0;

              for (soa in $scope.soas){

                if($scope.Categories[Category].id == $scope.soas[soa].measure.category.id)
                     $scope.Category[$scope.Categories[Category].id-1]=$scope.Category[$scope.Categories[Category].id-1]+1;
              }


          }


          for(var i=1;i<$scope.Category.length;i++){
            if( ! $scope.CategoryIndex[i-1])$scope.CategoryIndex[i-1]=0;
            if( ! $scope.Category[i-1])$scope.Category[i-1]=0;
            $scope.CategoryIndex[i]=$scope.CategoryIndex[i-1]+$scope.Category[i-1];

          }





        //  console.log(  $scope.Category);
        //  console.log(  $scope.CategoryIndex);


      });




            $scope.soasMeasures = function () {
              //tri par measure
              if(  $scope.orderMeasure=='-1'){
                $scope.soas.sort(function (a, b) {
                  return $scope._langField(a.measure,'description').localeCompare($scope._langField(b.measure,'description'));
                  });
                  $scope.orderMeasure='1';
              }else{
                $scope.soas.sort(function (a, b) {
                  return $scope._langField(b.measure,'description').localeCompare($scope._langField(a.measure,'description'));
                  });
                  $scope.orderMeasure='-1';
              }
                $scope.soas.sort(function (a, b) {
                  return a.measure.category.id-b.measure.category.id;

              });

            };

            $scope.soasCompliance = function () {

              //tri par compliance
              if(  $scope.orderCompliance=='-1'){

                    $scope.soas.sort(function (a, b) {
                      return a.compliance-b.compliance;
                    });
                    $scope.orderCompliance='1';
             }else{
                   $scope.soas.sort(function (a, b) {
                     return b.compliance-a.compliance;
                   });
                   $scope.orderCompliance='-1';
             }

                $scope.soas.sort(function (a, b) {
                  return a.measure.category.id-b.measure.category.id;
                });


            };


            $scope.soasReference = function () {

             //tri par reference
             if(  $scope.orderReference=='-1'){

               $scope.soas.sort(function (a, b) {
                  return a.measure.code.localeCompare(b.measure.code);
                  });
               $scope.orderReference='1';
             }else{
               $scope.soas.sort(function (a, b) {
                  return b.measure.code.localeCompare(a.measure.code);
                  });
                $scope.orderReference='-1';
              }


            $scope.soas.sort(function (a, b) {
               return a.measure.category.id-b.measure.category.id;
              });


          };







     $scope.onTableEdited = function (model, name) {
         console.log('onTableEdited');
         var promise = $q.defer();

         var params = {
             anr: $scope.model.anr.id,
             id: model.id,
         };
         if(name === "EX" || name === "LR" || name === "CO" || name === "BR" || name === "BP" || name === "RRA" ){
           if (model[name] == 0) { model[name]=1} else  model[name]=0;
          }


          params[name] = model[name];

         // if(name === "compliance" && model[name].replace("%","")<= 100 && model[name].replace("%", "") >= 0 ){
         //   params[name] = model[name];
         //   model[name] = model[name] + '%';
         //  }
         //
         //  else{
         //        if (name != "compliance"){
         //          params[name] = model[name];}
         //        else{
         //          toastr.error(gettextCatalog.getString('the value of the compliance must be between 0 and 100 '));
         //        }
         //  }


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
     finalArray[recLine]="\""+$scope._langField(soas[soa].measure.category,'label')+"\"";
     finalArray[recLine]+=','+"\""+soas[soa].measure.code+"\"";
     finalArray[recLine]+=','+"\""+$scope._langField(soas[soa].measure,'description')+"\"";

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
     else{
       if(soas[soa].compliance == 1)      finalArray[recLine]+=','+"\""+gettextCatalog.getString('Initial')+"\"";
       if(soas[soa].compliance == 2)      finalArray[recLine]+=','+"\""+gettextCatalog.getString('Developing')+"\"";
       if(soas[soa].compliance == 3)      finalArray[recLine]+=','+"\""+gettextCatalog.getString('Defined')+"\"";
       if(soas[soa].compliance == 4)      finalArray[recLine]+=','+"\""+gettextCatalog.getString('Managed')+"\"";
       if(soas[soa].compliance == 5)      finalArray[recLine]+=','+"\""+gettextCatalog.getString('Optimized')+"\"";


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
   link.setAttribute("download", "soaslist.csv");
   document.body.appendChild(link);  // Required for FF
   link.click();  // This will download the data file named "my_data.csv".


 };




}





})();

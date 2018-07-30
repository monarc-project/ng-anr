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
      $scope.status="1";
      $scope.id_cat=0;


      $scope.orderReference=$scope.orderMeasure=$scope.orderCompliance=$scope.orderCategory="-1";

         // $scope.Category = new Array();
         // $scope.CategoryIndex = new Array();
      $scope.Category=[0];
      $scope.CategoryIndex=[0];
      ClientCategoryService.getCategories({anr: $scope.model.anr.id}).then(function (data) {
          $scope.Categories = data['categories'];
          for (Category in $scope.Categories){
                if($scope.Categories[Category].id >= $scope.id_cat)
                     $scope.id_cat=$scope.Categories[Category].id+1;
              }

          $scope.Categories.push({'id':$scope.id_cat, 'reference':'-----', 'label1':'-----', 'label2':'-----', 'label3':'-----', 'label4':'-----'});
          // console.log(  $scope.Categories);


      });



      function categories_sort(a, b) {

        return a.measure.category.id-b.measure.category.id;
      };

      function categories_sortInv(a, b) {

        return b.measure.category.id-a.measure.category.id;
      };


                                                 function rowspan_calcul() {
                                                    $scope.testt=[];
                                                    // console.log('before');
                                                    // setTimeout(function(){
                                                    //   console.log('after');

                                                      if($scope.order=="category"){

                                                          $scope.soasReferences();
                                                          $scope.orderReference=- $scope.orderReference;
                                                          if($scope.orderCategory=='-1'){
                                                            //tri par category_id
                                                            $scope.soas.sort(categories_sort);
                                                          }else{
                                                            //tri par category_id
                                                            $scope.soas.sort(categories_sortInv);
                                                          }
                                                      }
                                                      $scope.totalItems = $scope.soas.length ;   //$scope.soas.length

                                                      for (Category in $scope.Categories){
                                                        $scope.Category[$scope.Categories[Category].id-1]=0;
                                                        $scope.CategoryIndex[$scope.Categories[Category].id-1]=0;
                                                        $scope.testt=$scope.soas.slice(($scope.currentPage-1)*$scope.itemsPerPage,($scope.currentPage)*$scope.itemsPerPage);

                                                          for (soa in $scope.testt){

                                                            if($scope.Categories[Category].id == $scope.testt[soa].measure.category.id)
                                                                 $scope.Category[$scope.Categories[Category].id-1]=$scope.Category[$scope.Categories[Category].id-1]+1;
                                                          }


                                                      }

                                                      if($scope.orderCategory=='-1'){

                                                      for(var i=1;i<$scope.Category.length;i++){
                                                        if( ! $scope.CategoryIndex[i-1]) $scope.CategoryIndex[i-1]=0;
                                                        if( ! $scope.Category[i-1]) $scope.Category[i-1]=0;
                                                        $scope.CategoryIndex[i]=$scope.CategoryIndex[i-1]+$scope.Category[i-1];

                                                      }
                                                      }else {
                                                      for(var i=$scope.Category.length-1;i>0;i--){
                                                        if( ! $scope.CategoryIndex[i+1]) $scope.CategoryIndex[i+1]=0;
                                                        if( ! $scope.Category[i+1]) $scope.Category[i+1]=0;
                                                        $scope.CategoryIndex[i]=$scope.CategoryIndex[i+1]+$scope.Category[i+1];

                                                      }
                                                    }
                                                    // },100);


                                                 };




         $scope.selectStatusCategory = function () {
           $scope.test=[];
           $scope.currentPage = 1;
           for (soa in $scope.soas_data){

                 if(($scope.status == $scope.soas_data[soa].measure.status || $scope.status == "all") && ($scope.selectedCategory == $scope.soas_data[soa].measure.category.id || $scope.selectedCategory == "all") )
                      $scope.test.push($scope.soas_data[soa]);

           }

           $scope.soas= $scope.test;

           rowspan_calcul();




       };


      ClientSoaService.getSoas({anr: $scope.model.anr.id}).then(function (data) {
        $scope.soas_data = data['Soa-list'];
        $scope.soas = [];
        for (soa in $scope.soas_data){
          if( $scope.soas_data[soa].measure.category ==null ) {
              var soa_n = $scope.soas_data[soa];
              soa_n.measure.category={'id':$scope.id_cat, 'reference':'-----', 'label1':'-----', 'label2':'-----', 'label3':'-----', 'label4':'-----'};
                   $scope.soas.push(soa_n);

          }else                    $scope.soas.push($scope.soas_data[soa]);

        }

        $scope.soas_data = $scope.soas;
        $scope.selectStatusCategory();

        // console.log(  $scope.soas);
        // var j=0;
        // $scope.testt=$scope.soas.slice(($scope.currentPage-1)*$scope.itemsPerPage,($scope.currentPage)*$scope.itemsPerPage);
        //
        // console.log(  $scope.testt);

      });


            $scope.soasMeasures = function () {
              $scope.currentPage = 1; //reset to first page
              $scope.order="measure";

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
              rowspan_calcul();

            };

            $scope.soasCompliance = function () {
              $scope.currentPage = 1; //reset to first page
              $scope.order="compliance";

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

             rowspan_calcul();


            };


          //   $scope.soasReference = function () {
          //     $scope.order="reference";
          //
          //    //tri par reference
          //    if(  $scope.orderReference=='-1'){
          //
          //      $scope.soas.sort(function (a, b) {
          //         return a.measure.code.localeCompare(b.measure.code);
          //         });
          //         $scope.soas.sort(categories_sort);
          //      $scope.orderReference='1';
          //    }else{
          //      $scope.soas.sort(function (a, b) {
          //         return b.measure.code.localeCompare(a.measure.code);
          //         });
          //         $scope.soas.sort(categories_sortInv);
          //       $scope.orderReference='-1';
          //     }
          //
          //
          // };

          $scope.soasReferences = function () {
            for (soa in $scope.soas){
                $scope.soas[soa].measure.code=$scope.soas[soa].measure.code.split(".");
            }
            // console.log($scope.soas);
           //tri par reference
           if(  $scope.orderReference=='-1'){

               $scope.soas.sort(function (a, b) {
                  return a.measure.code[2]-b.measure.code[2];
                  });
                $scope.soas.sort(function (a, b) {
                   return a.measure.code[1]-b.measure.code[1];
                   });
                $scope.soas.sort(function (a, b) {
                   return a.measure.code[0]-b.measure.code[0];
                   });
             $scope.orderReference='1';
           }else{
             $scope.soas.sort(function (a, b) {
                return b.measure.code[2]-a.measure.code[2];
                });
              $scope.soas.sort(function (a, b) {
                 return b.measure.code[1]-a.measure.code[1];
                 });
              $scope.soas.sort(function (a, b) {
                 return b.measure.code[0]-a.measure.code[0];
                 });
              $scope.orderReference='-1';
            }

            for (soa in $scope.soas){
                  $scope.soas[soa].measure.code=$scope.soas[soa].measure.code.join(".");
            }

            // console.log($scope.soas);

        };


                      $scope.soasReference = function () {
                        $scope.currentPage = 1; //reset to first page
                        $scope.order="reference";
                        $scope.soasReferences();
                        rowspan_calcul();

                    };






                                                   $scope.soasCategory= function () {
                                                     $scope.order="category";
                                                     $scope.currentPage = 1; //reset to first page
                                                       rowspan_calcul();

                                                     if(  $scope.orderCategory=='-1'){
                                                           $scope.orderCategory='1';
                                                    }else{
                                                           $scope.orderCategory='-1';
                                                    }
                                                  };


     $scope.onTableEdited = function (model, name) {
         //console.log('onTableEdited');
         var promise = $q.defer();

         var params = {
             anr: $scope.model.anr.id,
             id: model.id,
         };
         if(name === "EX" || name === "LR" || name === "CO" || name === "BR" || name === "BP" || name === "RRA" ){
           if (model[name] == 0) { model[name]=1} else  model[name]=0;
          }


          params[name] = model[name];


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

   rowspan_calcul();

 };

 $scope.pageChanged = function() {
   console.log('Page changed to: ' + $scope.currentPage);

   rowspan_calcul();

 };

$scope.setItemsPerPage = function(num) {
 $scope.itemsPerPage = num;
 $scope.currentPage = 1; //reset to first page
 $scope.numPage = $scope.totalItems/num;


rowspan_calcul();

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





    // Remarks
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

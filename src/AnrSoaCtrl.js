(function () {

    angular
        .module('AnrModule')
        .controller('AnrSoaCtrl', [
            '$scope','$rootScope', 'toastr', '$mdMedia', '$mdDialog',  'gettextCatalog', '$state', 'MeasureService', 'SOACategoryService' , 'ClientSoaService',  '$q',
            AnrSoaCtrl
        ]);

    /**
     * ANR > STATEMENT OF APPLICABILITY
     */
    function AnrSoaCtrl($scope, $rootScope, toastr, $mdMedia, $mdDialog, gettextCatalog, $state, MeasureService, SOACategoryService,
                                  ClientSoaService,  $q, $filter) {

      //Options for Soa Table
      $scope.selectedCategory="all";
      $scope.order="category";
      $scope.status="1";
      $scope.orderReference=$scope.orderMeasure=$scope.orderCompliance=$scope.orderCategory="-1";
      $scope.Category=[0];
      $scope.CategoryIndex=[0];

      //get the list of categories
      SOACategoryService.getCategories({anr: $scope.model.anr.id}).then(function (data) {
          $scope.Categories = data['categories'];
          $scope.Categories.push({'id':null, 'reference':'-----', 'label1':'-----', 'label2':'-----', 'label3':'-----', 'label4':'-----'});
      });

      //Sort by category ASC
      function categories_sort(a, b) {
        return a.measure.category.id-b.measure.category.id;
      };

      //Sort by category DESC
      function categories_sortInv(a, b) {
        return b.measure.category.id-a.measure.category.id;
      };

      //calculate the rawspans for the sort by category
      function rowspan_calcul() {
         $scope.testt=[];
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

          //calculate the size of each category
          $scope.testt=$scope.soas.slice(($scope.currentPage-1)*$scope.itemsPerPage,($scope.currentPage)*$scope.itemsPerPage);
          for (Category in $scope.Categories){
             $scope.Category[$scope.Categories[Category].id-1]=0;
             $scope.CategoryIndex[$scope.Categories[Category].id-1]=0;
             for (soa in $scope.testt){
                 if($scope.Categories[Category].id == $scope.testt[soa].measure.category.id)
                      $scope.Category[$scope.Categories[Category].id-1]=$scope.Category[$scope.Categories[Category].id-1]+1;
               }
           }
         //calculate the index of the beginning for each category
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
     };

 // returns the soas that have the selected status  and category
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

   //get the soas list
  ClientSoaService.getSoas({anr: $scope.model.anr.id}).then(function (data) {
    $scope.soas_data = data['Soa-list'];
    //console.log($scope.soas_data);
    $scope.soas_data.forEach(function(element){
        if(element.measure.category ==null)
          element.measure.category={'id':null, 'reference':'-----', 'label1':'-----', 'label2':'-----', 'label3':'-----', 'label4':'-----'};
    });
    $scope.selectStatusCategory();
  });

     //Sort by measures
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

      //Sort by compliance
      $scope.soasCompliance = function () {
        $scope.currentPage = 1; //reset to first page
        $scope.order="compliance";
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

        //Sort by reference
      $scope.soasReferences = function () {
        for (soa in $scope.soas){
            $scope.soas[soa].measure.code=$scope.soas[soa].measure.code.split(".");
        }

       if($scope.orderReference=='-1'){
         $scope.soas.sort(function (a, b) {
           if(a.measure.code[0]==b.measure.code[0]){
            if(a.measure.code[1]==b.measure.code[1])
                return a.measure.code[2]-b.measure.code[2];
              else
                return a.measure.code[1]-b.measure.code[1];
            }else {
              return a.measure.code[0]-b.measure.code[0];
            }
          });
         $scope.orderReference='1';
       }else{
         $scope.soas.sort(function (a, b) {
           if(a.measure.code[0]==b.measure.code[0]){
            if(a.measure.code[1]==b.measure.code[1])
                return b.measure.code[2]-a.measure.code[2];
              else
                return b.measure.code[1]-a.measure.code[1];
            }else {
              return b.measure.code[0]-a.measure.code[0];
            }
          });
          $scope.orderReference='-1';
        }
        for (soa in $scope.soas){
              $scope.soas[soa].measure.code=$scope.soas[soa].measure.code.join(".");
        }
    };
  //Sort by reference  and calculate the rawspans size
  $scope.soasReference = function () {
  $scope.currentPage = 1; //reset to first page
  $scope.order="reference";
  $scope.soasReferences();
  rowspan_calcul();
  };
//Sort by category  and calculate the rawspans size
  $scope.soasCategory= function () {
  $scope.order="category";
  $scope.currentPage = 1; //reset to first page
  rowspan_calcul();
  if($scope.orderCategory=='-1'){
      $scope.orderCategory='1';
    }else{
      $scope.orderCategory='-1';
     }
  };


 $scope.onTableEdited = function (model, name) {
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

//Options for the pagination
 $scope.viewby = 20;
 $scope.currentPage = 1;
 $scope.itemsPerPage = $scope.viewby;
 $scope.maxSize = 5; //Number of pager buttons to show

 //set the number of the page and recalculate the size of rawspans
 $scope.setPage = function (pageNo) {
   $scope.currentPage = pageNo;
   rowspan_calcul();
 };
 //recalculate the size of rawspans when the page has changed

   $scope.pageChanged = function() {
     console.log('Page changed to: ' + $scope.currentPage);
     rowspan_calcul();
   };
  //set the number of items per page and recalculate the size of rawspans
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
   finalArray[recLine]+=','+gettextCatalog.getString('Ref.');
   finalArray[recLine]+=','+gettextCatalog.getString('Control');
   finalArray[recLine]+=','+gettextCatalog.getString('Inclusion/Exclusion');
   finalArray[recLine]+=','+gettextCatalog.getString('Remarks');
   finalArray[recLine]+=','+gettextCatalog.getString('Evidences');
   finalArray[recLine]+=','+gettextCatalog.getString('Actions');
   finalArray[recLine]+=','+gettextCatalog.getString('Level of compliance');

   soas = $scope.soas;

   for (soa in soas)
   {
     recLine++;

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

    // evidences

    if(soas[soa].evidences==null)
        finalArray[recLine]+=','+"\""+' '+"\"";
      else
        finalArray[recLine]+=','+"\""+soas[soa].evidences+"\"";

    // actions

     if(soas[soa].actions==null)
        finalArray[recLine]+=','+"\""+' '+"\"";
      else
        finalArray[recLine]+=','+"\""+soas[soa].actions+"\"";


    // compliance

    if(soas[soa].compliance==null || soas[soa].EX == 1)
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
   document.body.appendChild(link);
   link.click();  // This will download the data file named "soaslist.csv".


 };




}





})();

angular.module('AnrModule').service('InstanceService', ['$mdDialog', '$state', 'gettextCatalog', 'AnrService', function($mdDialog, $state, gettextCatalog, AnrService ){
	this.detach = function($scope, ev, iid, successCallback, gotoanr, cancelCallback){
		var confirm = $mdDialog.confirm()
		    .title(gettextCatalog.getString('Are you sure you want to detach this asset?'))
		    .textContent(gettextCatalog.getString('This instance and all its children will be removed from the risk analysis. This operation cannot be undone.'))
		    .ariaLabel('Detach instance')
            .theme('light')
		    .targetEvent(ev)
		    .ok(gettextCatalog.getString('Detach'))
		    .cancel(gettextCatalog.getString('Cancel'));
		$mdDialog.show(confirm).then(function() {
		    AnrService.deleteInstance($scope.model.anr.id, iid, function () {
		        $scope.updateInstances();
		        successCallback.call();
		    });
		    if(gotoanr != undefined && gotoanr){
		    	$state.transitionTo('main.kb_mgmt.models.details', {modelId: $scope.model.id});
		    }
		}, function () {
			if (cancelCallback) {
				cancelCallback.call();
			}
		});
	}
}]);

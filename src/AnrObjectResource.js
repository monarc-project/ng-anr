(function(){
	angular.module("AnrModule").factory('AnrObject', ['$resource', '$rootScope', function($resource, $rootScope){
		var mainurl = $rootScope.OFFICE_MODE == 'FO' ? 'api/client-anr/:anrid/objects/:id' : 'api/anr/:anrid/objects/:id';
		return $resource(mainurl, {anrid: '@anrId', id: '@id'}, {parents: {url: mainurl+'/parents', method: 'GET', isArray: true}});
	}]);
})();

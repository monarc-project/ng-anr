(function(){
	angular.module("AnrModule").factory('AnrObject', ['$resource', function($resource){
		var mainurl = '/api/anr/:anrid/objects/:id';
		return $resource(mainurl, {anrid: '@anrId', id: '@id'}, {parents: {url: mainurl+'/parents', method: 'GET', isArray: true}});
	}]);
})();

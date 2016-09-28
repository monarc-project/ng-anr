(function () {

    angular
        .module('AnrModule')
        .factory('MassDeleteService', [ '$http', MassDeleteService ]);

    function MassDeleteService($http) {
        var deleteMass = function (url, ids, success, error) {
            $http({
                method: 'DELETE',
                url: url,
                data: ids,
                headers: {'Content-Type': 'application/json; charset=utf-8'}
            }).then(success, error);
        };

        return {
            deleteMass: deleteMass
        };
    }

})
();
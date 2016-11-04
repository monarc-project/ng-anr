angular.module('AnrModule').filter('dashnull', function () {
    return function (input) {
        if (input == null || input == '' || input == undefined || input < 0) {
            return '-';
        } else {
            return input;
        }
    };
});
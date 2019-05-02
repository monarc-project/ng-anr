angular.module('AnrModule', ['angularResizable', 'angular-loading-bar', 'ngAnimate'])
        .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
        cfpLoadingBarProvider.latencyThreshold = 1000;
        cfpLoadingBarProvider.includeSpinner = false;
        }]);

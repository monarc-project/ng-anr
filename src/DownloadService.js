'use strict';

(function () {

    angular
        .module('AnrModule')
        .factory('DownloadService', [ DownloadService ]);

    function DownloadService() {
        var self = this;

        var downloadBlob = function (data, name, typeF) {
            if(typeF == undefined){
                typeF = 'octet/stream';
            }
            var saveData = (function () {
                var a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';

                return function (blobData, fileName, typeF) {
                    if (typeF == undefined) {
                        typeF = 'application/octet-stream';
                    }
                    var blob = new Blob([blobData], {type: typeF}),
                        url = window.URL.createObjectURL(blob);

                    a.href = url;
                    a.download = fileName;
                    a.click();

                    setTimeout(function() {
                        window.URL.revokeObjectURL(url);
                    }, 800);
                };
            }());

            saveData(data, name, typeF);
        };


        var downloadJSON = function (data, fileName) {
          var saveData = (function () {
              var a = document.createElement('a');
              document.body.appendChild(a);
              a.style.display = 'none';

              return function (jsonData, fileName) {
                var blob = new Blob([angular.toJson(jsonData)], {type: 'application/json'}),
                    url = window.URL.createObjectURL(blob);

                a.href = url;
                a.download = fileName;
                a.click();

                setTimeout(function() {
                    window.URL.revokeObjectURL(url);
                }, 800);
              };
          }());
          saveData(data, fileName);
        };

        var downloadCSV = function (data, name, typeF) {
            if(typeF == undefined){
                typeF = 'octet/stream';
            }
            var saveData = (function () {
                var a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';

                return function (blobData, fileName, typeF) {
                    if (typeF == undefined) {
                        typeF = 'application/octet-stream';
                    }
                    var blob = new Blob(['\ufeff' + blobData], {type: typeF}),
                        url = window.URL.createObjectURL(blob);

                    a.href = url;
                    a.download = fileName;
                    a.click();

                    setTimeout(function() {
                        window.URL.revokeObjectURL(url);
                    }, 800);
                };
            }());

            saveData(data, name, typeF);
        };

        return {
            downloadBlob: downloadBlob,
            downloadJSON: downloadJSON,
            downloadCSV: downloadCSV
        };
    }

})();

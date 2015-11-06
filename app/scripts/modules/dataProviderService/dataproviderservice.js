'use strict';
var dataProviderService = angular.module('dataProviderService', []);
dataProviderService.factory('dataProviderService', ['$route', '$q', '$http', function( $route, $q, $http ) {
    var baseURL = "http://128.100.127.49:8888/amicms/wp-json/amicms/";
    return {
        getItem: function (itemPath, params) {
            var delay = $q.defer();
            var itemURL = baseURL + itemPath;
            if(typeof params == "undefined"){
              params = {};
            }
            $http({
                method: 'GET', 
                url: itemURL, 
                params: params,
                cache: true
            })
            .success( function(data, status, headers, config) {
                delay.resolve( data );
            }).error( function(data, status, headers, config) {
                delay.reject( data );
            });
            return delay.promise;
        }
    };
}]);
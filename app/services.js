/*
angular.module('services')

    .service('BtcAPI', function($scope, $http, $q){

        this.getData = function() {
            var url = 'https://api.bitcoinaverage.com/ticker/EUR';
            var deferred = $q.defer();
            $http.get(url,
                {
                    cache: false
                })
                .success(function(data){
                    deferred.resolve(data);
                })
                .error(function(err){
                    console.log(err);
                    deferred.reject();
                });

            return deferred.promise;
        };

        return this;

    })*/

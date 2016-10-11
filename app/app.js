var myApp = angular.module('myApp', [
    'ui.router',
    'ui.bootstrap',
    'chart.js'
])

    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

        $stateProvider.state('app', {
            url: '/',
            views: {
                "main": {
                    controller: 'AppCtrl',
                    templateUrl: 'app.tpl.html'
                }
            }
        });

        $urlRouterProvider.otherwise('/');


    }])

    .run(function(){
    })

    .controller('AppCtrl', function($scope, $q, $http, $uibModal, $rootScope){

        checkDonations();
        $rootScope.notices = [];
        $scope.BTCHistory = [];
        $scope.savedWatch = JSON.parse(localStorage.getItem('savedWatcher'));

        function getCurrentBTCValue() {
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
        }

        function getBTCHistory() {
            var url = 'https://api.bitcoinaverage.com/history/EUR/per_hour_monthly_sliding_window.csv';
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
        }

        function getAllDonations() {
            var url = 'http://localhost:8080/donate/cumulative';
            var deferred = $q.defer();
            $http.post(url,
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
        }

        function checkDonations(){
            getAllDonations().then(function (data){
                $scope.allDonations = data;
            })
        };


        getCurrentBTCValue().then(function(data){
            $scope.currentBTCvalue = data['24h_avg'];
            $scope.BTCvalueTimestamp = data['timestamp'];
            console.log(data);
        });

        getBTCHistory().then(function(data){
            // Replace new lines with commas and split to array
            var prepareCSV = data.replace(/(?:\r\n|\r|\n)/g, ',').split(',');
            // Remove CSV titles
            prepareCSV.splice(0, 4);

            // Create object of date & average value
            // and push it to array of history points
            var fullArrLen = prepareCSV.length;
            var lastElems = (parseInt(fullArrLen - 400));
            for(var i = fullArrLen; i > lastElems; i--){

                if(i % 8 == 0){
                    var date = prepareCSV[i];
                    var value = prepareCSV[i+3];

                    var singleHistoryPoint = {
                        date: date,
                        value: value
                    };
                    $scope.BTCHistory.push(singleHistoryPoint);
                }

            }


            // Split history points in data (avg value) & labels (date)
            // for line chart to use
            $scope.data = [];
            $scope.labels = [];

            for(var z = $scope.BTCHistory.length - 1; z >= 1; z-- ){
                $scope.labels.push($scope.BTCHistory[z].date);
                $scope.data.push($scope.BTCHistory[z].value);
            }
            console.log($scope.labels);

        });

        $scope.storeNotification = function(email, value){

            if(email && value > $scope.currentBTCvalue ){

                console.log("inside htto oist");

                $http({
                    method: 'POST',
                    url: 'http://localhost:8080',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        email: email,
                        value: value
                    }
                }).then(success, error);

                function success(){
                    // Show notice, Save watcher to local storage, Show text that watcher is active
                    $rootScope.notices.push({ type: "success", time: 5000, msg: "BTC watch is added for: " + email  });
                    localStorage.setItem('savedWatcher', JSON.stringify({ email: email, value: value }));
                    $scope.savedWatch = JSON.parse(localStorage.getItem('savedWatcher'));

                }
                
                function error() {
                    $rootScope.notices.push({ type: "danger", time: 5000, msg: "Couldn't save your watch. Server error" });
                }
            }

            if(value == $scope.currentBTCvalue || value < $scope.currentBTCvalue){
                $rootScope.notices.push({ type: "info", time: 5000, msg: "Value needs to be larger then current"  });
            }

        };

        $scope.openModal = function() {
            $rootScope.modalInstance = $uibModal.open({
                templateUrl: 'payment-modal.html',
                size: 'md',
                scope: $scope
            });
        };

        $scope.donate = function(amount, number, cvc, expMonth, expYear) {

            if(validateCC(number)){
                console.log(number);

                $http({
                    method: 'POST',
                    url: 'http://localhost:8080/donate',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        amount: amount,
                        number: number,
                        cvc: cvc,
                        expMonth: expMonth,
                        expYear: expYear
                    }
                }).then(success, error);
            }
            else{
                $rootScope.notices.push({ type: "danger", time: 5000, msg: "Credit card number is invalid" });
            }

            function success(response){
                console.log(response);
                $rootScope.notices.push({ type: "info", time: 5000, msg: response.data });
                checkDonations();
            }
            function error(response){
                console.log(response);
                $rootScope.notices.push({ type: "danger", time: 5000, msg: "Couldn't bill you, please try again." });
            }

        };

        // Validate Credit Card number
        function validateCC(value){
            // accept only digits, dashes or spaces
            if (/[^0-9-\s]+/.test(value)) return false;

            // The Luhn Algorithm
            var nCheck = 0, nDigit = 0, bEven = false;
            value = value.replace(/\D/g, "");

            for (var n = value.length - 1; n >= 0; n--) {
                var cDigit = value.charAt(n),
                    nDigit = parseInt(cDigit, 10);

                if (bEven) {
                    if ((nDigit *= 2) > 9) nDigit -= 9;
                }

                nCheck += nDigit;
                bEven = !bEven;
            }

            return (nCheck % 10) == 0;
        }

        $scope.options = {
            scales: {
                yAxes: [
                    {
                        id: 'y-axis-1',
                        type: 'linear',
                        display: true,
                        position: 'left'
                    }
                ]
            }
        };

        $scope.data2 = {
            series: ['Bitcoin'],

            data: [{
                x: "Laptops",
                y: [100]
            }, {
                x: "Desktops",
                y: [400 ]
            },
            {
                x: "222 22",
                y: [555]
            }, {
                x: "Mobiles",
                y: [491]
            }, {
                x: "Tablets",
                y: [546]
            }]
        };

        $scope.config = {
            title: '', // chart title. If this is false, no title element will be created.
            tooltips: true,
            labels: false, // labels on data points
            // exposed events
            mouseover: function() {},
            mouseout: function() {},
            click: function() {},
            // legend config
            legend: {
                display: true, // can be either 'left' or 'right'.
                position: 'left',
                // you can have html in series name
                htmlEnabled: false
            },
            // override this array if you're not happy with default colors
            colors: [],
            innerRadius: 0, // Only on pie Charts
            lineLegend: 'lineEnd', // Only on line Charts
            lineCurveType: 'cardinal', // change this as per d3 guidelines to avoid smoothline
            isAnimate: true, // run animations while rendering chart
            yAxisTickFormat: 's', //refer tickFormats in d3 to edit this value
            xAxisMaxTicks: 7, // Optional: maximum number of X axis ticks to show if data points exceed this number
            yAxisTickFormat: 's', // refer tickFormats in d3 to edit this value
            waitForHeightAndWidth: false // if true, it will not throw an error when the height or width are not defined (e.g. while creating a modal form), and it will be keep watching for valid height and width values
        };
    });


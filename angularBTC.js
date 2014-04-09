archiveArray = [];
glob = '' //Global object bound to last object returned by the callBlockChainData.  Used for dev/debugging.
tempglob = [];

var coinChatterApp = angular.module('coinChatterApp', ['ngAnimate', 'infinite-scroll']);


coinChatterApp.controller('coinChatterCtrl', function($scope, $http){
    $scope.transactions = archiveArray;
    var callBlockchainData = function(transactionIndex){
        var url = 'https://blockchain.info/rawtx/'+transactionIndex+'?format=json&scripts=true&cors=true'
        $http.get(url).success(function(data){
            glob = data;
            archiveArray.push({"id": archiveArray.length,
                "hex": BlockToString(data),
                'OP_RETURN' : hasOP_RETURN(data),
                "scripts": getScripts(data),
                "data": data,
                'BTC': getBTC(data),
                "url": 'https://blockchain.info/tx/'+transactionIndex})
        });
    }
    $scope.ticker = false;
    $scope.filterOP_RETURN = false;

    $scope.changeTicker = function(){
        if ($scope.ticker){
            $scope.ticker = false;
        }
        else {$scope.ticker = true;}
    }


    $scope.stopUpdate = function(){
        closeWebsocket();
        testWebSocket();
        $scope.ticker = false;
    }
    $scope.nextTransaction = function(){
        doSend('{"op":"ping_tx"}'); //Most recent transaction.
        $scope.ticker = false;
    }

    function getBTC(transaction){
        //Only looks at output script
        var btcAmount = 0;
        for (var i = 0; i < transaction["out"].length; i++){ //iterate over each output script
            btcAmount += transaction['out'][i]['value'];  //value is in Satoshi. 
        }
        btcAmount = btcAmount / 100000000; //100,000,000 Satoshi = 1 BTC. 
        return btcAmount;
    }

    function getScripts(transaction){
        //Returns an array of all the output scripts.
        var arr = [];
        for (var i = 0; i < transaction["out"].length; i++){ //iterate over each output script
            arr.push(transaction["out"][i]['script'])
        }
        return arr;
    }

    function BlockToString(response){
        /* This function is wrong.  It looks at only the last output script and returns that. 
        CoinSecrets looks only at scripts that have OP_RETURN, regardless of whether they are last or not.
        */
        var lastIndex = response['out'].length - 1
        return hex2a(response["out"][lastIndex]["script"]);
    }

    function hex2a(hexx) {
        var hex = hexx.toString();//force conversion
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    }

     var hasOP_RETURN = function(transaction){
        //Checks if any output script in a transaction has an OP_RETURN
        //Note, it takes the whole transaction, not just the string.
        //Hex is 6a.  The next two characters indicate the length of the data, and after that comes data.
        for (var i = 0; i < transaction["out"].length ; i++){ //iterate over each output script
            if (transaction["out"][i]["script"].substring(0, 2) == '6a'){ //Hex value for OP_Return is '6a.'
                return true;
            }
        }
        return false;
    }

    var wsUri = "ws://ws.blockchain.info/inv";
    var output;

     $scope.init = function() {
         output = document.getElementById("output");
         testWebSocket();
     }

     function testWebSocket() {
         websocket = new WebSocket(wsUri);
         websocket.onopen = function (evt) {
             onOpen(evt)
         };
         websocket.onclose = function (evt) {
             onClose(evt)
         };
         websocket.onmessage = function (evt) {
             onMessage(evt)
         };
         websocket.onerror = function (evt) {
             onError(evt)
         };
     }

     function onOpen(evt) {
         doSend('{"op":"ping_tx"}'); //Most recent transaction.
     }

     $scope.liveUpdate = function(){
            doSend('{"op":"unconfirmed_sub"}');
            $scope.ticker = true;
     }

     function closeWebsocket(){
        websocket.close();
     }

     function onClose(evt) {
     }

     function onMessage(evt) {
         var transactionHash = jQuery.parseJSON(evt['data'])['x']['hash'];
         callBlockchainData(transactionHash);
     }

     function doSend(message) {
         websocket.send(message);
     }

    $scope.loadCoinSecretsTX = function(){
       /* This fn should not be called automatically.  Instead, it should be MANUALLY RUN whenever updating
        the input from CoinSecrets.org after running the Python script.
        This creates a JSON file which should then be manually saved and uploaded to persistently store the data.
        Takes the output from coinsecretscraper.py

        BlockChain.info only allows 700 requests every 5min.  There are ~800 entries in this file. 
        */
        
        jQuery.get('http://acoard.com/projects/work/scraper/tx.txt', function(data){
        }).success(function(data) {
            TXs = data.split('\n');
            var counter = 0;
            var arrOP_RETURN = []; //output array
            for (var i = 0; i < TXs.length; i++){
                //Since Blockchain.info limits requests (700 per 5 min), have to limit rate of calls
                setTimeout(function(){ 
                    arrOP_RETURN.push(callBlockchainData(TXs[counter])); //Use counter instead of i because it increments within settimeout
                    counter++;
                    // console.log("Loop: " + counter + " of " + TXs.length);
                },

                1000 * i + 1) //By multiplying the timeout by the index it avoids the case of ALL of the calls just being in 1 second.
            }
            console.log(JSON.stringify(arrOP_RETURN));
            tempglob = arrOP_RETURN;
        });
     }
     $scope.options = [
        {label: 'Newest on bottom', value : false},
        {label: 'Newest on top', value: true}
        ]
    $scope.reverseOrder = $scope.options[0]

}); //End of coinChatterCtrl

coinChatterApp.controller('archiveCtrl', function($scope, $http, $window, $location, $anchorScroll){
    /*
    The init fn pulls the 52kb file which is a list of OP_RETURN transaction IDs.
    Transaction IDs are called through Blockchain.info, but they have a limit of API calls, so limit to 1/sec
    */
    var txID = []; //The return of the archiveInit, an array.  Must be assigned asychronously.
    var index = 0; //of txID
    archiveArray = []; //The output array, basically a blockchain.info call on each of the entries in txID. 
    $scope.transactions = archiveArray;
    $scope.archiveInit = function(){
        var url = 'tx.txt'
        $http.get(url).success(function(data){
            txID = data.split('\n');
            glob = txID;
        });
    }

    $scope.loadNext = function(){
        if ($scope.disableScroll == true) {return;} //Exit out if fn is being called concurrently
        $scope.disableScroll = true; //Stop future calls until this fn is totally processed
        var millisecondDelay = 300;
        setTimeout(function(){
            var url = 'https://blockchain.info/rawtx/'+txID[index]+'?format=json&scripts=true&cors=true'
            $http.get(url).success(function(data){
                archiveArray.push({"id": archiveArray.length,
                    "hex": BlockToString(data),
                    'OP_RETURN' : hasOP_RETURN(data),
                    "scripts": getScripts(data),
                    "data": data,
                    'BTC': getBTC(data),
                    "url": 'https://blockchain.info/tx/'+txID[index]
                })
                index++;
                $scope.disableScroll = false;
            });
        }, millisecondDelay);
    }

    $scope.scrollToBottom = function(){
        $location.hash('output');
        $anchorScroll();
    };
    
    // Used to stop tonnes of repeat requests to loadNext().
    $scope.disableScroll = false;

    // This code is duplicated from the previous controller.
    //I realize this is bad practice, and I *will* fix this - but John wants a launch today so that's my priority.
    function getBTC(transaction){
        //Only looks at output script
        var btcAmount = 0;
        for (var i = 0; i < transaction["out"].length; i++){ //iterate over each output script
            btcAmount += transaction['out'][i]['value'];  //value is in Satoshi. 
        }
        btcAmount = btcAmount / 100000000; //100,000,000 Satoshi = 1 BTC. 
        return btcAmount;
    }

    function getScripts(transaction){
        //Returns an array of all the output scripts.
        var arr = [];
        for (var i = 0; i < transaction["out"].length; i++){ //iterate over each output script
            arr.push(transaction["out"][i]['script'])
        }
        return arr;
    }

    function BlockToString(response){
        /* This function is wrong.  It looks at only the last output script and returns that. 
        CoinSecrets looks only at scripts that have OP_RETURN, regardless of whether they are last or not.
        */
        var lastIndex = response['out'].length - 1
        return hex2a(response["out"][lastIndex]["script"]);
    }

    function hex2a(hexx) {
        var hex = hexx.toString();//force conversion
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    }

     var hasOP_RETURN = function(transaction){
        //Checks if any output script in a transaction has an OP_RETURN
        //Note, it takes the whole transaction, not just the string.
        //Hex is 6a.  The next two characters indicate the length of the data, and after that comes data.
        for (var i = 0; i < transaction["out"].length ; i++){ //iterate over each output script
            if (transaction["out"][i]["script"].substring(0, 2) == '6a'){ //Hex value for OP_Return is '6a.'
                return true;
            }
        }
        return false;
    }
    //For reverse order function
     $scope.options = [
        {label: 'Newest on bottom', value : false},
        {label: 'Newest on top', value: true}
        ]
    $scope.reverseOrder = $scope.options[0]

}); //end of archiveCTRL
// Reverses the ordering of new items
coinChatterApp.filter('reverse', function() {
  return function(items, truthVal) { 
    if (truthVal.value){
        return items.slice().reverse();
    }
    else {return items;}
    }
});

coinChatterApp.directive("scroll", function ($window) {
    return function(scope, element, attrs) {
        angular.element($window).bind("scroll", function() {
             if (this.pageYOffset >= 100) {
                 console.log('Scrolled below header.');
             } else {
                 console.log('Header is in view.');
             }
        });
    };
});
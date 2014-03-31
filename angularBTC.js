globalArrayOfTransactions = [];
glob = '' //Global object bound to last object returned by the callBlockChainData.  Used for dev/debugging.

var btcSpaceApp = angular.module('btcSpaceApp', ['ngAnimate']);

btcSpaceApp.controller('btcSpaceCtrl', function($scope, $http){
    $scope.transactions = globalArrayOfTransactions;
    var callBlockchainData = function(transactionIndex){
        var url = 'https://blockchain.info/rawtx/'+transactionIndex+'?format=json&scripts=true&cors=true'
        $http.get(url).success(function(data){
            console.log(data);
            glob = data;
            globalArrayOfTransactions.push({"id": globalArrayOfTransactions.length,
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
            // console.log(transaction['out'][i]['value']);
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
         console.log("WebSocket connected.")
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
         console.log("WebSocket disconnected.");
     }

     function onMessage(evt) {
         console.log("Websocket Response:");
         var transactionHash = jQuery.parseJSON(evt['data'])['x']['hash'];
         callBlockchainData(transactionHash);
     }

     function doSend(message) {
         console.log("Websocket sent: " + message);
         websocket.send(message);
     }
}); //END OF ANGULAR CONTROLLER
globalArrayOfTransactions = [];
glob = '' //Global object bound to last object returned by the callBlockChainData.  Used for dev/debugging.
tempglob = [];

var btcSpaceApp = angular.module('btcSpaceApp', ['ngAnimate']);

btcSpaceApp.controller('btcSpaceCtrl', function($scope, $http){
    $scope.transactions = globalArrayOfTransactions;
    var callBlockchainData = function(transactionIndex){
        var url = 'https://blockchain.info/rawtx/'+transactionIndex+'?format=json&scripts=true&cors=true'
        $http.get(url).success(function(data){
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

<<<<<<< HEAD
=======
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
                    arrOP_RETURN.push(callBlockchainData(TXs[counter])); 
                    counter++;
                    console.log("Loop: " + counter + " of " + TXs.length);},

                1000 * i + 1) //By multiplying the timeout by the index it avoids the case of ALL of the calls just being in 1 second.
            }
            console.log(JSON.stringify(arrOP_RETURN));
            tempglob = arrOP_RETURN;
        });
     }

>>>>>>> d60d1f7... Tided up Python package, removed dependencies.  Also some changes to contact page.

     $scope.options = [
        {label: 'Newest on bottom', value : false},
        {label: 'Newest on top', value: true}
        ]
    $scope.reverseOrder = $scope.options[0]

}); //END OF ANGULAR CONTROLLER
// Reverses the ordering of new items
btcSpaceApp.filter('reverse', function() {
  return function(items, truthVal) { 
    console.log(truthVal.value);
    if (truthVal.value){
        return items.slice().reverse();
    }
    else {return items;}
    }
});
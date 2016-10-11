var request = require('request');
var events = require('events');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cors = require('cors');
var mailgun = require('mailgun-js')({apiKey: 'key-792434369212c8d725424a1902a282b4', domain: 'sandboxaa918e10fafc458ea0736b0af0f88c57.mailgun.org'});
var stripe = require('stripe')('sk_test_lE6jIjlaLzYxy3nTWLunNI8g');

var eventEmitter = new events.EventEmitter();

var app = express();
app.use(bodyParser.json());

app.use(cors());
app.options('*', cors());

// Connect to DB & Start listening on port 8080
var db = require('./db');

db.connect(function(err){
  if(err){
    console.log("DB ERROR");
  }
  else{
    console.info("DB Working, Start server");
    // localhost:8080
    app.listen(8080);

    // Call check every 30 sec
    setInterval(checkForNotificationMatch, 8000);
  }
});

// Homepage
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// Get POST for new notification
app.post('/', function(req, res){

  var newNotificationData = req.body;
  if(newNotificationData){
    db.set(newNotificationData.email, newNotificationData.value);
    res.send("Saved successfully");
  }


  // res.sendFile(path.join(__dirname + '/savedNotification.html'));
});

// Get POST for donation payment
app.post('/donate', function(req, res){

  console.log(req.body);

  // create charge using stripe module
  stripe.charges.create({
    amount: req.body.amount,
    currency: "eur",
    card: {
      number: req.body.number,
      exp_month: req.body.expMonth,
      exp_year: req.body.expYear,
      cvc: req.body.cvc
    },
    description: "Donation for BTC Watcher"

  }).then(function(charge) {

    console.log(charge);
    var msg = 'successfully charged ' + charge.amount + charge.currency;
    res.send(JSON.stringify(msg));
    db.saveDonation(charge);

  }, function(err) {
    console.log(err);
    res.send(JSON.stringify(err.message));
  });

});

// POST amount of all donations so far
app.post('/donate/cumulative', function(req, res){

  var allDonationsValue = 0;
  var allDonations = db.getDonations();
  allDonations.find().toArray(function(err, storeDonations){

    for(var i = 0; i < storeDonations.length; i++){
      allDonationsValue += storeDonations[i].amount;
      console.log(storeDonations[i].amount);
    }
    console.log("ALL DONATIONS", allDonationsValue);
    res.send(JSON.stringify(allDonationsValue));

  });
});

// Bitcoin API
function getBitcoinValue(){
  return new Promise(function(resolve, reject){
      request('https://api.bitcoinaverage.com/ticker/EUR', function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var results = JSON.parse(body);
          var btcAvgValue = results['24h_avg'];
          resolve(btcAvgValue);
        }
      });
  });
}

// Send email notification and delete 
var sendNotification = function(email, value, id){

  console.log("send notification");

  // Compose message
  var emailData = {
    from: 'BTC Watcher <me@samples.mailgun.org>',
    to: email,
    subject: 'Bitcoin watcher notification',
    text: '1 Bitcoin now costs more than ' + value + ' EUR. \n This is automated message you have subscribed to.'
  };

  // Send email
  mailgun.messages().send(emailData, function (error, body) {
    // If there are no errors delete specific notification from DB
    if(!error){
      db.delete(id);
    }
  });
};

// Check for match
var checkForNotificationMatch = function(){
  console.log("check match");
  // Get Data from DB
  var notificationsColl = db.get();

  notificationsColl.find().toArray(function(err, storedData) {

    // Get BTC value from API
    getBitcoinValue().then(function(btcValue){
      console.log("got api data");

      // Browse all results
      for(var i = 0; i < storedData.length; i++){
        console.log(storedData[i].value);

        // If user set value is bigger then current BTC value
        if(btcValue > storedData[i].value){
          sendNotification(storedData[i].email, storedData[i].value, storedData[i]._id);
        }

      }

    });
  });


};



var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;

var state = {
    db: null
};

var _dbUri = 'mongodb://mladen5:mojasifra@ds049456.mlab.com:49456/btcnotify';

exports.connect = function(done) {
    if (state.db) return done()

    MongoClient.connect(_dbUri, function(err, db) {
        if (err) return done(err);
        state.db = db;
        done();
    })
};

exports.get = function() {
    return state.db.collection('notifications');
};

exports.set = function(email, value) {
    if(email && value){
        return state.db.collection('notifications').insertOne({ email: email, value: value });
    }
};

exports.delete = function(id) {
    return state.db.collection('notifications').deleteOne({ _id: new mongodb.ObjectID(id) });
};

exports.saveDonation = function(charge) {
    return state.db.collection('donations').insertOne(charge);
};

exports.getDonations = function() {
    return state.db.collection('donations');
};

exports.close = function(done) {
    if (state.db) {
        state.db.close(function(err, result) {
            state.db = null;
            state.mode = null;
            done(err)
        })
    }
};
var express = require('express');
var app = express();

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

var connectDB = function(req, res, next) {
    MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
       if (err) {
           res.status(500).send(JSON.stringify({'error': 'internal server error'}));
           console.error('Unable to connect to mongodb, URI: ' + process.env.MONGOLAB_URI);
       } else {
           res.on('finish', function() {
               db.close();
               console.log('Closed db.');
           })
           console.log('We have db!');
           req.db = db;
           next();
       }
    }); 
}

app.get(/^\/new\/(\w+\:\/{2}([^\s]+\.)+[^\s]+(:\d+)*$)+/, connectDB, function(req, res) {
    var url = req.params['0'];
    var id;
    var jsonResponse = {'original_url': url, 'short_url': req.headers['host'] + '/'};
    
    var collection = req.db.collection('urls');
    collection.findOne({url: url}, function(err, doc) {
        if (err) throw err;
        if (doc) {
            console.log('Existing record.');
            jsonResponse.short_url += doc.id;
            res.send(JSON.stringify(jsonResponse));
        } else {
            console.log('New record, adding to DB.');
            id = 1011;
            collection.insertOne({id: id, url: url}, function(err, r) {
                if (err) throw err;
                jsonResponse.short_url += r.ops[0].id;
                res.send(JSON.stringify(jsonResponse));
            });
       }
    });
    
});

app.get(['/new', '/new/:url*'], function(req, res) {
    res.status(400).send(JSON.stringify({'error': 'Wrong url format, make sure you have a valid protocol and real site.'}));
});

app.get('/:id', connectDB, function(req, res) {
    var id = req.params.id;
    var collection = req.db.collection('urls');
    collection.findOne({id: id}, function(err, doc) {
        if (err)
            res.status(404).send(JSON.stringify({'error': 'This url is not on the database.'}));
        else
            res.redirect(doc.url);
    });
});


app.listen(process.env.PORT, function() {
    console.log('Listening on port ' + process.env.PORT);
});
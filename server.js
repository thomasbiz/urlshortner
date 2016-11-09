var express = require('express');
var app = express();

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

var url = require('url');

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
    var target_url = req.params['0'];
    
    var requrl = url.format({
        protocol: req.protocol,
        hostname: req.hostname
    });
    
    var jsonResponse = {'original_url': target_url, 'short_url': requrl + '/'};
    
    var collection = req.db.collection('urls');
    collection.findOne({url: url}, function(err, doc) {
        if (err) throw err;
        if (doc) {
            console.log('Existing record.');
            jsonResponse.short_url += doc.id;
            res.send(JSON.stringify(jsonResponse));
        } else {
            console.log('New record, adding to DB.');
            req.db.collection('counter')
                .findAndModify({ _id: "nextid" }, [],
                               { $inc: { seq: 1 } },
                               { new: true }, 
                    function(err, r) {
                        if (err) throw err;
                        collection.insertOne({ id: r.value.seq, url: target_url }, 
                            function(err, r) {
                                if (err) throw err;
                                jsonResponse.short_url += r.ops[0].id;
                                res.send(JSON.stringify(jsonResponse));
                        });
            });
       }
    });
});

app.get(['/new', '/new/:url*'], function(req, res) {
    res.status(400).send(JSON.stringify({'error': 'Wrong url format, make sure you have a valid protocol and real site.'}));
});

app.get('/:id', connectDB, function(req, res) {
    var id = +req.params.id;
    var collection = req.db.collection('urls');
    collection.findOne({id: id}, function(err, doc) {
        if (err) throw err;
        if (doc)
            res.redirect(doc.url);
        else
            res.status(404).send(JSON.stringify({'error': 'This url is not on the database.'}));
    });
});

app.get('/', function(req, res) {
   res.sendFile('index.html', { root: __dirname + '/public'}); 
});

app.listen(process.env.PORT, function() {
    console.log('Listening on port ' + process.env.PORT);
});
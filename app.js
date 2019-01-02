var restify = require('restify');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var config = require('config');
var jwt = require('restify-jwt');
var secret = require('dvp-common/Authentication/Secret.js');
var authorization = require('dvp-common/Authentication/Authorization.js');
var externalProfileUploader = require('./externalProfileUploader');
var port = config.Host.port || 3000;
var host = config.Host.vdomain || 'localhost';
var mongoose = require('mongoose');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');

var server = restify.createServer({
    name: "DVP Contact base number upload Service"
});

server.pre(restify.pre.userAgentConnection());
server.use(restify.bodyParser({ mapParams: false }));

restify.CORS.ALLOW_HEADERS.push('authorization');
server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());

server.use(jwt({secret: secret.Secret}));

var util = require('util');
var mongoip=config.Mongo.ip;
var mongoport=config.Mongo.port;
var mongodb=config.Mongo.dbname;
var mongouser=config.Mongo.user;
var mongopass = config.Mongo.password;
var mongoreplicaset= config.Mongo.replicaset;

var connectionstring = '';

console.log(mongoip);

mongoip = mongoip.split(',');

console.log(mongoip);

if(util.isArray(mongoip)){

    if(mongoip.length > 1){

        mongoip.forEach(function(item){
            connectionstring += util.format('%s:%d,',item,mongoport)
        });

        connectionstring = connectionstring.substring(0, connectionstring.length - 1);
        connectionstring = util.format('mongodb://%s:%s@%s/%s',mongouser,mongopass,connectionstring,mongodb);

        if(mongoreplicaset){
            connectionstring = util.format('%s?replicaSet=%s',connectionstring,mongoreplicaset) ;
        }
    }else{

        connectionstring = util.format('mongodb://%s:%s@%s:%d/%s',mongouser,mongopass,mongoip[0],mongoport,mongodb)
    }

}else{

    connectionstring = util.format('mongodb://%s:%s@%s:%d/%s',mongouser,mongopass,mongoip,mongoport,mongodb)
}

console.log(connectionstring);

mongoose.connect(connectionstring,{server:{auto_reconnect:true}});


mongoose.connection.on('error', function (err) {
    console.error( new Error(err));
    mongoose.disconnect();

});

mongoose.connection.on('opening', function() {
    console.log("reconnecting... %d", mongoose.connection.readyState);
});


mongoose.connection.on('disconnected', function() {
    console.error( new Error('Could not connect to database'));
    mongoose.connect(connectionstring,{server:{auto_reconnect:true}});
});

mongoose.connection.once('open', function() {
    console.log("Connected to db");

});


mongoose.connection.on('reconnected', function () {
    console.log('MongoDB reconnected!');
});


process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

server.post('/DVP/API/:version/Campaign/:CampaignID/Contacts', authorization({
    resource: "campaign",
    action: "write"
}), function (req, res, next) {
    try {
        logger.info('UploadExternalProfile');
        externalProfileUploader.UploadExternalProfile(req,res);
    }
    catch (ex) {
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.error('UploadExternalProfile : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

server.post('/DVP/API/:version/Campaign/:CampaignID/Contacts/:Status', authorization({
    resource: "campaign",
    action: "write"
}), function (req, res, next) {
    try {
        logger.info('UpdateContactStatus');
        externalProfileUploader.UpdateContactStatus(req,res);
    }
    catch (ex) {
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.error('UpdateContactStatus : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

server.del('/DVP/API/:version/Campaign/:CampaignID/Contacts', authorization({
    resource: "campaign",
    action: "delete"
}), function (req, res, next) {
    try {
        logger.info('GetContactsCountByCampaign');
        externalProfileUploader.DeleteContacts(req,res);
    }
    catch (ex) {
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.error('GetContactsCountByCampaign : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

server.get('/DVP/API/:version/Campaign/:CampaignID/Contacts/:row_count/:offset', authorization({
    resource: "campaign",
    action: "write"
}), function (req, res, next) {
    try {
        logger.info('GetContactsByCampaign');
        externalProfileUploader.GetContactsByCampaign(req,res);
    }
    catch (ex) {
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.error('GetContactsByCampaign : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

server.listen(port, function () {
    logger.info("Contact base number Upload Server %s listening at %s", server.name, server.url);
});




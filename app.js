let restify = require('restify');
let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
let config = require('config');
let jwt = require('restify-jwt');
let secret = require('dvp-common/Authentication/Secret.js');
let authorization = require('dvp-common/Authentication/Authorization.js');
let externalProfileUploader = require('./externalProfileUploader');
let port = config.Host.port || 3000;
let host = config.Host.vdomain || 'localhost';
let mongoose = require('mongoose');
let messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');

let server = restify.createServer({
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

let util = require('util');
let mongoip=config.Mongo.ip;
let mongoport=config.Mongo.port;
let mongodb=config.Mongo.dbname;
let mongouser=config.Mongo.user;
let mongopass = config.Mongo.password;
let mongoreplicaset= config.Mongo.replicaset;

let connectionstring = '';

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

/*{
    "contacts":[{"firstname":"John", "lastname":"Smith","phone":"187078978505654078978","PreviewData":{"loan":"duo","ssn":"werwerwe"}, "contacts":[{"contact": "18705056560","type": "land","display": "18705056560","verified": true}]},
    {"firstname":"John", "lastname":"Smith","phone":"+941234567845345349999955665555","PreviewData":"credit"},
    {"firstname":"Mozella", "lastname":"Knutsen","phone":"+94122984552526789","contacts_update":true,"contacts":[{"contact": "+94123456789","type": "land","display": "+94123456789","verified": false},{"contact": "0773458612","type": "mobile","display": "0773458612","verified": true}],"PreviewData":"loan123"}]
}*/

server.post('/DVP/API/:version/Campaign/:CampaignID/Contacts', authorization({
    resource: "campaign",
    action: "write"
}), function (req, res, next) {
    try {
        logger.info('UploadExternalProfile');
        externalProfileUploader.UploadExternalProfile(req,res);
    }
    catch (ex) {
        let jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
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
        let jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
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
        let jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
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
        let jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.error('GetContactsByCampaign : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

server.listen(port, function () {
    logger.info("Contact base number Upload Server %s listening at %s", server.name, server.url);
});




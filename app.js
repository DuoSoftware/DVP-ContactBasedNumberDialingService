let restify = require("restify");
let logger = require("dvp-common-lite/LogHandler/CommonLogHandler.js").logger;
let config = require("config");
let jwt = require("restify-jwt");
let secret = require("dvp-common-lite/Authentication/Secret.js");
let authorization = require("dvp-common-lite/Authentication/Authorization.js");
let externalProfileUploader = require("./externalProfileUploader");
let port = config.Host.port || 3000;
let host = config.Host.vdomain || "localhost";
let mongoose = require("mongoose");
let messageFormatter = require("dvp-common-lite/CommonMessageGenerator/ClientMessageJsonFormatter.js");

let server = restify.createServer({
  name: "DVP Contact base number upload Service",
});

server.pre(restify.pre.userAgentConnection());
server.use(restify.bodyParser({ mapParams: false }));

restify.CORS.ALLOW_HEADERS.push("authorization");
server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());

server.use(jwt({ secret: secret.Secret }));
let dbconn = require("dvp-mongomodels");
let util = require("util");

/*{
    "contacts":[{"firstname":"John", "lastname":"Smith","phone":"187078978505654078978","PreviewData":{"loan":"duo","ssn":"werwerwe"}, "contacts":[{"contact": "18705056560","type": "land","display": "18705056560","verified": true}]},
    {"firstname":"John", "lastname":"Smith","phone":"+941234567845345349999955665555","PreviewData":"credit"},
    {"firstname":"Mozella", "lastname":"Knutsen","phone":"+94122984552526789","contacts_update":true,"contacts":[{"contact": "+94123456789","type": "land","display": "+94123456789","verified": false},{"contact": "0773458612","type": "mobile","display": "0773458612","verified": true}],"PreviewData":"loan123"}]
}*/

server.post(
  "/DVP/API/:version/Campaign/:CampaignID/Contacts",
  authorization({
    resource: "campaignnumbers",
    action: "write",
  }),
  function (req, res, next) {
    try {
      let jsonString = messageFormatter.FormatMessage(
        undefined,
        "UploadExternalProfile",
        true,
        req.body
      );
      logger.debug(jsonString);
      externalProfileUploader.UploadExternalProfile(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("UploadExternalProfile : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.post(
  "/DVP/API/:version/Campaign/:CampaignID/Contacts/:Status",
  authorization({
    resource: "campaignnumbers",
    action: "write",
  }),
  function (req, res, next) {
    try {
      logger.info("UpdateContactStatus");
      externalProfileUploader.UpdateContactStatus(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("UpdateContactStatus : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.del(
  "/DVP/API/:version/Campaign/:CampaignID/Contacts",
  authorization({
    resource: "campaignnumbers",
    action: "delete",
  }),
  function (req, res, next) {
    try {
      logger.info("GetContactsCountByCampaign");
      externalProfileUploader.DeleteContacts(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("GetContactsCountByCampaign : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.get(
  "/DVP/API/:version/Campaign/:CampaignID/Contacts/:row_count/:offset",
  authorization({
    resource: "campaignnumbers",
    action: "read",
  }),
  function (req, res, next) {
    try {
      logger.info("GetContactsByCampaign");
      externalProfileUploader.GetContactsByCampaign(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("GetContactsByCampaign : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.get(
  "/DVP/API/:version/Campaign/ProfilesCount",
  authorization({
    resource: "campaignnumbers",
    action: "read",
  }),
  function (req, res, next) {
    try {
      logger.info("GetContactsByCampaign");
      externalProfileUploader.ProfilesCount(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("GetContactsByCampaign : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.get(
  "/DVP/API/:version/Campaign/ProfileContactsCount",
  authorization({
    resource: "campaignnumbers",
    action: "read",
  }),
  function (req, res, next) {
    try {
      logger.info("GetContactsByCampaign");
      externalProfileUploader.ProfileContactsCount(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("GetContactsByCampaign : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.del(
  "/DVP/API/:version/Campaign/:CampaignID/Contacts",
  authorization({
    resource: "campaignnumbers",
    action: "write",
  }),
  function (req, res, next) {
    try {
      logger.info("DeleteContacts");
      externalProfileUploader.DeleteContacts(req, res);
    } catch (ex) {
      let jsonString = messageFormatter.FormatMessage(
        ex,
        "EXCEPTION",
        false,
        undefined
      );
      logger.error("DeleteContacts : %s ", jsonString);
      res.end(jsonString);
    }
    return next();
  }
);

server.listen(port, function () {
  logger.info(
    "Contact base number Upload Server %s listening at %s",
    server.name,
    server.url
  );
});

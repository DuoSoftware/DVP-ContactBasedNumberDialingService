var config = require("config");
var validator = require("validator");
var util = require("util");
var logger = require("dvp-common-lite/LogHandler/CommonLogHandler.js").logger;
var request = require("request");

function DoPost(companyInfo, eventName, serviceurl, postData, callback) {
  var jsonStr = JSON.stringify(postData);
  logger.info(
    "Notification Url:: " + serviceurl + " :: Notification Data :: " + jsonStr
  );
  var accessToken = util.format("bearer %s", config.Services.accessToken);
  var options = {
    url: serviceurl,
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: accessToken,
      companyinfo: companyInfo,
      eventname: eventName,
    },
    body: jsonStr,
  };
  try {
    request.post(options, function optionalCallback(err, httpResponse, body) {
      if (err) {
        console.log("upload failed:", err);
      }
      console.log("Server returned: %j", body);
      callback(err, httpResponse, body);
    });
  } catch (ex) {
    callback(ex, undefined, undefined);
  }
}

module.exports.RequestToNotify = function (
  company,
  tenant,
  roomName,
  eventName,
  msgData
) {
  try {
    var notificationUrl = util.format(
      "http://%s/DVP/API/%s/NotificationService/Notification/initiate/%s",
      config.Services.notificationServiceHost,
      config.Services.notificationServiceVersion,
      roomName
    );
    if (
      config.Services.dynamicPort ||
      validator.isIP(config.Services.notificationServiceHost)
    ) {
      notificationUrl = util.format(
        "http://%s:%s/DVP/API/%s/NotificationService/Notification/initiate/%s",
        config.Services.notificationServiceHost,
        config.Services.notificationServicePort,
        config.Services.notificationServiceVersion,
        roomName
      );
    }
    var companyInfo = util.format("%d:%d", tenant, company);
    DoPost(companyInfo, eventName, notificationUrl, msgData, function (
      err,
      res1,
      result
    ) {
      if (err) {
        logger.error("Do Post: Error:: " + err);
      } else {
        if (res1.statusCode === 200) {
          logger.info("Do Post: Success " + roomName + " : " + eventName);
        } else {
          logger.info("Do Post: Failed " + roomName + " : " + eventName);
        }
      }
    });
  } catch (ex) {
    logger.error("Do Post: Error:: " + ex);
  }
};

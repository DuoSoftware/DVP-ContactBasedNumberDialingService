let redis = require("ioredis");
let Config = require('config');
let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
let consolelogger = require('./console_log_handler');

////////////////////////////////redis////////////////////////////////////////
let redisip = Config.Redis.ip;
let redisport = Config.Redis.port;
let redispass = Config.Redis.password;
let redismode = Config.Redis.mode;
let redisdb = Config.Redis.db;


//[redis:]//[user][:password@][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]
//redis://user:secret@localhost:6379
let redisSetting = {
    port: redisport,
    host: redisip,
    family: 4,
    db: redisdb,
    password: redispass,
    retryStrategy: function (times) {
        consolelogger.log_message(consolelogger.loglevels.info, "retryStrategy");
        let delay = Math.min(times * 50, 2000);
        return delay;
    },
    reconnectOnError: function (err) {
        logger.error('contact upload - REDIS ERROR', err);
        consolelogger.log_message(consolelogger.loglevels.error, err);
        return true;
    }
};

if (redismode == 'sentinel') {

    if (Config.Redis.sentinels && Config.Redis.sentinels.hosts && Config.Redis.sentinels.port && Config.Redis.sentinels.name) {
        let sentinelHosts = Config.Redis.sentinels.hosts.split(',');
        if (Array.isArray(sentinelHosts) && sentinelHosts.length > 2) {
            let sentinelConnections = [];

            sentinelHosts.forEach(function (item) {

                sentinelConnections.push({host: item, port: Config.Redis.sentinels.port})

            });

            redisSetting = {
                sentinels: sentinelConnections,
                name: Config.Redis.sentinels.name,
                password: redispass
            }

        } else {

            let msg = "No enough sentinel servers found .........";
            logger.error('contact upload - REDIS ERROR', msg);
            consolelogger.log_message(consolelogger.loglevels.error, msg);
        }

    }
}

let client = undefined;

if (redismode != "cluster") {
    client = new redis(redisSetting);
} else {

    let redisHosts = redisip.split(",");
    if (Array.isArray(redisHosts)) {


        redisSetting = [];
        redisHosts.forEach(function (item) {
            redisSetting.push({
                host: item,
                port: redisport,
                family: 4,
                password: redispass
            });
        });

        client = new redis.Cluster([redisSetting]);

    } else {

        client = new redis(redisSetting);
    }
}

module.exports.incrby = function (key, value) {

    return new Promise((resolve, reject) => {
        try {
            client.incrby(key,parseInt(value), function (err, response) {

                if (err) {
                    logger.error('contact upload - REDIS ERROR', err);
                    consolelogger.log_message(consolelogger.loglevels.error, err);
                    reject(err)
                }
                consolelogger.log_message(consolelogger.loglevels.info, response);
                resolve(response)
            });
        } catch (err) {
            consolelogger.log_message(consolelogger.loglevels.error, err);
            reject(err);
        }

    });
};

module.exports.get_value = function (key) {

    return new Promise((resolve, reject) => {
        try {
            client.get(key, function (err, response) {

                if (err) {
                    logger.error('contact upload - REDIS ERROR', err);
                    consolelogger.log_message(consolelogger.loglevels.error, err);
                    reject(err)
                }
                resolve(response)
            });
        } catch (err) {
            consolelogger.log_message(consolelogger.loglevels.error, err);
            reject(err);
        }

    });
};

client.on('error', function (msg) {
    logger.error('contact upload - REDIS ERROR', msg);
    consolelogger.log_message(consolelogger.loglevels.error, msg);
});


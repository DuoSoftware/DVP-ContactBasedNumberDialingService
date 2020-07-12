module.exports = {
  DB: {
    Type: "SYS_DATABASE_TYPE",
    User: "SYS_DATABASE_POSTGRES_USER",
    Password: "SYS_DATABASE_POSTGRES_PASSWORD",
    Port: "SYS_SQL_PORT",
    Host: "SYS_DATABASE_HOST",
    Database: "SYS_DATABASE_POSTGRES_USER",
  },

  Redis: {
    mode: "SYS_REDIS_MODE",
    ip: "SYS_REDIS_HOST",
    port: "SYS_REDIS_PORT",
    user: "SYS_REDIS_USER",
    password: "SYS_REDIS_PASSWORD",
    sentinels: {
      hosts: "SYS_REDIS_SENTINEL_HOSTS",
      port: "SYS_REDIS_SENTINEL_PORT",
      name: "SYS_REDIS_SENTINEL_NAME",
    },
  },

  Security: {
    ip: "SYS_REDIS_HOST",
    port: "SYS_REDIS_PORT",
    user: "SYS_REDIS_USER",
    password: "SYS_REDIS_PASSWORD",
    mode: "SYS_REDIS_MODE",
    sentinels: {
      hosts: "SYS_REDIS_SENTINEL_HOSTS",
      port: "SYS_REDIS_SENTINEL_PORT",
      name: "SYS_REDIS_SENTINEL_NAME",
    },
  },

  Mongo: {
    ip: "SYS_MONGO_HOST",
    port: "SYS_MONGO_PORT",
    dbname: "SYS_MONGO_DB",
    password: "SYS_MONGO_PASSWORD",
    user: "SYS_MONGO_USER",
    replicaset: "SYS_MONGO_REPLICASETNAME",
  },

  Host: {
    profilesearch: "EXTERNAL_PROFILE_SEARCH",
    vdomain: "LB_FRONTEND",
    domain: "HOST_NAME",
    port: "HOST_CONTACTBASEDNUMBERDIALINGSERVICE_PORT",
    version: "HOST_VERSION",
  },

  LBServer: {
    ip: "LB_FRONTEND",
    port: "LB_PORT",
  },
  Services: {
    accessToken: "HOST_TOKEN",
    notificationServiceHost: "SYS_NOTIFICATIONSERVICE_HOST",
    notificationServicePort: "SYS_NOTIFICATIONSERVICE_PORT",
    notificationServiceVersion: "SYS_NOTIFICATIONSERVICE_VERSION",
  },
};

//NODE_CONFIG_DIR

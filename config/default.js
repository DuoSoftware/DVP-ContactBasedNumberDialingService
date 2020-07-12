module.exports = {
  Host: {
    resource: "cluster",
    vdomain: "localhost",
    domain: "localhost",
    port: "8899",
    version: "1.0.0.0",
  },
  DB: {
    Type: "postgres",
    User: "",
    Password: "",
    Port: 5432,
    Host: "",
    Database: "",
  },
  Mongo: {
    ip: "",
    port: "",
    dbname: "dvpdb",
    password: "",
    user: "duo",
    replicaset: "",
    type: "mongodb+srv",
  },
  Security: {
    ip: "",
    port: 6379,
    user: "duo",
    password: "",
    mode: "instance", //instance, cluster, sentinel
    sentinels: {
      hosts: "",
      port: 16389,
      name: "redis-cluster",
    },
  },
  Redis: {
    mode: "", //instance, cluster, sentinel
    ip: "",
    port: 6379,
    user: "",
    password: "",
    db: 4,
    sentinels: {
      hosts: "",
      port: 16389,
      name: "redis-cluster",
    },
  },
  Services: {
    accessToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
    notificationServiceHost: "notificationservice.app.veery.cloud",
    notificationServicePort: "8089",
    notificationServiceVersion: "1.0.0.0",
    dynamicPort: true,
  },
};

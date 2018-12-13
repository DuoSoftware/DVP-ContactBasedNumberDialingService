module.exports = {
    "Host":
        {
            "resource": "",
            "vdomain": "",
            "domain": "",
            "port": "",
            "version": ""
        },
    "DB": {
        "Type":"",
        "User":"",
        "Password":"",
        "Port":"",
        "Host":"",
        "Database":""
    },
    "Mongo":
        {
            "ip":"",
            "port":"",
            "dbname":"",
            "password":"",
            "user":"",
            "replicaset" :""
        },
    "Security":
        {

            "ip" : "",
            "port": "",
            "user": "",
            "password": "",
            "mode":"",//instance, cluster, sentinel
              "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port":16389,
                "name":"redis-cluster"
            }
        }
};

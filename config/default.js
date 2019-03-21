module.exports = {
    "Host":
        {
            "resource": "cluster",
            "vdomain": "localhost",
            "domain": "localhost",
            "port": "2627",
            "version": "1.0.0.0"
        },
    "DB": {
        "Type": "postgres",
        "User": "duo",
        "Password": "DuoS123",
        "Port": 5432,
        "Host": "104.236.231.11",
        "Database": "duo"
    },
    "Mongo":
        {
            "ip": "104.236.231.11",
            "port": "27017",
            "dbname": "dvpdb",
            "password": "DuoS123",
            "user": "duo",
            "replicaset": ""
        },
    "Security":
        {

            "ip": "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "mode": "sentinel",//instance, cluster, sentinel
            "sentinels": {
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port": 16389,
                "name": "redis-cluster"
            }
        },
    "Redis":
        {
            "mode":"instance",//instance, cluster, sentinel
            "ip": "138.197.90.92",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "db": 4,
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,162.243.81.39",
                "port":16389,
                "name":"redis-cluster"
            }

        }
};

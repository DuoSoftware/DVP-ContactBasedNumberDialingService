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

            "ip": "138.197.90.92",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "mode": "instance",//instance, cluster, sentinel
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

        },
    "Services" : {
        "accessToken":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
        "notificationServiceHost": "notificationservice.app.veery.cloud",
        "notificationServicePort": "8089",
        "notificationServiceVersion": "1.0.0.0"
    }
};

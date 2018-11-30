/**
 * Created by a on 11/26/2018.
 */

var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var ExternalUser = require('dvp-mongomodels/model/ExternalUser');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var DbConn = require('dvp-dbmodels');
var async = require("async");


function increment(counter) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(counter + 1);
        }, 1000);
    });
}

async function chainStart(){
    let counter = 0;
    counter = await increment(counter); // 1
    counter = await increment(counter); // 2
    return counter;
}

chainStart()
    .then(val => {
        console.log(val);
    })
    .catch( error => {
        console.log(error);
    });

var uploaded_to_campaign = function (contacts,tenantId,companyId,req,res) {

    var campaignID = parseInt(req.params.CampaignID);
    var batchNo = req.body.batchNo;
    var nos = [];

    if (contacts) {
        for (var i = 0; i < contacts.length; i++) {
            var no = {
                ExternalUserID: contacts[i]._id.toString(),
                CampaignID: campaignID,
                Status: true,
                TenantId: tenantId,
                CompanyId: companyId,
                BatchNo:batchNo
            };
            nos.push(no);
        }
    }
    var jsonString;
    DbConn.CampContactbaseNumbers.bulkCreate(
        nos, {validate: false, individualHooks: true}
    ).then(function (results) {
        jsonString = messageFormatter.FormatMessage(undefined, "" , true, contacts);
        res.end(jsonString);
    }).catch(function (err) {
        jsonString = messageFormatter.FormatMessage(undefined, "Fail to Upload to campaign number base " , false, undefined);
        res.end(jsonString);
    }).finally(function () {
        logger.info('UploadContacts Done.');
    });

};

module.exports.UploadExternalProfile = function (req, res) {

    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);
    var maxLength = 1000;
    var errorList = {errors: [], duplicate: []};
    var externalUsers = [];
    var data_list = {duplicate:[],new:[]};
    if (req.body && req.body.contacts && req.body.contacts.length <= maxLength) {

        async.series([
                function(callback) {
                    // do some stuff ...
                    callback(null, 'one');
                },
                function(callback) {
                    // do some more stuff ...
                    callback(null, 'two');
                }
            ],
            function(err, results) {
                // results is now equal to ['one', 'two']
            });

        async.map(req.body.contacts, function(contact, callback) {
            if (contact && contact.firstname && contact.lastname && contact.phone) {

                ExternalUser.findOne({phone: contact.phone, company: company, tenant: tenant}, function (err, users) {
                    if (err) {
                        callback(null, null);
                    } else {
                        if (users) {
                            data_list.duplicate.push(users);
                            callback(null, users._doc);
                        } else {
                            var extUser = ExternalUser({
                                title: contact.title,
                                name: contact.name,
                                avatar: contact.avatar,
                                birthday: contact.birthday,
                                gender: contact.gender,
                                firstname: contact.firstname,
                                lastname: contact.lastname,
                                locale: contact.locale,
                                ssn: contact.ssn,
                                phone: contact.phone,
                                email: contact.email,
                                company: company,
                                tenant: tenant,
                                created_at: Date.now(),
                                updated_at: Date.now(),
                                tags: contact.tags,
                                contacts: [],
                                custom_fields: []
                            });

                            if (contact.address) {
                                extUser.address = {
                                    zipcode: contact.address.zipcode,
                                    number: contact.address.number,
                                    street: contact.address.street,
                                    city: contact.address.city,
                                    province: contact.address.province,
                                    country: contact.address.country
                                }
                            }

                            if (contact.contacts) {
                                contact.contacts.map(function (item) {
                                    if (item) {
                                        extUser.contacts.push({
                                            contact: item.contact,
                                            type: item.type,
                                            display: item.display,
                                            verified: false,
                                            raw: {}
                                        });
                                    }
                                });
                            }

                            if (contact.custom_fields) {
                                contact.custom_fields.map(function (item) {
                                    if (item && item.key) {
                                        extUser.custom_fields.push({
                                            field: item.key, value: item.value
                                        });
                                    }
                                });
                            }
                            data_list.new.push(extUser._doc);
                            callback(null, extUser);
                        }
                    }
                });
            } else {
                callback(null, null)
            }

        }, function(err, result) {
            try {
                if(data_list.new.length>0){
                    ExternalUser.insertMany(data_list.new, function (err, docs) {
                        if (err) {
                            jsonString = messageFormatter.FormatMessage(err, "User save failed", false, errorList);
                            res.end(jsonString);
                        } else {
                            if (req.params.CampaignID) {
                                uploaded_to_campaign(docs.concat(data_list.duplicate),tenant,company,req,res);
                            } else {
                                jsonString = messageFormatter.FormatMessage(errorList, "Users saved successfully", true, docs);
                                res.end(jsonString);
                            }

                        }
                    });
                }
                else{
                    if (req.params.CampaignID) {
                        uploaded_to_campaign(data_list.duplicate,tenant,company,req,res);
                    } else {
                        jsonString = messageFormatter.FormatMessage(errorList, "Users saved successfully", true, docs);
                        res.end(jsonString);
                    }
                }
            } catch (e) {
                console.error(e);
            }



        });

        /*req.body.contacts.map(function (contact) {
            if (contact && contact.firstname && contact.lastname && contact.phone) {

                ExternalUser.findOne({phone: contact.phone, company: company, tenant: tenant}, function (err, users) {
                    if (err) {
                        errorList.errors.push(contact);
                    } else {
                        if (users) {
                            errorList.duplicate.push(contact);
                        } else {
                            var extUser = ExternalUser({
                                title: contact.title,
                                name: contact.name,
                                avatar: contact.avatar,
                                birthday: contact.birthday,
                                gender: contact.gender,
                                firstname: contact.firstname,
                                lastname: contact.lastname,
                                locale: contact.locale,
                                ssn: contact.ssn,
                                phone: contact.phone,
                                email: contact.email,
                                company: company,
                                tenant: tenant,
                                created_at: Date.now(),
                                updated_at: Date.now(),
                                tags: contact.tags,
                                contacts: [],
                                custom_fields: []
                            });

                            if (contact.address) {
                                extUser.address = {
                                    zipcode: contact.address.zipcode,
                                    number: contact.address.number,
                                    street: contact.address.street,
                                    city: contact.address.city,
                                    province: contact.address.province,
                                    country: contact.address.country
                                }
                            }

                            if (contact.contacts) {
                                contact.contacts.map(function (item) {
                                    if (item) {
                                        extUser.contacts.push({
                                            contact: item.contact,
                                            type: item.type,
                                            display: item.display,
                                            verified: false,
                                            raw: {}
                                        });
                                    }
                                });
                            }

                            if (contact.custom_fields) {
                                contact.custom_fields.map(function (item) {
                                    if (item && item.key) {
                                        extUser.custom_fields.push({
                                            field: item.key, value: item.value
                                        });
                                    }
                                });
                            }
                            externalUsers.push(extUser);
                        }
                    }
                });
            } else {
                errorList.errors.push(contact);
            }
        });*/
       /* ExternalUser.insertMany(externalUsers, function (err, docs) {
            if (err) {
                jsonString = messageFormatter.FormatMessage(err, "User save failed", false, errorList);
                res.end(jsonString);
            } else {
                if (req.params.CampaignID) {
                    uploaded_to_campaign(docs,tenant,company,req,res);
                } else {
                    jsonString = messageFormatter.FormatMessage(errorList, "Users saved successfully", true, docs);
                    res.end(jsonString);
                }

            }
        });*/
    }
    else {
        jsonString = messageFormatter.FormatMessage(undefined, "To Many Contacts To Upload. Max Limit is " + maxLength, false, undefined);
        res.end(jsonString);
    }
};
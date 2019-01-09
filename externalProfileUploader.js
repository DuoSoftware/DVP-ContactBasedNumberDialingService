/**
 * Created by a on 11/26/2018.
 */

let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
let ExternalUser = require('dvp-mongomodels/model/ExternalUser');
let bulk = require('dvp-mongomodels/model/ExternalUser').collection.initializeOrderedBulkOp();
//let People = require("./models/people").collection.initializeOrderedBulkOp();
let messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
let DbConn = require('dvp-dbmodels');
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let ObjectId = Schema.ObjectId;

/*---------------------- number Upload -------------------------------------*/

function validate_external_profile(contact, tenant, company) {
    let condition = contact.thirdpartyreference?{thirdpartyreference: contact.thirdpartyreference, company: company, tenant: tenant}:{phone: contact.phone, company: company, tenant: tenant};
    return ExternalUser.findOne(condition);

   /* return new Promise((resolve, reject) => {
        let condition = contact.thirdpartyreference ? {
            thirdpartyreference: contact.thirdpartyreference,
            company: company,
            tenant: tenant
        } : {phone: contact.phone, company: company, tenant: tenant};
        ExternalUser.findOne(condition, function (err, obj) {
            if (err) {
                reject(err);
            } else if (obj === null && contact.thirdpartyreference) {
                ExternalUser.findOne({phone: contact.phone, company: company, tenant: tenant}, function (err, obj) {
                    if (err) {
                        reject(err);
                    }  else {
                        resolve(obj === null?obj:{});
                    }
                });
            } else {
                resolve(obj)
            }
        });
    });*/

}

function build_new_external_profile(contact, tenant, company) {
    return new Promise((resolve, reject) => {
        let extUser = ExternalUser({
            thirdpartyreference: contact.thirdpartyreference,
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
            api_contacts: [],
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
                    extUser.api_contacts.push({
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
        resolve(extUser);
    });
}


async function process_external_profile(contact, tenantId, companyId) {
    let profile_list = {new_profile: null, existing_profile: null};
    let existing_profile = await validate_external_profile(contact, tenantId, companyId);

    if (existing_profile == null) {
        profile_list.new_profile = await build_new_external_profile(contact, tenantId, companyId);
        profile_list.new_profile._doc.PreviewData = JSON.stringify(contact.PreviewData);
    }
    else {

        if (existing_profile._doc) {
            if (contact.contacts && contact.contacts_update) {

                contact.contacts.map(function (item) {
                    if (existing_profile._doc)
                        existing_profile._doc.contacts.push(item);
                });

            } else {
                existing_profile._doc.contacts = contact.contacts;
            }
            if (existing_profile._doc.thirdpartyreference === contact.thirdpartyreference) {
                existing_profile._doc.phone = contact.phone;
            }

            existing_profile._doc.contacts_update = contact.contacts_update;
            existing_profile._doc.PreviewData = JSON.stringify(contact.PreviewData);
            profile_list.existing_profile = existing_profile;
        }

    }
    return profile_list;
}

async function update_existing_profile(profiles) {

    /*bulk.find({"email" : "sukithaj@gmail.com"}).update({'$addToSet': {
            'contacts': {
                "verified" : false,
                "display" : "Pawan Sasanka",
                "type" : "email",
                "contact" : "pawan@duosoftware.com"
            }
        }},{ upsert: true });*/

    return new Promise((resolve, reject) => {
        let bulk = require('dvp-mongomodels/model/ExternalUser').collection.initializeOrderedBulkOp();

        profiles.forEach(function (profile) {
            if (profile && profile._doc.contacts) {
                if (profile._doc.contacts_update) {
                    profile._doc.contacts.forEach(function (item) {
                        if (item._doc) {
                            bulk.find({_id: mongoose.Types.ObjectId(profile._doc._id.toString())}).update({
                                '$addToSet': {

                                    'api_contacts': {
                                        "contact": item._doc.contact,
                                        "type": item._doc.type,
                                        "display": item._doc.display,
                                        "verified": item._doc.verified
                                    }
                                },
                                '$set': {'phone': profile._doc.phone}
                            }, {upsert: true});
                        }
                    })
                }
                else {
                    bulk.find({_id: mongoose.Types.ObjectId(profile._doc._id.toString())}).update(
                        {$set: {'api_contacts': profile._doc.contacts, 'phone': profile._doc.phone}}
                    )
                }
            }

        });
        bulk.execute(function (error) {
            console.log(error);
            if (error) {
                reject(error)
            } else {
                resolve(error)
            }
        })
    });
}

async function save_new_external_profiles(profiles) {
    /* return ExternalUser.insertMany(profiles, function (err, docs) {
          if (err) {
              jsonString = messageFormatter.FormatMessage(err, "User save failed", false, errorList);
              res.end(jsonString);
          } else {
              if (req.params.CampaignID) {
                  uploaded_to_campaign(docs.concat(data_list.duplicate), tenant, company, req, res);
              } else {
                  jsonString = messageFormatter.FormatMessage(errorList, "Users saved successfully", true, docs);
                  res.end(jsonString);
              }

          }
      });*/
    return new Promise((resolve, reject) => {
        try {
            ExternalUser.insertMany(profiles, function (err, docs) {
                if (err) {
                    reject(err)
                } else {
                    resolve(docs)
                }
            });
        } catch (err) {
            console.log(err)
            reject(err);
        }

    });

    // return ExternalUser.insertMany(profiles);
}

async function save_new_contacts(contacts, campaignID, tenant, company, batchNo) {

    let nos = [];

    if (contacts) {
        for (let i = 0; i < contacts.length; i++) {
            if (contacts[i]) {
                let no = {
                    ExternalUserID: contacts[i]._doc._id.toString(),
                    CampaignId: campaignID,
                    Status: true,
                    TenantId: tenant,
                    CompanyId: company,
                    BatchNo: batchNo ? batchNo : "default",
                    DialerStatus: 'added',
                    PreviewData: contacts[i]._doc.PreviewData
                };
                nos.push(no);
            }

        }
    }

    /*return new Promise((resolve, reject) => {
        DbConn.CampContactbaseNumbers.bulkCreate(nos).then(() => {
            console.log("Fasfasas");
            resolve(resolve,reject);
        }).spread((affectedCount, affectedRows) => {
            resolve(resolve,reject);
            console.log(affectedCount+":"+affectedRows);
        }).then(tasks => {
            resolve(tasks);
            console.log(tasks) // the 'programming' tasks will both have a status of 'inactive'
        }).error(function (err) {
            resolve(err);
        });
    });
*/

    return new Promise((resolve, reject) => {
        DbConn.CampContactbaseNumbers.bulkCreate(
            nos, {validate: false, individualHooks: true, ignoreDuplicates: true}
        ).then(function (results) {
            resolve(results);
        }).catch(function (err) {
            reject(err)
        });
    });

    /*return DbConn.CampContactbaseNumbers.bulkCreate(
        nos,/!* {
            validate: false,
            individualHooks: true,
            ignoreDuplicates:false,
            //updateOnDuplicate: ["Status", "updatedAt"] //only supported by mysql
        }*!/
        {validate: false, individualHooks: true}
    );*/
}

async function process_upload_numbers(contacts, tenant, company, campaignID, batchNo) {
    let promises = contacts.map((contact) => process_external_profile(contact, tenant, company));
    let results = await Promise.all(promises);
    let profiles = {new_profiles: [], existing_profiles: []};
    results.forEach(function (profile) {
        if (profile && profile.new_profile) {
            profiles.new_profiles.push(profile.new_profile);
        } else {
            profiles.existing_profiles.push(profile.existing_profile);
        }
    });
    if (profiles.new_profiles.length > 0) {
        //profiles.new_profiles = await save_new_external_profiles(profiles.new_profiles);
        let saved_profiles = await save_new_external_profiles(profiles.new_profiles);
        profiles.new_profiles = Object.assign(saved_profiles, profiles.new_profiles);
    }
    if (profiles.existing_profiles.length > 0)
        await update_existing_profile(profiles.existing_profiles);
    let contact_list = profiles.new_profiles.concat(profiles.existing_profiles);
    let saved_data = await save_new_contacts(contact_list, campaignID, tenant, company, batchNo);
    return saved_data;
}

/*------------------------------- end number upload ----------------------------*/

/*--------------------------------- get numbers -----------------------------------*/

async function get_external_profiles(profile_ids, tenant, company) {

    return ExternalUser.find({
        company: company,
        tenant: tenant,
        '_id': {$in: profile_ids}
    }).select('phone api_contacts');
}

function update_loaded_numbers(CamContactBaseNumberIds) {


    DbConn.CampContactbaseNumbers.update({
            DialerStatus: "pick"
        },
        {
            where: [
                {
                    CamContactBaseNumberId: {$in: CamContactBaseNumberIds}
                }
            ]
        }
    ).then(function (results) {
        console.log(results);
    }).catch(function (err) {
        console.log(err);
    });

}

async function get_contact_by_campaign_id(campaign_id, offset, row_count, tenant, company) {
    /*return DbConn.CampContactbaseNumbers.findAll({
        where: [{CampaignId: campaign_id}, {TenantId: tenant}, {CompanyId: company}, {Status: 'added'}],
        offset: offset,
        limit: row_count,
        attributes: ['ExternalUserID']
    })*/

    return new Promise((resolve, reject) => {
        DbConn.CampContactbaseNumbers.findAll({
            where: [{CampaignId: campaign_id}, {TenantId: tenant}, {CompanyId: company}, {DialerStatus: 'added'}],
            offset: offset,
            limit: row_count,
            attributes: ['ExternalUserID', 'CamContactBaseNumberId', 'PreviewData']
        }).then(function (results) {
            if (results && results.length > 0) {
                let ids = results.map(function (item) {
                    return item.dataValues.CamContactBaseNumberId;
                });
                update_loaded_numbers(ids);
            }
            resolve(results);
        }).catch(function (err) {
            reject(err)
        });
    });
}

async function get_contact_processer(req, res) {
    let tenant = parseInt(req.user.tenant);
    let company = parseInt(req.user.company);
    let contact_list = await get_contact_by_campaign_id(req.params.CampaignID, req.params.offset, req.params.row_count, tenant, company);
    let external_profile_ids = [];
    let external_profile = {};
    contact_list.forEach(function (item) {
        external_profile_ids.push(item.ExternalUserID);
        external_profile[item.ExternalUserID] = item.PreviewData;
    });
    let profile_list = await get_external_profiles(external_profile_ids, tenant, company);

    if (profile_list) {
        profile_list = profile_list.map(function (item) {
            item._doc.PreviewData = external_profile[item._id.toString()];
            return item;
        })
    }
    console.log(profile_list);
    return profile_list;

}

/*--------------------------------- end get numbers -----------------------------------*/

async function UpdateContactStatus(req, res) {
    let tenant = parseInt(req.user.tenant);
    let company = parseInt(req.user.company);
    let campaign_id = req.params.CampaignID;
    let status = req.params.Status;

    let condition = [{CampaignId: campaign_id}, {TenantId: tenant}, {CompanyId: company}];
    let CamContactBaseNumberIds = req.body.CamContactBaseNumberIds;
    if (CamContactBaseNumberIds) {
        if (Array.isArray(CamContactBaseNumberIds))
            condition.push({CamContactBaseNumberId: {$in: CamContactBaseNumberIds}});
        else
            condition.push({CamContactBaseNumberId: CamContactBaseNumberIds});
    }


    return new Promise((resolve, reject) => {
        DbConn.CampContactbaseNumbers.update({
                DialerStatus: status
            },
            {
                where: condition
            }
        ).then(function (results) {
            resolve(results);
        }).catch(function (err) {
            reject(err)
        });
    });

}

async function DeleteContacts(req, res) {
    let tenant = parseInt(req.user.tenant);
    let company = parseInt(req.user.company);
    let campaign_id = req.params.CampaignID;

    let condition = [{CampaignId: campaign_id}, {TenantId: tenant}, {CompanyId: company}];
    let Contacts = req.body.Contacts;
    if (Contacts) {
        if (Array.isArray(Contacts))
            condition.push({CamContactBaseNumberId: {$in: Contacts}});
        else
            condition.push({CamContactBaseNumberId: Contacts});
    }


    return new Promise((resolve, reject) => {
        DbConn.CampContactbaseNumbers.destroy(
            {
                where: condition
            }
        ).then(function (results) {
            resolve(results);
        }).catch(function (err) {
            reject(err)
        });
    });

}

module.exports.UploadExternalProfile = function (req, res) {

    let jsonString;
    let tenant = parseInt(req.user.tenant);
    let company = parseInt(req.user.company);
    let maxLength = 1000;

    if (req.body && req.body.contacts && req.body.contacts.length <= maxLength) {

        let campaignID = parseInt(req.params.CampaignID);
        let batchNo = req.body.batchNo;
        process_upload_numbers(req.body.contacts, tenant, company, campaignID, batchNo).then(docs => {
            jsonString = messageFormatter.FormatMessage(null, "All Numbers Uploaded To System", true, docs);
            res.end(jsonString);
        }).catch(error => {
            jsonString = messageFormatter.FormatMessage(error, "All Non Duplicate Numbers Uploaded To System", false, null);
            res.end(jsonString);
        });

    }
    else {
        jsonString = messageFormatter.FormatMessage(undefined, "To Many Contacts To Upload. Max Limit is " + maxLength, false, undefined);
        res.end(jsonString);
    }
};

module.exports.GetContactsCountByCampaign = function (req, res) {
    let jsonString;
    let tenant = parseInt(req.user.tenant);
    let company = parseInt(req.user.company);
    if (req.params.CampaignID) {
        DbConn.CampContactbaseNumbers.count({
            where: [{CampaignId: req.params.CampaignID}, {TenantId: tenant}, {CompanyId: company}]
        }).then(function (count) {
            jsonString = messageFormatter.FormatMessage(undefined, "Contacts count", true, count);
            res.end(jsonString);
        }).catch(function (error) {
            jsonString = messageFormatter.FormatMessage(error, "Fail To Get contact count", false, error);
            res.end(jsonString);
        });
    } else {
        jsonString = messageFormatter.FormatMessage(undefined, "Missing some important parameters", false, undefined);
        res.end(jsonString);
    }
};

module.exports.GetContactsByCampaign = function (req, res) {
    let jsonString;

    if (req.params.CampaignID && req.params.offset && req.params.row_count) {
        get_contact_processer(req, res).then(profiles => {
            jsonString = messageFormatter.FormatMessage(undefined, "Contacts", true, profiles);
            res.end(jsonString);
        }).catch(error => {
            jsonString = messageFormatter.FormatMessage(error, "Fail To Get Contacts", false, null);
            res.end(jsonString);
        })
    } else {
        jsonString = messageFormatter.FormatMessage(undefined, "Missing some important parameters", false, undefined);
        res.end(jsonString);
    }
};

module.exports.UpdateContactStatus = function (req, res) {
    let jsonString;

    if (req.params.CampaignID) {
        UpdateContactStatus(req, res).then(profiles => {
            jsonString = messageFormatter.FormatMessage(undefined, "UpdateContactStatus", true, profiles);
            res.end(jsonString);
        }).catch(error => {
            jsonString = messageFormatter.FormatMessage(error, "Fail To Update ContactStatus", false, null);
            res.end(jsonString);
        })
    } else {
        jsonString = messageFormatter.FormatMessage(undefined, "Missing some important parameters", false, undefined);
        res.end(jsonString);
    }
};

module.exports.DeleteContacts = function (req, res) {
    let jsonString;

    if (req.params.CampaignID && req.body && req.body.Contacts) {
        DeleteContacts(req, res).then(profiles => {
            jsonString = messageFormatter.FormatMessage(undefined, "DeleteContacts", true, profiles);
            res.end(jsonString);
        }).catch(error => {
            jsonString = messageFormatter.FormatMessage(error, "Fail To DeleteContacts", false, null);
            res.end(jsonString);
        })
    } else {
        jsonString = messageFormatter.FormatMessage(undefined, "Missing some important parameters", false, undefined);
        res.end(jsonString);
    }
};
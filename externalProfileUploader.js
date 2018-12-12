/**
 * Created by a on 11/26/2018.
 */

var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var ExternalUser = require('dvp-mongomodels/model/ExternalUser');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var DbConn = require('dvp-dbmodels');

/*---------------------- number Upload -------------------------------------*/

function validate_external_profile(contact, tenant, company) {
    return ExternalUser.findOne({phone: contact.phone, company: company, tenant: tenant});
}

function build_new_external_profile(contact, tenant, company) {
    return new Promise((resolve, reject) => {
        let extUser = ExternalUser({
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
        resolve(extUser._doc);
    });
}

async function process_external_profile(contact, tenantId, companyId) {
    let profile_list = {new_profile: null, existing_profile: null};
    let existing_profile = await validate_external_profile(contact, tenantId, companyId);
    if (existing_profile == null) {
        profile_list.new_profile = await build_new_external_profile(contact, tenantId, companyId);
    }
    else {
        profile_list.existing_profile = existing_profile;
    }
    return profile_list;
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
        ExternalUser.insertMany(profiles, function (err, docs) {
            if (err) {
                reject(err)
            } else {
                resolve(docs)
            }
        });
    });

    // return ExternalUser.insertMany(profiles);
}

async function save_new_contacts(contacts, campaignID, tenant, company, batchNo) {

    var nos = [];

    if (contacts) {
        for (var i = 0; i < contacts.length; i++) {
            var no = {
                ExternalUserID: contacts[i]._doc._id.toString(),
                CampaignId: campaignID,
                Status: true,
                TenantId: tenant,
                CompanyId: company,
                BatchNo: batchNo ? batchNo : "default"
            };
            nos.push(no);
        }
    }

    return DbConn.CampContactbaseNumbers.bulkCreate(
        nos, {validate: true, individualHooks: true}
    );
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
    if (profiles.new_profiles.length > 0)
        profiles.new_profiles = await save_new_external_profiles(profiles.new_profiles);
    let contact_list = profiles.new_profiles.concat(profiles.existing_profiles);
    let saved_data = await save_new_contacts(contact_list, campaignID, tenant, company, batchNo);
    return saved_data;
}

/*------------------------------- end number upload ----------------------------*/

/*--------------------------------- get numbers -----------------------------------*/

async function get_external_profiles(profile_ids,tenant,company) {

    return ExternalUser.find({company: company, tenant: tenant,'_id': { $in: profile_ids}}).select('phone contacts');
}

async function get_contact_by_campaign_id(campaign_id,offset,row_count,tenant,company) {
    return DbConn.CampContactbaseNumbers.findAll({
        where: [{CampaignId: campaign_id},{TenantId: tenant},{CompanyId: company}],
        offset: offset,
        limit: row_count,
        attributes: ['ExternalUserID']
    })
}

async function  get_contact_processer(req,res){
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);
    let contact_list = await get_contact_by_campaign_id(req.params.CampaignID,req.params.offset,req.params.row_count,tenant,company);
    let external_profile_ids = [];
    contact_list.forEach(function (item) {
       external_profile_ids.push(item.ExternalUserID) ;
    });
    contact_list = await get_external_profiles(external_profile_ids,tenant,company);
    console.log(contact_list);
    return contact_list;

}

/*--------------------------------- end get numbers -----------------------------------*/


module.exports.UploadExternalProfile = function (req, res) {

    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);
    var maxLength = 1000;

    if (req.body && req.body.contacts && req.body.contacts.length <= maxLength) {

        var campaignID = parseInt(req.params.CampaignID);
        var batchNo = req.body.batchNo;
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
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);
    if(req.params.CampaignID ){
        DbConn.CampContactbaseNumbers.count({
            where: [{CampaignId: req.params.CampaignID },{TenantId: tenant},{CompanyId: company}]
        }).then(function (count) {
            jsonString = messageFormatter.FormatMessage(undefined, "Contacts count", true, count);
            res.end(jsonString);
        }).catch(function (error) {
            jsonString = messageFormatter.FormatMessage(error, "Fail To Get contact count" , false, error);
            res.end(jsonString);
        });
    }else {
        jsonString = messageFormatter.FormatMessage(undefined, "Missing some important parameters" , false, undefined);
        res.end(jsonString);
    }
};

module.exports.GetContactsByCampaign = function (req, res) {
    var jsonString;

    if(req.params.CampaignID && req.params.offset&&req.params.row_count){
     get_contact_processer(req,res).then(profiles=>{
         jsonString = messageFormatter.FormatMessage(undefined, "Contacts", true, profiles);
         res.end(jsonString);
     }).catch(error=>{
         jsonString = messageFormatter.FormatMessage(error, "Fail To Get Contacts", false, null);
         res.end(jsonString);
     })
    }else {
        jsonString = messageFormatter.FormatMessage(undefined, "Missing some important parameters" , false, undefined);
        res.end(jsonString);
    }
};
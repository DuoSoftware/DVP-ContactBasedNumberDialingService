/**
 * Created by a on 11/26/2018.
 */

let logger = require("dvp-common-lite/LogHandler/CommonLogHandler.js").logger;
let consolelogger = require("./console_log_handler");
let ExternalUser = require("dvp-mongomodels/model/ExternalUser");
let bulk = require("dvp-mongomodels/model/ExternalUser").collection.initializeOrderedBulkOp();
//let People = require("./models/people").collection.initializeOrderedBulkOp();
let messageFormatter = require("dvp-common-lite/CommonMessageGenerator/ClientMessageJsonFormatter.js");
let DbConn = require("dvp-dbmodels");
let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let ObjectId = Schema.ObjectId;
let redis_handler = require("./redis_handler");
let format = require("stringformat");
let notificationService = require("./notificationService");

let getCount = function (
  tenant,
  company,
  businessUnit,
  window,
  param1,
  param2
) {
  return new Promise((resolve, reject) => {
    try {
      let totalCountSearch = format(
        "CAM_TOTALCOUNT:{0}:{1}:{2}",
        tenant,
        company,
        window
      );
      if (param1)
        totalCountSearch = format(
          "CAM_TOTALCOUNT:{0}:{1}:{2}:CAMPAIGN:{3}",
          tenant,
          company,
          window,
          param1
        );
      if (param1 && param2)
        totalCountSearch = format(
          "CAM_TOTALCOUNT:{0}:{1}:{2}:CAMPAIGN:{3}:SCHEDULE:{4}",
          tenant,
          company,
          window,
          param1,
          param2
        );

      redis_handler
        .get_value(totalCountSearch)
        .then(function (result) {
          resolve(result);
        })
        .catch(function (err) {
          resolve(-1);
        });
    } catch (err) {
      consolelogger.log_message(consolelogger.loglevels.error, err);
      reject(err);
    }
  });
};

let get_dashborad_data = function (
  company,
  tenant,
  businessUnit,
  window,
  eventName,
  param1,
  param2
) {
  let counts = [
    getCount(tenant, company, businessUnit, window, null, null),
    getCount(tenant, company, businessUnit, window, param1, null),
    getCount(tenant, company, businessUnit, window, param1, param2),
  ];

  return Promise.all(counts).then((results) => {
    let reply = {
      roomData: { roomName: window + ":" + eventName, eventName: eventName },
      DashboardData: {
        businessUnit: "*",
        window: window,
        param1: param1,
        param2: param2,
        TotalCountWindow: results[0],
        TotalCountParam1: results[1],
        TotalCountParam2: results[2],
        TotalCountAllParams: results[0],
      },
    };

    let postData = {
      message: reply.DashboardData,
      From: "contactnumberupload",
    };
    notificationService.RequestToNotify(
      company,
      tenant,
      reply.roomData.roomName,
      reply.roomData.eventName,
      postData
    );
  });
};

function send_notification(company, tenant, campaignID, scheduleId) {
  try {
    Promise.all([
      get_dashborad_data(
        company,
        tenant,
        "*",
        "PROFILES",
        "PROFILESCOUNT",
        campaignID,
        scheduleId
      ),
      get_dashborad_data(
        company,
        tenant,
        "*",
        "PROFILESCONTACTS",
        "PROFILESCONTACTSCOUNT",
        campaignID,
        scheduleId
      ),
    ]).then((results) => {
      consolelogger.log_message(
        consolelogger.loglevels.info,
        "Notification Send"
      );
    });
  } catch (ex) {
    console.error(ex);
  }
}

function process_counters(
  tenant,
  company,
  campaignID,
  scheduleId,
  profile_count,
  profile_contact_count
) {
  try {
    profile_contact_count = profile_contact_count + 1;
    let key1 = format("CAM_TOTALCOUNT:{0}:{1}:PROFILES", tenant, company);
    let key2 = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILES:CAMPAIGN:{2}",
      tenant,
      company,
      campaignID
    );
    let key3 = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILES:CAMPAIGN:{2}:SCHEDULE:{3}",
      tenant,
      company,
      campaignID,
      scheduleId
    );

    let key4 = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILESCONTACTS",
      tenant,
      company
    );
    let key5 = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILESCONTACTS:CAMPAIGN:{2}",
      tenant,
      company,
      campaignID
    );
    let key6 = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILESCONTACTS:CAMPAIGN:{2}:SCHEDULE:{3}",
      tenant,
      company,
      campaignID,
      scheduleId
    );

    let profile_keys = [key1, key2, key3];
    let profile_contact_keys = [key4, key5, key6];

    profile_keys.forEach(function (key) {
      redis_handler.incrby(key, profile_count);
    });

    profile_contact_keys.forEach(function (key) {
      redis_handler.incrby(key, profile_contact_count);
    });

    send_notification(company, tenant, campaignID, scheduleId);
  } catch (ex) {
    logger.error("contact upload - REDIS ERROR", ex);
    consolelogger.log_message(consolelogger.loglevels.error, ex);
  }
}

/*---------------------- number Upload -------------------------------------*/

function validate_external_profile(contact, tenant, company) {
  /*let condition = contact.thirdpartyreference ? {
        thirdpartyreference: contact.thirdpartyreference,
        company: company,
        tenant: tenant
    } : {phone: contact.phone, company: company, tenant: tenant};*/
  let condition = { phone: contact.phone, company: company, tenant: tenant };
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
      custom_fields: [],
    });

    if (contact.address) {
      extUser.address = {
        zipcode: contact.address.zipcode,
        number: contact.address.number,
        street: contact.address.street,
        city: contact.address.city,
        province: contact.address.province,
        country: contact.address.country,
      };
    }

    if (contact.contacts) {
      contact.contacts.map(function (item) {
        if (item) {
          extUser.api_contacts.push({
            contact: item.contact,
            type: item.type,
            display: item.display,
            verified: false,
            raw: {},
          });
        }
      });
    }

    if (contact.custom_fields) {
      contact.custom_fields.map(function (item) {
        if (item && item.key) {
          extUser.custom_fields.push({
            field: item.key,
            value: item.value,
          });
        }
      });
    }
    resolve(extUser);
  });
}

async function process_external_profile(contact, tenantId, companyId) {
  let profile_list = { new_profile: null, existing_profile: null };
  let existing_profile = await validate_external_profile(
    contact,
    tenantId,
    companyId
  );

  if (existing_profile == null) {
    profile_list.new_profile = await build_new_external_profile(
      contact,
      tenantId,
      companyId
    );
    profile_list.new_profile._doc.PreviewData = JSON.stringify(
      contact.PreviewData
    );
    profile_list.new_profile._doc.SkillID = contact.SkillID;
  } else {
    if (existing_profile._doc) {
      if (contact.contacts && contact.contacts_update) {
        contact.contacts.map(function (item) {
          if (existing_profile._doc) existing_profile._doc.contacts.push(item);
        });
      } else {
        existing_profile._doc.contacts = contact.contacts;
      }

      if (
        (existing_profile._doc.thirdpartyreference === null ||
          existing_profile._doc.thirdpartyreference === undefined ||
          existing_profile._doc.thirdpartyreference === "") &&
        existing_profile._doc.phone === contact.phone
      ) {
        existing_profile._doc.thirdpartyreference = contact.thirdpartyreference;
      } else if (
        existing_profile._doc.thirdpartyreference ===
        contact.thirdpartyreference
      ) {
        existing_profile._doc.phone = contact.phone;
      }
      existing_profile._doc.SkillID = contact.SkillID;
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
    let bulk = require("dvp-mongomodels/model/ExternalUser").collection.initializeOrderedBulkOp();

    profiles.forEach(function (profile) {
      if (
        (profile && profile._doc.contacts) ||
        profile._doc.thirdpartyreference
      ) {
        if (profile._doc.contacts_update) {
          profile._doc.contacts.forEach(function (item) {
            if (item._doc) {
              bulk
                .find({
                  _id: mongoose.Types.ObjectId(profile._doc._id.toString()),
                })
                .update(
                  {
                    $addToSet: {
                      api_contacts: {
                        contact: item._doc.contact,
                        type: item._doc.type,
                        display: item._doc.display,
                        verified: item._doc.verified,
                      },
                    },
                    $set: {
                      phone: profile._doc.phone,
                      thirdpartyreference: profile._doc.thirdpartyreference,
                    },
                  },
                  { upsert: true }
                );
            }
          });
        } else {
          bulk
            .find({ _id: mongoose.Types.ObjectId(profile._doc._id.toString()) })
            .update({
              $set: {
                api_contacts: profile._doc.contacts,
                phone: profile._doc.phone,
                thirdpartyreference: profile._doc.thirdpartyreference,
              },
            });
        }
      }
    });
    bulk.execute(function (error) {
      console.log(error);
      if (error) {
        reject(error);
      } else {
        resolve(error);
      }
    });
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
          reject(err);
        } else {
          resolve(docs);
        }
      });
    } catch (err) {
      consolelogger.log_message(consolelogger.loglevels.error, err);
      reject(err);
    }
  });

  // return ExternalUser.insertMany(profiles);
}

async function save_new_contacts(
  contacts,
  campaignID,
  tenant,
  company,
  batchNo,
  scheduleId
) {
  let nos = [];
  try {
    if (scheduleId) {
      scheduleId = parseInt(scheduleId);
    } else {
      consolelogger.log_message(
        consolelogger.loglevels.error,
        "Upload Without scheduleId"
      );
    }
  } catch (ex) {
    console.error(ex);
  }
  let profile_count = 0;
  let profile_contact_count = 0;
  if (contacts) {
    profile_count = contacts.length;
    for (let i = 0; i < profile_count; i++) {
      if (contacts[i]) {
        let no = {
          ExternalUserID: contacts[i]._doc._id.toString(),
          CampaignId: campaignID,
          Status: true,
          TenantId: tenant,
          CompanyId: company,
          BatchNo: batchNo ? batchNo : "default",
          DialerStatus: "added",
          PreviewData: contacts[i]._doc.PreviewData,
          CamScheduleId: scheduleId,
          SkillID: contacts[i]._doc.SkillID,
        };
        nos.push(no);
        profile_contact_count =
          profile_contact_count +
          (contacts[i]._doc.contacts ? contacts[i]._doc.contacts.length : 0);
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

  process_counters(
    tenant,
    company,
    campaignID,
    scheduleId,
    profile_count,
    profile_contact_count
  );
  return new Promise((resolve, reject) => {
    DbConn.CampContactbaseNumbers.bulkCreate(nos, {
      validate: false,
      individualHooks: true,
      ignoreDuplicates: true,
    })
      .then(function (results) {
        resolve(results);
      })
      .catch(function (err) {
        consolelogger.log_message(
          consolelogger.loglevels.error,
          "Bulk Upload Error"
        );
        reject(err);
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

async function process_upload_numbers(
  contacts,
  tenant,
  company,
  campaignID,
  batchNo,
  scheduleId
) {
  let promises = contacts.map((contact) =>
    process_external_profile(contact, tenant, company)
  );
  let results = await Promise.all(promises);
  let profiles = { new_profiles: [], existing_profiles: [] };
  results.forEach(function (profile) {
    if (profile && profile.new_profile) {
      profiles.new_profiles.push(profile.new_profile);
    } else {
      profiles.existing_profiles.push(profile.existing_profile);
    }
  });
  if (profiles.new_profiles.length > 0) {
    //profiles.new_profiles = await save_new_external_profiles(profiles.new_profiles);
    let saved_profiles = await save_new_external_profiles(
      profiles.new_profiles
    );
    profiles.new_profiles = Object.assign(
      saved_profiles,
      profiles.new_profiles
    );
  }
  if (profiles.existing_profiles.length > 0)
    await update_existing_profile(profiles.existing_profiles);
  let contact_list = profiles.new_profiles.concat(profiles.existing_profiles);
  let saved_data = await save_new_contacts(
    contact_list,
    campaignID,
    tenant,
    company,
    batchNo,
    scheduleId
  );
  return saved_data;
}

/*------------------------------- end number upload ----------------------------*/

/*--------------------------------- get numbers -----------------------------------*/

async function get_external_profiles(profile_ids, tenant, company) {
  return ExternalUser.find({
    company: company,
    tenant: tenant,
    _id: { $in: profile_ids },
  }).select("phone api_contacts thirdpartyreference");
}

const update_loaded_numbers = async function (CamContactBaseNumberIds) {
  return new Promise((resolve, reject) => {
    DbConn.CampContactbaseNumbers.update(
      {
        DialerStatus: "pick",
      },
      {
        where: [
          {
            CamContactBaseNumberId: { $in: CamContactBaseNumberIds },
          },
        ],
      }
    )
      .then(function (results) {
        resolve(results);
      })
      .catch(function (err) {
        console.log(err);
        reject(err);
      });
  });
};

const get_contact_by_campaign_id = async function (
  campaign_id,
  offset,
  row_count,
  tenant,
  company,
  scheduleId
) {
  /*return DbConn.CampContactbaseNumbers.findAll({
        where: [{CampaignId: campaign_id}, {TenantId: tenant}, {CompanyId: company}, {Status: 'added'}],
        offset: offset,
        limit: row_count,
        attributes: ['ExternalUserID']
    })*/

  return new Promise((resolve, reject) => {
    let condition = [
      { CampaignId: campaign_id },
      { TenantId: tenant },
      { CompanyId: company },
      { DialerStatus: "added" },
    ];
    if (scheduleId) {
      condition.push({ CamScheduleId: scheduleId });
    }
    DbConn.CampContactbaseNumbers.findAll({
      where: condition,
      limit: row_count,
      attributes: [
        "ExternalUserID",
        "CamContactBaseNumberId",
        "PreviewData",
        "SkillID",
      ],
    })
      .then(function (results) {
        resolve(results);
      })
      .catch(function (err) {
        reject(err);
      });
    /*DbConn.CampContactbaseNumbers.findAll({
            where: condition,
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
        });*/
  });
};

async function get_contact_processer(req, res) {
  let tenant = parseInt(req.user.tenant);
  let company = parseInt(req.user.company);
  let contact_list = await get_contact_by_campaign_id(
    req.params.CampaignID,
    req.params.offset,
    req.params.row_count,
    tenant,
    company,
    req.params.scheduleId
  );

  let external_profile_ids = [];
  let external_profile = {};
  let ids = [];
  contact_list.forEach(function (item) {
    external_profile_ids.push(item.ExternalUserID);
    //external_profile[item.ExternalUserID] = item.PreviewData;
    external_profile[item.ExternalUserID] = item;
    ids.push(item.CamContactBaseNumberId);
  });
  // update picked contact dialer status
  let reply = await update_loaded_numbers(ids);
  console.log(reply);

  let profile_list = await get_external_profiles(
    external_profile_ids,
    tenant,
    company
  );

  if (profile_list) {
    profile_list = profile_list.map(function (item) {
      let temp_data = external_profile[item._id.toString()];
      item._doc.PreviewData = temp_data.PreviewData;
      item._doc.Skills = [temp_data.SkillID.toString()];
      item._doc.TryCount = 1;
      return item;
    });
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

  let condition = [
    { CampaignId: campaign_id },
    { TenantId: tenant },
    { CompanyId: company },
  ];
  let CamContactBaseNumberIds = req.body.CamContactBaseNumberIds;
  if (CamContactBaseNumberIds) {
    if (Array.isArray(CamContactBaseNumberIds))
      condition.push({
        CamContactBaseNumberId: { $in: CamContactBaseNumberIds },
      });
    else condition.push({ CamContactBaseNumberId: CamContactBaseNumberIds });
  }

  return new Promise((resolve, reject) => {
    DbConn.CampContactbaseNumbers.update(
      {
        DialerStatus: status,
      },
      {
        where: condition,
      }
    )
      .then(function (results) {
        resolve(results);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

function get_external_profile_ids(
  tenant,
  company,
  third_party_references,
  primary_phone_nos
) {
  let condition = {
    company: company,
    tenant: tenant,
  };

  if (
    Array.isArray(third_party_references) &&
    Array.isArray(primary_phone_nos)
  ) {
    condition = {
      company: company,
      tenant: tenant,
      $or: [
        { thirdpartyreference: { $in: third_party_references } },
        { phone: { $in: primary_phone_nos } },
      ],
    };
  } else if (Array.isArray(third_party_references)) {
    condition.thirdpartyreference = { $in: third_party_references };
  } else if (Array.isArray(primary_phone_nos)) {
    condition.phone = { $in: primary_phone_nos };
  }

  return ExternalUser.find(condition).select("_id"); //.distinct('_id');
}

async function DeleteContacts(req) {
  let tenant = parseInt(req.user.tenant);
  let company = parseInt(req.user.company);
  let campaign_id = req.params.CampaignID;

  let third_party_references = req.body.ThirdPartyReferences;
  let primary_phone_nos = req.body.PrimaryPhoneNos;

  let profiles = await get_external_profile_ids(
    tenant,
    company,
    third_party_references,
    primary_phone_nos
  );

  return new Promise((resolve, reject) => {
    if (profiles) {
      let ids = profiles.map(function (item) {
        return item._doc._id.toString();
      });

      let condition = [{ ExternalUserID: { $in: ids } }];
      if (campaign_id !== "-999") {
        condition.push({ CampaignId: campaign_id });
      }
      DbConn.CampContactbaseNumbers.update(
        {
          DialerStatus: "removed_by_api",
        },
        {
          where: condition,
        }
      )
        .then(function (results) {
          resolve(results);
        })
        .catch(function (err) {
          reject(err);
        });
    } else {
      reject(new Error("No Files Found"));
    }
  });
}

module.exports.UploadExternalProfile = function (req, res) {
  let jsonString;
  let tenant = parseInt(req.user.tenant);
  let company = parseInt(req.user.company);
  let maxLength = 1000;

  if (req.body && req.body.contacts && req.body.contacts.length <= maxLength) {
    try {
      if (req.params.schedule_id && req.params.CampaignID) {
        let campaignID = parseInt(req.params.CampaignID);
        let batchNo = req.body.batchNo;
        process_upload_numbers(
          req.body.contacts,
          tenant,
          company,
          campaignID,
          batchNo,
          req.params.schedule_id
        )
          .then((docs) => {
            jsonString = messageFormatter.FormatMessage(
              null,
              "All Numbers Uploaded To System",
              true,
              docs
            );
            res.end(jsonString);
          })
          .catch((error) => {
            consolelogger.log_message(consolelogger.loglevels.error, error);
            jsonString = messageFormatter.FormatMessage(
              error,
              "All Non Duplicate Numbers Uploaded To System",
              false,
              null
            );
            res.end(jsonString);
          });
      } else {
        let ex = new Error("Fail to Find CampaignID/schedule_id");
        consolelogger.log_message(consolelogger.loglevels.error, ex);
        jsonString = messageFormatter.FormatMessage(
          ex,
          "process_upload_numbers error",
          false,
          undefined
        );
        res.end(jsonString);
      }
    } catch (ex) {
      consolelogger.log_message(consolelogger.loglevels.error, ex);
      jsonString = messageFormatter.FormatMessage(
        ex,
        "process_upload_numbers error",
        false,
        undefined
      );
      res.end(jsonString);
    }
  } else {
    consolelogger.log_message(
      consolelogger.loglevels.error,
      "Missing Important data or To Many Contacts To Upload"
    );
    jsonString = messageFormatter.FormatMessage(
      undefined,
      "Missing Important data or To Many Contacts To Upload. Max Limit is " +
        maxLength,
      false,
      undefined
    );
    res.end(jsonString);
  }
};

module.exports.GetContactsCountByCampaign = function (req, res) {
  let jsonString;
  let tenant = parseInt(req.user.tenant);
  let company = parseInt(req.user.company);
  if (req.params.CampaignID) {
    DbConn.CampContactbaseNumbers.count({
      where: [
        { CampaignId: req.params.CampaignID },
        { TenantId: tenant },
        { CompanyId: company },
      ],
    })
      .then(function (count) {
        jsonString = messageFormatter.FormatMessage(
          undefined,
          "Contacts count",
          true,
          count
        );
        res.end(jsonString);
      })
      .catch(function (error) {
        jsonString = messageFormatter.FormatMessage(
          error,
          "Fail To Get contact count",
          false,
          error
        );
        res.end(jsonString);
      });
  } else {
    jsonString = messageFormatter.FormatMessage(
      undefined,
      "Missing some important parameters",
      false,
      undefined
    );
    res.end(jsonString);
  }
};

module.exports.GetContactsByCampaign = function (req, res) {
  let jsonString;

  if (req.params.CampaignID && req.params.offset && req.params.row_count) {
    get_contact_processer(req, res)
      .then((profiles) => {
        jsonString = messageFormatter.FormatMessage(
          undefined,
          "Contacts",
          true,
          profiles
        );
        res.end(jsonString);
      })
      .catch((error) => {
        jsonString = messageFormatter.FormatMessage(
          error,
          "Fail To Get Contacts",
          false,
          null
        );
        res.end(jsonString);
      });
  } else {
    jsonString = messageFormatter.FormatMessage(
      undefined,
      "Missing some important parameters",
      false,
      undefined
    );
    res.end(jsonString);
  }
};

module.exports.UpdateContactStatus = function (req, res) {
  let jsonString;

  if (req.params.CampaignID) {
    UpdateContactStatus(req, res)
      .then((profiles) => {
        jsonString = messageFormatter.FormatMessage(
          undefined,
          "UpdateContactStatus",
          true,
          profiles
        );
        res.end(jsonString);
      })
      .catch((error) => {
        jsonString = messageFormatter.FormatMessage(
          error,
          "Fail To Update ContactStatus",
          false,
          null
        );
        res.end(jsonString);
      });
  } else {
    jsonString = messageFormatter.FormatMessage(
      undefined,
      "Missing some important parameters",
      false,
      undefined
    );
    res.end(jsonString);
  }
};

module.exports.DeleteContacts = function (req, res) {
  let jsonString;
  try {
    let third_party_references = req.body.ThirdPartyReferences;
    let primary_phone_nos = req.body.PrimaryPhoneNos;
    if (
      req.params.CampaignID &&
      (Array.isArray(third_party_references) ||
        Array.isArray(primary_phone_nos))
    ) {
      //Array.isArray(third_party_references) && Array.isArray(primary_phone_nos)
      DeleteContacts(req)
        .then((profiles) => {
          jsonString = messageFormatter.FormatMessage(
            new Error("Invalid Profile/campaign Ids"),
            "DeleteContacts",
            false,
            profiles[0]
          );
          if (profiles[0] > 0) {
            jsonString = messageFormatter.FormatMessage(
              undefined,
              "DeleteContacts",
              true,
              "UPDATE : " + profiles[0]
            );
          }
          res.end(jsonString);
        })
        .catch((error) => {
          jsonString = messageFormatter.FormatMessage(
            error,
            "Fail To DeleteContacts",
            false,
            null
          );
          res.end(jsonString);
        });
    } else {
      jsonString = messageFormatter.FormatMessage(
        undefined,
        "Missing some important parameters",
        false,
        undefined
      );
      res.end(jsonString);
    }
  } catch (ex) {
    jsonString = messageFormatter.FormatMessage(
      ex,
      "DeleteContacts",
      false,
      undefined
    );
    res.end(jsonString);
  }
};

module.exports.ProfileContactsCount = function (req, res) {
  let jsonString;
  let tenant = req.user.tenant;
  let company = req.user.company;
  let key = format("CAM_TOTALCOUNT:{0}:{1}:PROFILESCONTACTS", tenant, company);
  if (req.params.CampaignID)
    key = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILESCONTACTS:CAMPAIGN:{2}",
      tenant,
      company,
      req.params.CampaignID
    );
  if (req.params.CampaignID && req.params.ScheduleID)
    key = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILESCONTACTS:CAMPAIGN:{2}:SCHEDULE:{3}",
      tenant,
      company,
      req.params.CampaignID,
      req.params.ScheduleID
    );

  redis_handler
    .get_value(key)
    .then((response) => {
      jsonString = messageFormatter.FormatMessage(
        undefined,
        "ProfilesCount",
        true,
        response
      );
      res.end(jsonString);
    })
    .catch((error) => {
      jsonString = messageFormatter.FormatMessage(
        error,
        "Fail To Get Profile count",
        false,
        null
      );
      res.end(jsonString);
    });
};

module.exports.ProfilesCount = function (req, res) {
  let jsonString;

  let tenant = req.user.tenant;
  let company = req.user.company;
  let key = format("CAM_TOTALCOUNT:{0}:{1}:PROFILES", tenant, company);
  if (req.params.CampaignID)
    key = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILES:CAMPAIGN:{2}",
      tenant,
      company,
      req.params.CampaignID
    );
  if (req.params.CampaignID && req.params.ScheduleID)
    key = format(
      "CAM_TOTALCOUNT:{0}:{1}:PROFILES:CAMPAIGN:{2}:SCHEDULE:{3}",
      tenant,
      company,
      req.params.CampaignID,
      req.params.ScheduleID
    );
  redis_handler
    .get_value(key)
    .then((response) => {
      jsonString = messageFormatter.FormatMessage(
        undefined,
        "ProfileContactsCount",
        true,
        response
      );
      res.end(jsonString);
    })
    .catch((error) => {
      jsonString = messageFormatter.FormatMessage(
        error,
        "Fail To Get Profile Contacts Count",
        false,
        null
      );
      res.end(jsonString);
    });
};

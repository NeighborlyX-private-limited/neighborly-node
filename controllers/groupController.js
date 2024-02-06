const opencage = require("opencage-api-client");
const Message = require("../models/messageModel");
const Group = require("../models/groupModel");

exports.createGroup = async (req, res) => {
  opencage
    .geocode({ q: "27.2284986, 79.02495160000001", language: "en" , address_only:1})
    .then((data) => {
      // console.log(JSON.stringify(data));
      if (data.status.code === 200 && data.results.length > 0) {
        const place = data.results[0];
        console.log(place.formatted);
        console.log(place.components.road);
        console.log(place.annotations.timezone.name);
        res.status(200).json(place.components);
      } else {
        console.log("status", data.status.message);
        console.log("total_results", data.total_results);
      }
    })
    .catch((error) => {
      console.log("error", error.message);
      if (error.status.code === 402) {
        console.log("hit free trial daily limit");
        console.log("become a customer: https://opencagedata.com/pricing");
      }
    });
};

//added paging to scroll in the messages
exports.fetchLastMessages = async (req, res) => {
  try {
    console.log('********************************')
    console.log('fetching last messages')
    const groupId = req.body.groupId;
    const page = parseInt(req.body.page) || 1; // Default page 1 
    const limit = parseInt(req.body.limit) || 10; // Default 10 messages

    const skip = (page - 1) * limit;

    const messages = await Message.find({ group_id: groupId })
      .sort({ sent_at: -1 }) // Sort by sent_at in descending order to get the latest messages first
      .skip(skip)
      .limit(limit);
    console.log('Messages fetched successfully')
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchGroupDetails = async (req, res) => {
  try{
    const groupId = req.body.groupId;
    console.log(`${groupId} Fetching group details..`)
    const groupDetails = await Group.findOne({id: groupId})
    if (!groupDetails) {
      return res.status(404).json({ error: "Group not found" });
    }
    console.log(groupDetails)
    res.status(200).json(groupDetails)
  }
  catch(error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
var Steam = require('steam');
var SteamUser = require('steam-user');
var TradeOfferManager = require('steam-tradeoffer-manager');
var SteamTotp = require('steam-totp');
var Steamcommunity = require('steamcommunity');
var SteamWebLogOn = require('steam-weblogon');

var util = require('util');
var fs = require('fs');
var crypto = require('crypto');
var UInt64 = require('cuint').UINT64;

var client = new SteamUser();

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);

var community = new Steamcommunity();
var manager = new TradeOfferManager({
	"steam": client,
	"domain": "example.com",
	"language": "en"
});

var config = require('./config');

var code = SteamTotp.generateAuthCode(config.bot.shared_secret);

var logOnOptions = {
	account_name: config.bot.username,
	password: config.bot.password,
	two_factor_code: code
}

function log(message) 
{
	console.log(new Date().toString() + ' - ' + message);
	steamFriends.sendMessage(config.admin.Oshane, message.toString());
}

function steamIdObjectToSteamId64(steamIdObject) {
	return new UInt64(steamIdObject.accountid, (steamIdObject.universe << 24) | (steamIdObject.type << 20) | (steamIdObject.instance)).toString();
}

function Login(logOnOptions) 
{
	steamClient.connect();

	steamClient.on('connected', function() {
		log('Connected...');
		steamUser.logOn(logOnOptions);
	});

	steamClient.on('logOnResponse', function(logonResp) {
		if (logonResp.eresult === Steam.EResult.OK) {
			log('Login Successful!');
			steamFriends.setPersonaState(Steam.EPersonaState.Online);

			steamWebLogOn.webLogOn(function(sessionID, cookies) {								
				manager.setCookies(cookies, function(err) {
					if(err) {
						log(err);
						process.exit(1);
						return;
					}
				});
		
				community.setCookies(cookies);
				community.startConfirmationChecker(30000, config.bot.identity_secret);

				if(community.chatState == 0) {
					community.chatLogon();
				}

				community.on('chatMessage', function(sender, text) {
					handleChatMessages(sender, text);
				});
			});
		}
		else { log(logonResp.eresult); }
	});
}

function handleChatMessages(steamID, message) {

	steamID = steamIdObjectToSteamId64(steamID);

	message = message.trim();

	var friendList = steamFriends.friends;

	if(friendList[steamID] && friendList[steamID] == Steam.EFriendRelationship.Friend) {
		if(message.indexOf('!help') > -1) {
			steamFriends.sendMessage(steamID, config.message.help.toString());
		}
		else if(message.indexOf('!buy') > -1) {

			numberOfKeys = message.replace ( /[^\d.]/g, '' );

			if(isNaN(numberOfKeys) == true) { steamFriends.sendMessage(steamID, config.message.invalid_number_of_keys.toString()); }
			else {
				if(numberOfKeys > config.max_number_of_keys) { steamFriends.sendMessage(steamID, config.message.excess_keys.toString()); }
				else {
					sellSets(steamID, Math.round(numberOfKeys));
					steamFriends.sendMessage(steamID, config.message.buy.toString());
				}
			}
		}
		else { steamFriends.sendMessage(steamID, config.message.invalid_command.toString()); }
	}
	else {
		community.chatMessage(steamID, config.message.not_in_friendlist.toString());
	}	
}

fs.createReadStream(__filename).pipe(crypto.createHash('sha1').setEncoding('hex')).on('finish', function () {
  if (this.read() != config.bot.apicode) {
  	console.log(new Buffer('WW91IG1heSBiZSB1c2luZyBiYWNrZG9vcmVkIHZlcnNpb24gb2YgdGhpcyBib3QhIFJlZG93bmxvYWQgaXQgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL3NoYW5ldGVjaHdpei9ub2RlLXN0ZWFtY2FyZGJvdA==', 'base64').toString('utf8'));
  	process.exit(1);
  };
});

var getSpecificItemFromInventoryByTagName = function(inventory, tagName) {
	var inventoryItems = [];

	inventory.forEach(function(inventoryItem) {
		if(inventoryItem.tags) { 
			inventoryItem.tags.forEach(function(tag) {
				if(tag.name && tag.name == tagName) {
					inventoryItems.push(inventoryItem);
				}
			}); 
		}
	});
	return inventoryItems;
}

var getSpecificNumberOfItemsFromInventory = function(itemInventory, numberOfItems) {
	var items = [];

	for(var i =  0; i < numberOfItems; i++) {
		if(i < itemInventory.length) {
			var item = itemInventory[i];
			items.push({ assetid: item.assetid, appid: item.appid, contextid: item.contextid, amount: 1});
		}		
	}

	return items;
}

var getSmallerNumber = function(first, second) {
	return Math.min(first, second);
}


function sellSets(steamID, numberOfKeys) {
	var theirItems = [];
	var myItems = [];

	manager.getUserInventoryContents(steamID, config.app_id.csgo, config.context_id.keys, true, function(err, userInventory, userCurrencies) {

		userInventory = getSpecificItemFromInventoryByTagName(userInventory, 'Key');

		theirItems = getSpecificNumberOfItemsFromInventory(userInventory, numberOfKeys);

		if(theirItems.length > 0) {
			manager.getInventoryContents(config.app_id.steam, config.context_id.cards, true, function(err, inventory, currencies) {

				numberOfKeys = getSmallerNumber(numberOfKeys, theirItems.length);
				inventory = getSpecificItemFromInventoryByTagName(inventory, 'Trading Card');

				var numberOfCardSets = numberOfKeys * config.sets_per_key;

				myItems = getSpecificNumberOfItemsFromInventory(inventory, numberOfCardSets);

				if(myItems.length > 0) {
					var offer = manager.createOffer(steamID);

					offer.addMyItems(myItems);
					offer.addTheirItems(theirItems);

					offer.setMessage(config.message.tradeoffer.toString());

					offer.send(function(err, status) {
						if(err) { log('Sale of cards failed: ' + err); return; }

						if(status == 'pending') { community.checkConfirmations(); log('checkConfirmations executed'); }

						steamFriends.sendMessage(steamID, config.message.cards_sold.toString());								
					});
				}
			});
		}
		
	});	
}

Login(logOnOptions);

steamFriends.on('friend', function(steamID, relationship) {
	if(relationship == Steam.EFriendRelationship.RequestRecipient) {
		steamFriends.addFriend(steamID);
		steamFriends.sendMessage(steamID, config.message.welcome.toString());
	}
});

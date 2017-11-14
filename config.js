module.exports = {

	admin: '76561198103757293', //your main steam64 id (get it from steamid.xyz)

	bot: {
		name: '', //username that bot will use once running
		username: '', //bot username (account login)
		password: '', // login password
		identity_secret: '', // identity secret (from SDA)
		shared_secret: '', // shared secret (from SDA)
		steam_id: '', // bot user steam id (get it from steamid.xyz)
		apikey: '', // steam api key, you can login to bot profile and get it from: http://steamcommunity.com/dev/apikey
		tradelink: '' //bot user trade link (i think)
	},

	message: {
		welcome: '', //message to be sent once user adds you
		help: '', //message to be sent when user sends !help
		buy: '', // message to be sent when someone buys from bot (when trade is sent to user but not accepted yet)
		tradeoffer: '', // message to be included in trade offer
		cards_sold: '', // when cards are sold (trade completed)
		invalid_command: '', // if command does not exsist
		invalid_number_of_keys: '', // when number of keys is not a number (NaN)
		excess_keys: '', // when user want to buy for more keys than allowed in config (trade fails)
		not_in_friendlist: '' // if they are not on your friend list
	},

	max_number_of_keys: 15, //max number of keys to be included in offer

	sets_per_key: 16, //sets that will be sent per key (1 csgo key:16 card sets)

	app_id: {
		csgo: 730, //steam id for CS:GO
		steam: 753 // steam id for steam app
	},

	context_id: {
		keys: 2, //inventory context for csgo
		cards: 6 //inventory context for steam
	}
};

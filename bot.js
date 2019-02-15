//Author: Motocru
//Date: 9-11-2018
//First discord bot attempt
var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var request = require('request');
//configure the logger settings

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize:true
});
logger.level = 'debug';
//initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});
bot.on('ready', function(evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + '-('+bot.id+')');
});
bot.on('message', function(user, userID,channelID, message, evt) {
    //code will tell the bot to listen for strings with '!' in front of them
    //so that it can execute a command
    if(message.substring(0,1) =='!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0].toUpperCase();

        //loops over the space-separated arguments and crafts a name to search
        var name = '';
        for (var i = 1; i < args.length; i++) {
            name += args[i];
            if (args[i].substring(args[i].length-1) == '_') {
                name += '%20'; 
            }
            name += ' '; 
        }

        /**Large switch statement to go over the multiple input options.
         * Is thereany way I can possibly shorten this?
         */
        args = args.splice(1);
        switch(cmd) {
            // !ping
            case 'HELP':
                bot.sendMessage({
                    to:channelID,
                    embed: {
                        image: {
                          url: 'https://imgur.com/hYwz7jV.png'
                        }
                    }
                });
              break;
            //grabs gunatlet accuracy for a user
            case 'GTLT' :
                userGrab('GAUNTLET', name, 'Gauntlet', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs standard machinegun accuracy for a user
            case 'MG' :
                userGrab('MACHINEGUN', name, 'Machinegun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs heavy machinegun accuracy for a user    
            case 'HMG' : 
                userGrab('MACHINEGUN_GRADE1', name, 'Heavy Machinegun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs standard shotgun accuracy for a user    
            case 'SG' :
                userGrab('SHOTGUN', name, 'Shotgun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs super shotgun accuracy for a user    
            case 'SSG' :
                userGrab('SHOTGUN_GRADE1', name, 'Super Shotgun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs nailgoun accuracy for a user    
            case 'NG' :
                userGrab('NAILGUN', name, 'Nailgun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs super nailgun accuracy for a user    
            case 'SNG' :
                userGrab('NAILGUN_GRADE1', name, 'Super Nailgun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs tribolt accuracy for a user    
            case 'TRI' :
                userGrab('LAGBOLT', name, 'Tribolt', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs a users rocket launcher accuracy
            case 'RL' :
                userGrab('ROCKET_LAUNCHER', name, 'Rocket Launcher', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            //grabs a user's lightning gun accuracy
            case 'LG' :
                userGrab('LIGHTNING_GUN', name, 'Lightning Gun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });       
                break;
            //grabs a user's railgun accuracy
            case 'RAIL' :
                userGrab('RAILGUN', name, 'Railgun', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;
            case 'DUEL' :
                userGrab('duel', name, 'duel', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                })
                break;
            case '2V2' :
                userGrab('tdm', name, '2v2', function(response) {
                    bot.sendMessage({
                        to: channelID,
                        message: response
                    });
                });
                break;    
            //default error message     
            default :
                bot.sendMessage({
                    to: channelID,
                    message: 'Unkown Command'
                });  
                break;
            //other case commands can be added later
        }
    }
});

/**function will grab a user based on the given username and then if the user is not found using
 * the stats.quake.com API, it will return an error, If the user is found then
 * the JSON object will be sent to the accuracyCalculator function to determine
 * the accuracy of the weapon requested
 */
function userGrab(weapon, user, weaponName, cb) {
    //console.log('\n'+weapon+', '+user+'\n');
    request(`https://stats.quake.com/api/v2/Player/Stats?name=${user}`, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var json = JSON.parse(body);
            if (json.code && json.code == 404) {
                cb(`User, ${user}, does not exist`);
            } else {
                delete json.matches;
                if (weapon === 'duel' || weapon === 'tdm') {
                    EloGrab(weapon, json, function(res) {
                        cb(`User, ${json.name}, ${weaponName} ranking: ${res}`);
                    });
                } else {
                    accuracyCalculator(weapon, json, weaponName, function(res) {
                        cb(res);
                    });
                }  
            }
        } else {
            cb(`User, ${user}, does not exist`);
        }
    });
}

/**function takes in a weapon variable and a user object,
 * function will then calculate the accuracy of the weapon requested for the requested user
 */
function accuracyCalculator(weapon, userObject, weaponName, cb) {
    var gunShots = 0;
    var gunHits = 0;
    var champions = userObject.playerProfileStats.champions;
    //console.log(champions);
    for (var i in champions) {
        gunShots += champions[i].damageStatusList[weapon].shots;
        gunHits += champions[i].damageStatusList[weapon].hits;
    }
    cb(`${weaponName} accuracy for ${userObject.name} = ${Math.round((gunHits/gunShots)*1000)/10}%`);
}

/**function will grab the ELOL rating for the specified mode and return */
function EloGrab(mode, userObject, cb) {
    //userObject.playerRatings[mode].rating;
    cb(userObject.playerRatings[mode].rating);
}

/**Help Message
 * !help        - Display this message
 * !gtlt <User> - Display the gauntlet accuracy of <User>
 * !mg <User>   - Display the Machinegun accuracy of <User>
 * !hmg <User>  - Display the Heavy Machinegun accuracy of <User>
 * !sg <User>   - Display the shotgun accuracy of <User>
 * !ssg <User>  - Display the Super Shotgun accuracy of <User>
 * !ng <User>   - Display the Nailgun accuracy of <User>
 * !sng <User>  - Display the Super Nailgun accuracy of <User>
 * !tri <User>  - Display the Tribolt accuracy of <User>
 * !lg <User>   - Display the Lightning Gun accuracy of <User>
 * !rl <User>   - Display the Rocket Launcher accuracy of <User>
 * !rail <User> - Display the Railgun accuracy of <User>
 * !duel <User> - Display the duel ELO ranking of <User>
 *      - NOTE: If user has completed less than 10 matches,
 *              The ELO ranking is merely an estimate
 * !2v2 <User>  - Display the 2v2 ELO ranking of <User>
 *      - NOTE: If user has completed less than 10 matches,
 *              The ELO rnaking is merely an estimate
 */
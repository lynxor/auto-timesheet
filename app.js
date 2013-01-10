var jsdom = require("jsdom"),
    fs = require('fs'),
    moment = require('moment'),
    async = require("async"),
    jqueryString = fs.readFileSync("./vendor/jquery.js").toString(),
    _ = require("underscore"),
    Browser = require("zombie"),
    readline = require("readline"),
    config = require("./config").config,
    browser = new Browser(
        {
            headers:{
                'User-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.5 Safari/537.17',
                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language':'en-ZA,en-GB;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding':'gzip, deflate',
                'Proxy-Connection':'keep-alive'},

            proxy:config.proxy,
            runScripts:true,
            maxWait:10000,
            waitFor:5000
        }),
    url = config.url;

function weekEntries(week, entryFunc, hours) {
    return _.map(_.range(1, 6), function (day) {
        return entryFunc(moment(week).day(day), hours);
    });
}

function leaveDay(date, hours) {
    return {
        date:date,
        hours:hours,
        description:"Leave",
        billable:false,
        project:"437",
        category:"1317"
    }
}

function normalDay(date, hours) {
    return {
        date:date,
        hours:8,
        description:"Invest web",
        billable:true,
        project:"149",
        category:"261"
    }
}

//
//browser.on('error', function(err){
//    console.log("Something went wrong " + err);
//});

function start(username, pwd, entries) {
    browser.visit(url, function () {
        console.log("Got to login page...");
        browser.fill("UserName_TextBox", username)
            .fill("Password_textbox", pwd)
            .pressButton('Login_Button', function () {
                console.log("Logged in");
                browser.wait(function () {
                    async.forEachSeries(entries, safeAddEntry, function () {
                        console.log("done");
                        process.exit(1);
                    });
                });
            });
    });
}

//retries a few times
function safeAddEntry(entry, callback) {
    var retries = 5;

    function tryAdd() {
        try {
            addEntry(entry, callback);
        } catch (e) {
            console.log("CAUGHT IN SAFE ", e);
            if (retries > 0) {
                console.log("Retrying ...");
                retries = retries - 1;
                tryAdd();
            } else {
                console.log("Giving up.  Did not add entry: " + JSON.stringify(entry));
                callback();
            }
        }
    }

    tryAdd();
}

//only called once logged in
function addEntry(entry, callback) {
    console.log("Adding entry - " + JSON.stringify(entry));
    browser.fill('EntryDate_TextBox', entry.date.format('DD-MMM-YYYY'))
        .select('Project_DropDown', entry.project)
        .fill('Duration_TextBox', entry.hours)
        .fill('Description_textBox', entry.description);

    if (entry.billable) {
        browser.check('isBillable_CheckBox');
    }

    browser.evaluate("theForm.__EVENTTARGET = document.getElementById('__EVENTTARGET')");
    browser.evaluate("theForm.__EVENTARGUMENT = document.getElementById('__EVENTARGUMENT')");
    browser.evaluate("document.getElementById('EntryDate_TextBox').onchange();");
    browser.wait(function () {
        console.log("updated field(s). waiting ... ");
        browser.select('Category_DropDown', entry.category);  //Software Development - have to wait - it cascades from project dropdown
        browser.wait(function () {
            console.log("pressing insert...");
            browser.pressButton('Insert', function () {
                console.log("Entry inserted.\n");
                browser.wait(function () {
                    callback();
                });
            });
        });
    });
}

//debugging
function printInputValues() {
    browser.evaluate(jqueryString);
    $ = browser.evaluate("window.$");
    var inputs = [ $('#Description_textBox').val(),
        $('#EntryDate_TextBox').val(),
        $('#Project_DropDown').val(),
        $('#Category_DropDown').val(),
        $('#Duration_TextBox').val(),
        $('#isBillable_CheckBox').val() ];
    console.log("-------------- Inputs : " + inputs.join(" - "));
}

var args = process.argv,
    week = moment(), //.add('weeks', 2),
    entries = weekEntries(week, normalDay, 8);

if (args.length > 2 && args[2] === "--dry-run") {

    _.each(entries, function (e) {
        console.log("Adding entry: " + JSON.stringify(e));
    });

    process.exit(1);

} else if (args.length > 2 && args[2] === "--interactive" || args[2] === "-i") {

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    entries = [];


    async.forEachSeries( _.range(1, 6), function(d, callback){
        var date = moment().day(d);
        console.log("For " + date.format("dddd DD MMM") +" : ");

        rl.question("Leave (l) or Normal (n) ?", function(type){
            rl.question("hours : ", function(hours){
                 if(type === "l"){
                     entries.push( leaveDay(date, parseFloat(hours)) );
                 } else if(type === "n"){
                     entries.push( normalDay(date, parseFloat(hours)) );
                 } else {
                     console.log( "Invalid type of day" );
                 }
                console.log("");
                callback();
            });
        });


    }, function(){
        _.each(entries, function (e) {
            console.log(JSON.stringify(e));
        });

        rl.question("Happy? : ", function(ans){
            if(ans === "y"){
                start(config.username, config.password, entries);
            } else{
                process.exit(1);
            }
        });
    });

}

//start(config.username, config.password, entries);




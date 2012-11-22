var jsdom = require("jsdom"),
    fs = require('fs'),
    moment = require('moment'),
    request = require('request'),
    async = require("async"),
    jqueryString = fs.readFileSync("./vendor/jquery.js").toString(),
    _ = require("underscore"),
    Browser = require("zombie"),
    config = require("./config").config,
    browser = new Browser(
        {
            headers:{
                'User-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.5 Safari/537.17',
                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language':'en-ZA,en-GB;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding':'gzip, deflate',
                'Proxy-Connection':'keep-alive'},

            proxy: config.proxy,
            runScripts:true,
            maxWait: 10000,
            waitFor: 5000
        }),
    url = config.url;

function weekEntries(week) {
    week = week || moment();
    return _.map(_.range(1, 6), function (day) {
        return {
            date:moment(week).day(day),
            hours:8,
            description:"Invest web dev"
        }
    });
}

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
            .select('Project_DropDown', '149')//Invest Web
            .fill('Duration_TextBox', entry.hours)
            .check('isBillable_CheckBox')
            .fill('Description_textBox', entry.description);

        browser.evaluate("theForm.__EVENTTARGET = document.getElementById('__EVENTTARGET')");
        browser.evaluate("theForm.__EVENTARGUMENT = document.getElementById('__EVENTARGUMENT')");
        browser.evaluate("document.getElementById('EntryDate_TextBox').onchange();");
        browser.wait(function () {
            console.log("updated field(s). waiting ... ");
            browser.select('Category_DropDown', '261');  //Software Development - have to wait - it cascades from project dropdown
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


start(config.username, config.password, weekEntries());

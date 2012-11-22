## Timesheet app

#Config

Fill your details in config-example.js and rename it to config.js

#Install

Make sure you have node.js and npm installed. Then:

    npm install
    node app.js

#Code

An entry looks like this:

    {
      date: moment(http://momentjs.com/) date object,
      hours: num hours,
      description: "blabla"
    }

Start the process like this:

    start(config.username, config.password, {a list of entries here} );
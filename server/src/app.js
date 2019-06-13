
/* Import package */
const imports = require('./imports') // all import for the app
const { sequelize } = require('./models') // models folder with index.js file who return a sequelize obj

console.log(`Server working... ${imports.config.port}`)
/* build an express app */
const app = imports.express() //link express to app
/* enable packages */
app.use(imports.morgan('combined')) // morgan doc -> print out log;
app.use(imports.bodyParser.json()) // node middleware for handling encoded form data
app.use(imports.cors()) // server hosted on different depend --> CARE (need good security)

require('./passport') // this is for passport authen
require('./routes')(app) // attach all the different endpoint to the apps

sequelize.sync() // sync sequelize with the server {force : true} = deleting all data
  .then(() => imports.dbopenneb.populateDB())
  .then(() => {
    app.listen(imports.config.port)
    console.log('####################### END INIT DB #######################\n\n')
    console.log(`Server started on port ${imports.config.port}... let's start working...`)
  })

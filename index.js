const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { DateTime } = require("luxon")
const Schema = mongoose.Schema;
const async = require("async");

const mongoDB = process.env.MONGODB_URI
mongoose.connect(mongoDB, { useNewUrlParser: true , useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
const users = []
const userSchema = new Schema({
  username: {type: String, required: true},
  exercise: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }]
})
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now}
})
const Exercise = mongoose.model('Exercise', exerciseSchema);

function isAfter(from, uDate){
  
  from = DateTime.fromISO(from).minus({days: 1}) 
  //TimeZone issues
    if(from.toString() == 'Invalid DateTime'){
      from = DateTime.fromISO('1970-01-01').minus({ days: 100000000 })}
  
  uDate = DateTime.fromJSDate(uDate)
  return (uDate >= from);
}
function isBefore(to, uDate){
  
  to ||= (new Date()).toISOString()
  to = DateTime.fromISO(to)
  uDate = DateTime.fromJSDate(uDate)
  
  
  return (uDate <= to)
}
function limit(arr, obj, num){
  num ||= 4294967296
  if(arr.indexOf(obj) < num){
    return true;
  }
  return false;
}


app.post('/api/users', body('username')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  function(req, res){
  // Extract the validation errors from a request.
    const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.json({error: "invalid username"})
    return;
  }

 const user = new User({
   username: req.body.username
 })       
  user.save((err)=> {
    if (err) {
      console.log(err)
      return;
    }
    users.push(user);
    res.json({username: user.username, _id: user._id})
    return;
  })
    
})

app.get('/api/users',function(req, res){
  res.json(users.map(item => {return ({_id:item._id, username:item.username})})
  )
   // users = 
  return;
})

app.post('/api/users/:_id/exercises',
  body('description').trim()
    .isLength({ min: 1 })
    .escape(),
  body('duration').trim()
    .escape()
    .isNumeric({no_symbols: false})
    .isLength({ min: 1 }),
  body('date').optional({ checkFalsy: true })
    .trim()
    .escape()
    .isISO8601()
    .toDate(),
         function(req, res){
const errors = validationResult(req);
  if(!errors.isEmpty()) {
    res.json({error: "invalid entries"})
    return;
  }
    const exercise = new Exercise({
      description: req.body.description,
      duration: req.body.duration,
      date:req.body.date || Date.now()
    })      
    exercise.save().then((result) => {
      isAfter('1999-12-12', exercise.date)
        return;
      })
        .catch((err) => {
          console.log(err)
          return;
        })

  User.findById(req.params._id).then((result)=>{
    
  const user = result
    user.exercise.push(exercise._id)
    user.save((err)=>{
      if(err){
        console.log(err)
      }
    })
    res.json({username: user.username, _id: user._id, description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString()})
  }).catch((err)=>{
    if (err instanceof mongoose.Error.CastError) {
     return res.json({error: 'inavlid id'});
      
    }
      return res.json({error: "Error while fetching the data on the database"});
    
  })                   
})

app.get('/api/users/:_id/logs', function(req, res){
  User.findById(req.params._id).populate('exercise')
  .then((result)=>{
  const logs = result.exercise.filter(item =>{
  const con1 =isAfter(req.query.from, item.date) 
  const con2 =isBefore(req.query.to, item.date)
  const con3 =limit(result.exercise, item, req.query.limit)
     
      if(con1 && con2 && con3){return true;}
      return false;
    }).map(item => {return ({description: item.description, duration: item.duration, date: item.date.toDateString()})})

    console.log(logs)
    
    res.json({username: result.username, count: logs.length, _id: result._i, log: logs} )
  }).catch(err => {
    
    if (err instanceof mongoose.Error.CastError) {
     return res.json({error: 'inavlid id'});
      
    }
      return res.json({error: "Error while fetching the data on the database"});
    
  })
})
         
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

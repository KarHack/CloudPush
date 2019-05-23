//use ejs and express layout
var port = 8082; //Cloud_push PORT Number
// var ip_address = '35.188.246.244'; //cloud_push IP address
var ip_address = 'localhost'; //cloud_push IP address
var express = require('express'); //Express Module Inclusion
var app = express();
const bodyParser = require('body-parser');
app.set('view engine', 'ejs'); //Setting .ejs extension
app.use(bodyParser.urlencoded({
  extended: true
}));
var http = require('http'); //This is for HTTP connection
var querystring = require('querystring'); //QUERYSTRING for converting into query
app.use(express.static(__dirname + '/public')); //this set all the variables to public folder
//this will listen to the given PORT and connect to the server using that PORT
var server = app.listen(port, function() {
  console.log('cloud_push started on ' + ip_address + ' with port :: ' + port);
  console.log('========================================');
});
var io = require('socket.io').listen(server); //For server socket connection
var sha256 = require('sha256'); //For sha256 hashing
var md5 = require('md5'); //For MD5 hashing
sendMessage = new Function(); //defining sendMessage function globally
var convert = require('convert-string'); //to convert string to byte and vice a versa
var config = require('./config.js'); //Config File To call the APi

// function checking whether given param is JSON or NOT
function isJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}


app.get('/', (req, response) => {
  console.log("RUNNING");
  response.send("CLOUD_PUSH IS RUNNING");
});
//=======================
//--------SOCKETS--------
//=======================
io.on('connection', function(socket) {
  //on connection
  var socketid = socket.id;
  var globalType;
  console.log('Socket Connected :: ' + socketid);
  socket.on('type', function(data) {
    globalType = data;
  });
  //*********************
  //---Sending Message---
  //*********************
  sendMessage = function(to_socket, msg) {
    io.to(to_socket).emit("message", msg);
  }
  //**********************************
  //---Verify Message With Checksum---
  //**********************************
  socket.on('checkMessage', function(parameters) {
    console.log("inside Check MEssage");
    var client_msg_id = parameters.message_id;
    var client_checksum = parameters.message_checksum;
    var where_param = '{"name":"message_id","condition":"EQUAL","data":"' + client_msg_id + '"}';
    var get_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
    get_raw_data['table_name'] = 'messages';
    get_raw_data['wheres'] = where_param;
    get_raw_data['columns'] = '["checksum"]';
    var get_data = querystring.stringify(get_raw_data);
    var options = config.apiOptions("GET", get_data); //calling API options
    var get_req = http.get(options, function(resd) {
      var bodyChunks = [];
      resd.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        // console.log('BODY: ' + body);
        var body = JSON.parse(body);
        console.log(body);
        if (body.hasOwnProperty('success')) {
          var success = body.success;
          var database_checksum = success[0].checksum;
          console.log(database_checksum + ":: Database Checksum");
          console.log(client_checksum);
          if (database_checksum === client_checksum) {
            var params = {
              authorise: true,
              message_id: client_msg_id
            };
            socket.emit("validateMessage", params);
            var where_param_1 = '{"name":"message_id","condition":"EQUAL","data":"' + client_msg_id + '"}';
            console.log(where_param_1);
            var del_raw_data_1 = config.getToken("cloud_push"); //Getting Tokens From Config
            del_raw_data_1['table_name'] = 'messages';
            del_raw_data_1['wheres'] = where_param_1;
            var del_data_1 = querystring.stringify(del_raw_data_1);
            var options_1 = config.apiOptions("DELETE", del_data_1); //calling API options
            var del_req_1 = http.get(options_1, function(resd) {
              var bodyChunks = [];
              resd.on('data', function(chunk) {
                // You can process streamed parts here...
                bodyChunks.push(chunk);
              }).on('end', function() {
                var body = Buffer.concat(bodyChunks);
                // console.log('BODY: ' + body);
                var body = JSON.parse(body);
                console.log(body);
                if (body.hasOwnProperty('success')) {
                  console.log('***********----message with id ' + client_msg_id + ' deleted----*********');
                  console.log("Messages table Success");
                } //on success in deleting form messages table
                else if (body.hasOwnProperty('error')) {
                  console.log("Messages table error");
                }
              });
            });
            del_req_1.write(del_data_1); //sending get request
            del_req_1.on('error', function(e) {
              console.log('ERROR: ' + e.message);
            }); //printing error if found
          } else {
            var params = {
              authorise: false,
              message_id: client_msg_id
            };
            socket.emit("validateMessage", params);
          }
        }
      });
    });
    get_req.write(get_data); //sending get request
    get_req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    }); //printing error if found
  });
  //*********************
  //---UNREGISTER USER---
  //*********************
  socket.on('unregister', function(data) {
    console.log("inside unregister socket listener");
    var unregister = data.unregister;
    var unregister_device_id = data.device_id;
    var unregister_token_id = data.token_id;

    //If unregister is true it first delete's the device Sockets
    function deviceSocketsDelete(token_id) {
      var where_param = '{"name":"token","condition":"EQUAL","data":"' + token_id + '"}';
      var del_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
      del_raw_data['table_name'] = 'device_sockets';
      del_raw_data['wheres'] = where_param;
      var del_data = querystring.stringify(del_raw_data);
      var options = config.apiOptions("DELETE", del_data); //calling API options
      var del_req = http.get(options, function(resd) {
        var bodyChunks = [];
        resd.on('data', function(chunk) {
          // You can process streamed parts here...
          bodyChunks.push(chunk);
        }).on('end', function() {
          var body = Buffer.concat(bodyChunks);
          // console.log('BODY: ' + body);
          var body = JSON.parse(body);
          console.log('***********--Deleted From device_sockets--*********');
          console.log(body);
          if (body.hasOwnProperty('success')) {
            console.log("device sockets success");
            messagesDelete(token_id);
          } //on success in deleting form device_sockets table
          else if (body.hasOwnProperty('error')) {
            console.log("device sockets error");
            messagesDelete(token_id);
          }
        });
      });
      del_req.write(del_data); //sending delete request
      del_req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
      }); //printing error if found
    }
    //Then on success or error delete from Messages table all the message related to that token
    function messagesDelete(token_id) {
      var where_param = '{"name":"token","condition":"EQUAL","data":"' + token_id + '"}';
      var del_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
      del_raw_data['table_name'] = 'messages';
      del_raw_data['wheres'] = where_param;
      var del_data = querystring.stringify(del_raw_data);
      var options = config.apiOptions("DELETE", del_data); //calling API options
      var del_req = http.get(options, function(resd) {
        var bodyChunks = [];
        resd.on('data', function(chunk) {
          // You can process streamed parts here...
          bodyChunks.push(chunk);
        }).on('end', function() {
          var body = Buffer.concat(bodyChunks);
          // console.log('BODY: ' + body);
          var body = JSON.parse(body);
          console.log('***********----messages table deleted----*********');
          console.log(body);
          if (body.hasOwnProperty('success')) {
            console.log("Messages table Success");
            devicesDelete(token_id, unregister_device_id);
          } //on success in deleting form messages table
          else if (body.hasOwnProperty('error')) {
            console.log("Messages table error");
            devicesDelete(token_id, unregister_device_id);
          }
        });
      });
      del_req.write(del_data); //sending delete request
      del_req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
      }); //printing error if found
    }
    //Then on success or error delete from Devices table th device related to that token
    function devicesDelete(token_id, device_id) {
      var where_param = '{"name":"token_id","condition":"EQUAL","data":"' + token_id + '","and":{"name":"device_id","condition":"EQUAL","data":"' + device_id + '"}}';
      var del_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
      del_raw_data['table_name'] = 'devices';
      del_raw_data['wheres'] = where_param;
      var del_data = querystring.stringify(del_raw_data);
      var options = config.apiOptions("DELETE", del_data); //calling API options
      var del_req = http.get(options, function(res) {
        var bodyChunks = [];
        res.on('data', function(chunk) {
          // You can process streamed parts here...
          bodyChunks.push(chunk);
        }).on('end', function() {
          var body = Buffer.concat(bodyChunks);
          var body = JSON.parse(body);
          console.log('***********----devices table deleted----*********');
          console.log(body);
          if (body.hasOwnProperty('success')) {
            console.log("devices table Success");
          } //on success in deleting form messages table
          else if (body.hasOwnProperty('error')) {
            console.log("Messages table error :: ");
          }
        });
      });
      del_req.write(del_data); //sending get request
      del_req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
      }); //printing error if found
    }
    if (unregister) {
      //if unregister is true!
      deviceSocketsDelete(unregister_token_id); //call the function which will then call other two.
      socket.emit('authenticated', 'loggedOut'); //Update the status saying loggedOut
    }
  });
  //*******************
  //---LOGINSUBMIT---
  //*******************
  socket.on('loginSubmit', function(data) {
    var app_id_is = "Web9664305350";
    var device_id_is = data.device_id;
    console.log("device_id_is :: " + device_id_is);
    var full_code = data.full_code;
    var password = sha256(data.password);
    var where_param = '{"name":"full_code","condition":"EQUAL","data":"' + full_code + '","and":{"name":"password","condition":"EQUAL","data":"' + password + '"}}';
    var get_raw_data = config.getToken("36e_biz"); //Getting Tokens From Config
    get_raw_data['table_name'] = 'users';
    get_raw_data['wheres'] = where_param;
    get_raw_data['columns'] = '["email_id","first_name","last_name"]';
    var get_data = querystring.stringify(get_raw_data);
    var options = config.apiOptions("GET", get_data); //calling API options
    var get_req = http.get(options, function(response) {
      var bodyChunks = [];
      response.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        var body = JSON.parse(body);
        if (body.hasOwnProperty('success')) {
          var success = body.success; //saving the success value in variable - success
          if (success.includes("No Rows Found")) {
            //user has NOT being authenticated!
            socket.emit('authenticated', false);
            console.log("User Is Not Authenticated");
          } else {
            //user has being authenticated successfully
            socket.emit('authenticated', true);
            //Hitting the Own API Written Below
            var post_raw_data = {
              device_id: device_id_is,
              appId: app_id_is,
              type: globalType
            };
            //using querystring to transform the data into api link
            var post_data = querystring.stringify(post_raw_data);
            var options_1 = {
              host: ip_address,
              port: port,
              path: '/User/Register',
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
              }
            };
            var post_req = http.request(options_1, function(res) {
              res.setEncoding('utf8');
              res.on('data', function(token_id) {
                socket.emit('deviceTokenId', token_id);
              });
            });
            post_req.on('error', function(e) {
              console.log('ERROR IS  also HERE: ' + e.message);
            }); //printing error if found
            post_req.write(post_data, function(err) {
              post_req.end();
            });
          }
        } else if (body.hasOwnProperty('error')) {
          var error = body.error;
          console.log(error);
          if (error.includes("No Rows Found")) {
            socket.emit('authenticated', 'bye');
            console.log("No Rows Found");
          }
        }
      });
    });
    get_req.write(get_data); //sending get request
    get_req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    }); //printing error if found
    //get_req.end();//closing the get request
  });
  //***************
  //----Log On----
  //***************
  socket.on('logOn', function(token) {
    var device_token = token;
    var where_param = '{"name":"token","condition":"EQUAL","data":"' + device_token + '"}';
    var get_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
    get_raw_data['table_name'] = 'messages';
    get_raw_data['wheres'] = where_param;
    get_raw_data['columns'] = '["message","message_id","time_stamp"]';
    get_raw_data['order_by'] = '["time_stamp"]';//This will get the result in ASCENDING order
    var get_data = querystring.stringify(get_raw_data);
    var options = config.apiOptions("GET", get_data); //calling API options
    var get_req = http.get(options, function(res) {
      var bodyChunks = [];
      res.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        // console.log('BODY: ' + body);
        var body = JSON.parse(body);
        console.log(body);
        if (body.hasOwnProperty('success')) {
          var success = body.success;
          if (success.includes("No Rows Found")) {
            console.log("No Rows Found");
          } else {
            for (var i = 0; i < success.length; i++) {
              var message_to_send = success[i].message;
              var message_id_client = success[i].message_id;
              var message_timestamp = success[i].time_stamp;
              var params = {
                id: message_id_client,
                message: message_to_send,
                timestamp: message_timestamp,
                sender: "cloud_db"
              };
              sendMessage(socketid, params);
            }
          }
        }
      });
    });
    get_req.write(get_data); //sending get request
    get_req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    }); //printing error if found

    var type;
    var where_param = '{"name":"token_id","condition":"EQUAL","data":"' + token + '"}';
    var get_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
    get_raw_data['table_name'] = 'devices';
    get_raw_data['wheres'] = where_param;
    get_raw_data['columns'] = '["token_id","type"]';
    var get_data = querystring.stringify(get_raw_data);
    var options_1 = config.apiOptions("GET", get_data); //calling API options
    var get_req = http.get(options_1, function(resd) {
      // Buffer the body entirely for processing as a whole.
      var bodyChunks = [];
      resd.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function() {
        var body = Buffer.concat(bodyChunks);
        // console.log('BODY: ' + body);
        var body = JSON.parse(body);
        if (body.hasOwnProperty('success')) {
          var success = body.success; //saving the success value in variable - success
          // On success there will a check if token_id returns it will send to client using response
          if (success[0].hasOwnProperty('type')) {
            //On success getting the returning_columns value i.e type
            type = success[0].type;
            token_id = success[0].token_id;
            var params = '{"token" :"' + token_id + '","socket_id" : "' + socketid + '","type" :"' + type + '"}'; //parameters to be pass to  database
            var post_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
            post_raw_data['table_name'] = 'device_sockets';
            post_raw_data['wheres'] = where_param;
            post_raw_data['columns'] = params;
            post_raw_data['returning_columns'] = '["window_id"]';
            var post_data = querystring.stringify(post_raw_data);
            var options = config.apiOptions("POST", post_data); //calling API options
            var post_req = http.request(options, function(res) {
              res.setEncoding('utf8');
              res.on('data', function(chunk) {
                chunk = JSON.parse(chunk);
              });
            });
            post_req.write(post_data);
            post_req.on('error', function(e) {
              console.log('ERROR: ' + e.message);
            });
            //post_req.end();
          }
        } else if (body.hasOwnProperty('error')) {
          var error = body.error;
          if (error.includes("No Rows Found")) {
            console.log("No Rows Found");
          }
        }
      })
    });
    get_req.on('error', function(e) {
      console.log('ERROR: ' + e.message);
    }); //printing error if found
    get_req.write(get_data); //sending get request
    //get_req.end();//closing the get request

  });
  //*************************
  //----Socket Disconnect----
  //*************************
  socket.on('disconnect', function() {
    try {
      console.log('Socket Disconnected :: ' + socketid);
      var where_param = '{"name":"socket_id","condition":"EQUAL","data":"' + socketid + '"}';
      var del_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
      del_raw_data['table_name'] = 'device_sockets';
      del_raw_data['wheres'] = where_param;
      var del_data = querystring.stringify(del_raw_data);
      var options = config.apiOptions("DELETE", del_data); //calling API options
      var del_req = http.get(options, function(resd) {
        var bodyChunks = [];
        resd.on('data', function(chunk) {
          // You can process streamed parts here...
          bodyChunks.push(chunk);
        }).on('end', function() {
          var body = Buffer.concat(bodyChunks);
          // console.log('BODY: ' + body);
          var body = JSON.parse(body);
          if (body.hasOwnProperty('success')) {
            var success = body.success; //saving the success value in variable - success
            console.log(success);
            console.log('socket :: ' + socketid + ' deleted!');
          }
        })
      });
      del_req.write(del_data); //sending get request
      del_req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
      }); //printing error if found
      //get_req.end();//closing the get request
    } catch (e) {
      console.log(e);
    }
  });
});
// ==========================End Of Sockets======================================
//*******************
//---REGISTER USER---
//*******************
// This API is called when user calls the /User/Register API
//It requires long_code(username) and password for the better working of API with no failures
app.post('/User/Register', (req, response) => {
  //Getting params received while requesting the API
  var deviceId = req.body.device_id; //It is generate on WEB and On windows it will send MAC address
  var appId = req.body.appId; //It is a number specifically for WEB & WINDOWS
  var type = req.body.type; //It sends the  type of device it is.
  var keygen = ""; //This will generate a random 128bits device_token which will identify a particular device untill UNREGISTER
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; //Possible chars in Token
  // Generating 128 char long device_token
  for (var i = 0; i < 128; i++)
    keygen += possible.charAt(Math.floor(Math.random() * possible.length));

  // INSERTING IN DEVICES TABLE
  //sending all the received information to register a user device
  var params = '{"token_id" :"' + keygen + '","device_id" :"' + deviceId + '","app_id" : "' + appId + '","type" :"' + type + '"}'; //parameters to be pass to  database
  var post_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
  post_raw_data['table_name'] = 'devices';
  post_raw_data['columns'] = params;
  post_raw_data['returning_columns'] = '["token_id"]';
  var post_data = querystring.stringify(post_raw_data);
  var options = config.apiOptions("POST", post_data); //calling API options
  //generating a request
  var post_req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      try {
        chunk = JSON.parse(chunk);
        if (chunk.hasOwnProperty('error')) { //Checks if the API encountered an ERROR
          var error = chunk.error;
          if (error.includes("duplicate key value")) { //If the error is duplicate Entry
            //Found to be a same user with same device_id and same app_id
            //Being a already registered user it returns the same token_id of the user
            var token;
            //where clause stating get the user details using deviceID & appId in devices table
            var where_param = '{"name":"device_id","condition":"EQUAL","data":"' + deviceId + '","and":{"name":"app_id","condition":"EQUAL","data":"' + appId + '"}}';
            var get_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
            get_raw_data['table_name'] = 'devices';
            get_raw_data['columns'] = '["token_id"]';
            get_raw_data['wheres'] = where_param;
            var get_data = querystring.stringify(get_raw_data);
            var options1 = config.apiOptions("GET", get_data); //calling API options
            //generating get request
            var get_req = http.get(options1, function(resd) {
              // Buffer the body entirely for processing as a whole.
              var bodyChunks = [];
              resd.on('data', function(chunk1) {
                // You can process streamed parts here...
                // getting the number of rows being pushed in bodyChunks Array
                bodyChunks.push(chunk1);
              }).on('end', function() {
                try {
                  var body = Buffer.concat(bodyChunks);
                  var body = JSON.parse(body); //Parsing from string/array to JSON
                  if (body.hasOwnProperty('success')) { //On getting success response
                    var success = body.success; //saving the success value in variable - success
                    // On success there will a check if token_id returns it will send to client using response
                    if (success[0].hasOwnProperty('token_id')) { //if the success has token_id as key
                      //On success getting the returning_columns value i.e token_id
                      response.send(success[0].token_id);
                    } //end of if
                  } //end of if
                } catch (e) {
                  console.log("Some Exception Caught :: " + e);
                } //End Of Try Catch
              }); //end of response
            }); //end of get request
            get_req.on('error', function(e) {}); //printing error if found
            get_req.write(get_data); //sending get request
            get_req.end(); //closing the get request
          } //End of if (duplicate value)
        } else if (chunk.hasOwnProperty('success')) {
          var success = chunk.success; //saving the success value in variable - success
          // On success there will a check if token_id returns it will send to client using response
          if (success[0].hasOwnProperty('token_id')) {
            //On success getting the returning_columns value i.e token_id
            response.send(success[0].token_id);
          } //End of if
        } else {
          console.log('Neither error Nor Success!');
        } //end of else
      } catch (e) {
        console.log("Some Exception Caught :: " + e);
      } //End Of Try Catch
    }); //End of Response
  }); //End of Requeest
  post_req.on('error', function(e) {}); //printing error if found
  post_req.write(post_data, function(err) {
    post_req.end();
  });
});
//END OF REGISTER USER API
//******************
//-----SEND MSG-----
//******************
//defining global array to send response from Recursive function to API called
var deviceRespArr = new Array();
//Recursive Function to act 1 device_token at a time
function SendMessageRecursive(device_token_array, message, response) {
  if (device_token_array.length > 0) { //Checks if array has 1 or more elements.
    //it will always take the first element of array i.e[0]
    //here we will hit the request  or rather we will send the data.
    var checksum = md5(message); //Generating checksum of the byte message.
    var params = '{"token" :"' + device_token_array[0] + '","message" :"' + message + '","checksum" : "' + checksum + '"}'; //parameters to be passes to  database
    var post_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
    post_raw_data['table_name'] = 'messages';
    post_raw_data['returning_columns'] = '["message","message_id","time_stamp"]';
    post_raw_data['columns'] = params;
    var post_data = querystring.stringify(post_raw_data);
    var options = config.apiOptions("POST", post_data); //calling API options
    // This is for Messages Insert.
    var post_req = http.request(options, function(res3) {
      res3.setEncoding('utf8');
      res3.on('data', function(chunk) {
        try {
          chunk = JSON.parse(chunk);
          if (chunk.hasOwnProperty('error')) { //if Insert in Messages table Returns error,
            var error = chunk.error;
            if (error.includes("foreign key violation")) { //if and only if it token id dosent exists in devices table.
              console.log('No Device Exits! Message Delivery Failed!');
              var tempObj = new Object();
              tempObj[device_token_array[0]] = "Device Unavailable";
              deviceRespArr.push(tempObj);
              device_token_array.splice(0, 1);
              SendMessageRecursive(device_token_array, message, response);
            }
          } else if (chunk.hasOwnProperty('success')) { //if Insert in  Messages Return success
            var success = chunk.success;
            var msg_frm_database = success[0].message; //getting message in byte form from database
            var message_id = success[0].message_id; //getting message id from database
            var message_timestamp = success[0].time_stamp; //getting message time_stamp from database
            var where_param = '{"name":"token","condition":"EQUAL","data":"' + device_token_array[0] + '"}'; //clause where token EQUALS the current device_token
            var get_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
            get_raw_data['table_name'] = 'device_sockets';
            get_raw_data['columns'] = '["socket_id"]';
            get_raw_data['wheres'] = where_param;
            var get_data = querystring.stringify(get_raw_data);
            var options4 = config.apiOptions("GET", get_data); //calling API options
            var get_req = http.get(options4, function(res4) {
              var bodyChunks = [];
              res4.on('data', function(chunk) { //when response received on API call
                chunk = JSON.parse(chunk);
                if (chunk.hasOwnProperty('success')) { //if the response has success
                  try {
                    var sockets = chunk.success;
                    if (sockets.includes("No Rows Found")) { //when success sents "No Rows Found".
                      // If Now rows found in device_sockets. It states that there is no active devices.
                      //It returns with "Pending" status of that device token number.
                      var tempObj = new Object();
                      tempObj[device_token_array[0]] = "Pending"; //Sending status as value and device_token as key
                      deviceRespArr.push(tempObj);
                      device_token_array.splice(0, 1); //once Done Will remove the current token from device_token_array
                      SendMessageRecursive(device_token_array, message, response); //will again call the same function to carry out with another token
                    } else { //when success and returns socketid
                      for (j = 0; j < sockets.length; j++) { //checks no of socketid received and runs for
                        var params = {
                          id: message_id,
                          message: msg_frm_database,
                          timestamp: message_timestamp,
                          sender: "cloud_db"
                        }; // generating a param to send to sendMessage function
                        var to_socket = sockets[j].socket_id; //saving the socket_id in variable
                        sendMessage(to_socket, params); //sending socket_id and msg to sendMessage(Socket).
                      }
                      //Once done with for iteration send Delivered status as response
                      //It returns with "Delivered" status of that device token number.
                      var tempObj = new Object();
                      tempObj[device_token_array[0]] = "Delivered"; //Sending status as value and device_token as key
                      deviceRespArr.push(tempObj);
                      device_token_array.splice(0, 1); //once Done Will remove the current token from device_token_array
                      SendMessageRecursive(device_token_array, message, response); //will again call the same function to carry out with another token
                    } //end of if...else
                  } catch (e) {
                    console.log("Some Exception Caught :: " + e);
                  } //End of try Catch
                } else {
                  console.log("Error Occured while getting data from device_sockets :: " + chunk);
                } //end of if ELSE
              });
            });
            get_req.on('error', function(e) {}); //printing error if found
            get_req.write(get_data); //sending request
            get_req.on('close', () => {
              get_req.end();
            });
          } else {
            console.log("Error Occured while insert data in messages :: " + chunk);
          } // end of if...else if...else
        } catch (e) {
          console.log("Some Exception Caught :: " + e);
        } //End of try Catch
      });
    }); //Request End
    post_req.write(post_data);
    post_req.on('error', function(e) {}); //printing error if found
    post_req.end();
  } else {
    //This is the end of the Recursive Functions
    //Once all the device_tokens are done it ends with the /Send/Message API
    try {
      //generating a success_array(temporary variable) to avoid overwriting of data.
      //this will get us the response in proper structure.
      var success_array = {
        "success": deviceRespArr
      };
      deviceRespArr = new Array();
      response.send(success_array);
    } catch (err) {
      var error_array = {
        "error": err
      };
      response.send(error_array);
    }
  } //End of Recursive function if...else
} //End Of Recursive Function SendMessageRecursive()
//This is the Start of the Send Message API
app.post('/Send/Message', (request, response) => {
  try {
    //getting device tokens and message from request.
    var device_token_array = JSON.parse(request.body.device_tokens);
    //Message is converted from string to bytes to avoid relocatiing of keys in JSON message.
    var message = convert.stringToBytes(request.body.message).toString(); //Converting message received to bytes
    //calling a Recursive function to take care of all the tokens send a params and deliver message and submit the response of Each Token with status.
    SendMessageRecursive(device_token_array, message, response);
  } catch (e) {
    console.log("Some Exception Caught :: " + e);
  } //End of try Catch
});
//END OF SEND MESSAGE API
//******************
//-----PURGE MSG-----
//******************
//This is the start of Purge API
//This api requires token_id in request to work on and deletes all the messages with that token_id in messages table.
app.delete('/Purge',(request,response) => {
  var token_id = request.query.token_id;
  var where_param = '{"name":"token","condition":"EQUAL","data":"' + token_id + '"}';
  var del_raw_data = config.getToken("cloud_push"); //Getting Tokens From Config
  del_raw_data['table_name'] = 'messages';
  del_raw_data['wheres'] = where_param;
  var del_data = querystring.stringify(del_raw_data);
  var options = config.apiOptions("DELETE", del_data); //calling API options
  var del_req = http.get(options, function(resd) {
    var bodyChunks = [];
    resd.on('data', function(chunk) {
      // You can process streamed parts here...
      bodyChunks.push(chunk);
    }).on('end', function() {
      var body = Buffer.concat(bodyChunks);
      // console.log('BODY: ' + body);
      var body = JSON.parse(body);
      console.log('***********----MESSAGE DELETED----*********');
      console.log(body);
      if (body.hasOwnProperty('success')) {
        console.log(body);
        res_to_send = {"success" : body.success };
        response.send(res_to_send);
      } //on success in deleting form messages table
      else if (body.hasOwnProperty('error')) {
        console.log("Messages table error");
        res_to_send = {"error" : body.error };
        response.send(res_to_send);
      }
    });
  });
  del_req.write(del_data); //sending delete request
  del_req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
  }); //printing error if found
});
//End of Purge API

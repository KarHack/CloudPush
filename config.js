var options, ip_address = '10.150.0.2',
  port_number = 8080;
module.exports = {
  // getToken;
  getToken: function(token_type) {
    if (token_type === "36e_biz") {
      var token = {
        v: '0.1',
        token: '9829rXrbENbKFxfCUydS8ZfDxYjqgCJjJUgYuMVAVPLz3yGxYnKdzwchHULCpfqKLTsqAEzPDYFmyhMJAD5WvzQhz5hCuBFNxuepP653TjRHZXEZ8NMbZ2z88hBrYGCZErbW84nxJRAkxyx9vLHH9S5WqtMvBcjmpecjYuMXrdT2fTSCNzk3rSuuzRXDjR6P7E63gTmYZzFnJpWggA5cWRys4tabcQdd4faJTQhL99uRshSQ4d42Rc2rhXRBH8L7'
      };
      return token;
    } else if (token_type === "cloud_push") {
      var token = {
        v: '0.1',
        token: 'GqBXWzv8yvu3q4s9UAxUsYBHx4gwBeAHsMqAR3Chtj4WzN9QfEHx8RxzwVKV7T8YNUwZNGbp7vnnW8JZfaZswbK66wQshhdBzTUQ29XPN37SvK2F3pcUfnrG4mQ4QL5ej3YHw3cuRNzceFZWVC5BWJNmmUugH9bPUsDnTdA52aCPYhvuqvYM7wFMQCzjYCr8c35B2kPbDEeb9xKJZ4KzeN9PcUzpBMxKpd2qNbKjckjFBWSWf6VvCj3CpnS5g7kw'
      };
      return token;
    } else {
      console.log("No Token Type Found");
    }
  },
  // Getting API Option
  apiOptions: function(method, data) {
    if (method === "POST") {
      options = {
        host: ip_address,
        port: port_number,
        path: '/CloudDB/Table/Data',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
        }
      };
    } else if (method === "GET") {
      options = {
        host: ip_address,
        port: port_number,
        path: '/CloudDB/Table/Data?' + data,
        method: 'GET'
      };
    } else if (method === "DELETE") {
      options = {
        host: ip_address,
        port: port_number,
        path: '/CloudDB/Table/Data?' + data,
        method: 'DELETE'
      };
    } else {
      console.log("No Method Found :: " + method);
    }
    return options;
  }
};
//calling API options

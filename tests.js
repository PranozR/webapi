//Get all the imports
let chai = require('chai');
let chaiHttp = require('chai-http');

let expect = chai.expect;

chai.use(chaiHttp);

// base uri
const uri = '127.0.0.1:4200';

describe("when we issue a 'GET' to /patients", function () {
	// Make a GET request to /patients
	it('should return empty list []', function (done) {
		chai
			.request(uri)
			.get('/patients')
			.end(function (req, res) {
				expect(res.text).to.equal('[]');
				done();
			});
	});
});

describe("when we issue a 'GET' to /patients", function () {
	// Make a GET request to /patients
	it('should return HTTP 200', function (done) {
		chai
			.request(uri)
			.get('/patients')
			.end(function (req, res) {
				expect(res.status).to.equal(200);
				done();
			});
	});
});

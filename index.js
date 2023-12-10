require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
	const generateUri = async () => {
		//Connect to the local database
		if (process.env.NODE_ENV === 'local') {
			const mongoServer = await MongoMemoryServer.create({
				instance: {
					port: 27013,
				},
			});
			return mongoServer.getUri();
		} else {
			return process.env.MONGO_DB_URI;
		}
	};

	const uristring = await generateUri();

	mongoose.connect(uristring, { useNewUrlParser: true });

	const db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', () => {
		// we're connected!
		console.log('Connected to the database ' + uristring);
	});
})();

let errors = require('restify-errors');
const { v4: uuidv4 } = require('uuid');

let APP_PORT = process.env.PORT;
let APP_HOST = process.env.HOST;

const TestSchema = new mongoose.Schema({
	name: String,
	id: String,
	value: String,
});

const PatientSchema = new mongoose.Schema({
	name: String,
	age: Number,
	email: String,
	phone_number: String,
	house_address: String,
	condition: {
		type: String,
		default: 'normal',
	},
	tests: {
		type: [TestSchema],
		default: [],
	},
});

let PatientModel = mongoose.model('Patients', PatientSchema);

let restify = require('restify'),
	// Create the restify server
	server = restify.createServer({ name: 'patient-manager' });

server.listen(APP_PORT, function () {
	console.log('Server %s listening at %s', server.name, server.url);
	console.log('**** Resources: ****');
	console.log('********************');
	console.log('Endpoints:');
	console.log('----------------------------');
	console.log(
		`   GET PATIENTS (method: GET) => ${APP_HOST}:${APP_PORT}/patients`
	);
	console.log(
		`   GET SINGLE PATIENT (method: GET) => ${APP_HOST}:${APP_PORT}/patients/:id`
	);
	console.log(
		`   DELETE A PATIENT (method: DELETE) => ${APP_HOST}:${APP_PORT}/patients/:id`
	);
	console.log(
		`   ADD NEW PATIENT (method: POST) => ${APP_HOST}:${APP_PORT}/patients`
	);
	console.log(
		`   UPDATE PATIENT (method: PUT) => ${APP_HOST}:${APP_PORT}/patients/:id`
	);
});

server.use(restify.plugins.fullResponse());
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Get all patients in the system
server.get('/patients', function (req, res, next) {
	console.log('GET /patients params=>' + JSON.stringify(req.params));

	const query = {};

	PatientModel.find(query)
		.then(patients => {
			// Return all of the patients in the system
			res.send(patients);
			return next();
		})
		.catch(error => {
			return next(new Error(JSON.stringify(error.errors)));
		});
});

// Get a single patient by using the patient id
server.get('/patients/:id', function (req, res, next) {
	// Find a single patient by their id in db
	PatientModel.findOne({ _id: req.params.id })
		.then(patient => {
			if (patient) {
				// Send the patient if no issues occurred
				res.send(patient);
			} else {
				res.send(404);
			}
			return next();
		})
		.catch(error => {
			console.log('error: ' + error);
			return next(new Error(JSON.stringify(error.errors)));
		});
});

// Create a new patient
server.post('/patients', function (req, res, next) {
	// validation of manadatory fields
	if (req.body.name === undefined) {
		return next(new errors.BadRequestError('name must be supplied'));
	}
	if (req.body.age === undefined) {
		return next(new errors.BadRequestError('age must be supplied'));
	}
	if (req.body.email === undefined) {
		return next(new errors.BadRequestError('email must be supplied'));
	}
	if (req.body.phone_number === undefined) {
		return next(new errors.BadRequestError('phone_number must be supplied'));
	}
	if (req.body.house_address === undefined) {
		// If there are any errors, pass them to next in the correct format
		return next(new errors.BadRequestError('house_address must be supplied'));
	}

	let new_patient = new PatientModel({
		name: req.body.name,
		age: req.body.age,
		email: req.body.email,
		phone_number: req.body.phone_number,
		house_address: req.body.house_address,
	});

	// Create the patient
	new_patient
		.save()
		.then(patient => {
			// return the patient
			res.send(201, patient);
			return next();
		})
		.catch(error => {
			console.log('error: ' + error);
			return next(new Error(JSON.stringify(error.errors)));
		});
});

// Delete patient with the given id
server.del('/patients/:id', function (req, res, next) {
	// Delete the patient in db
	PatientModel.findOneAndDelete({ _id: req.params.id })
		.then(deletedPatient => {
			if (deletedPatient) {
				res.send(200, deletedPatient);
			} else {
				res.send(404, 'Patient not found');
			}
			return next();
		})
		.catch(error => {
			console.log('error: ' + error);
			return next(new Error(JSON.stringify(error.errors)));
		});
});

// Update patient info
server.put('/patients/:id', function (req, res, next) {
	const body = JSON.parse(req.body);

	if (body.name === undefined) {
		return next(new errors.BadRequestError('name must be supplied'));
	}
	if (body.age === undefined) {
		return next(new errors.BadRequestError('age must be supplied'));
	}
	if (body.email === undefined) {
		return next(new errors.BadRequestError('email must be supplied'));
	}
	if (body.phone_number === undefined) {
		return next(new errors.BadRequestError('phone number must be supplied'));
	}
	if (body.house_address === undefined) {
		// If there are any errors, pass them to next in the correct format
		return next(new errors.BadRequestError('house address must be supplied'));
	}

	// Update a  patient
	PatientModel.findOneAndUpdate(
		{
			_id: req.params.id,
		},
		{
			name: body.name,
			age: body.age,
			email: body.email,
			phone_number: body.phone_number,
			house_address: body.house_address,
			condition: body.condition,
		},
		{
			new: true,
		}
	)
		.then(updatedPatient => {
			if (updatedPatient) {
				res.send(200, {
					data: updatedPatient,
					message: 'Patient info updated',
				});
			} else {
				res.send(404, 'Patient not found');
			}
			return next();
		})
		.catch(error => {
			console.log('error: ' + error);
			return next(new Error(JSON.stringify(error.errors)));
		});
});

// Create a new test for a patient
server.post('/patients/:id/tests', function (req, res, next) {
	console.log('POST /patients/:id/tests body=>' + JSON.stringify(req.body));

	// Validation of mandatory fields
	if (req.body.name === undefined || req.body.value === undefined) {
		// If there are any errors, pass them to next in the correct format
		return next(new errors.BadRequestError('name and value must be supplied'));
	}

	// Find the patient by ID
	PatientModel.findOne({ _id: req.params.id })
		.then(patient => {
			console.log('Patient found: ' + patient);
			if (patient) {
				// Create a new test object using the provided data
				const newTest = {
					name: req.body.name,
					value: req.body.value,
					id: uuidv4(),
				};

				// Add the new test object
				patient.tests.unshift(newTest);

				// condition for critical test
				if (parseFloat(req.body.value) > 5) {
					patient.condition = 'critical';
				} else {
					patient.condition = 'normal';
				}

				// Save the updated patient document to the database
				return patient.save();
			} else {
				// Send 404 status if the patient doesn't exist
				res.send(404);
			}
		})
		.then(updatedPatient => {
			res.send(201, updatedPatient);
			return next();
		})
		.catch(error => {
			console.log('Error: ' + error);
			return next(new Error(JSON.stringify(error.errors)));
		});
});

// Update test info for a patient
server.put('/patients/:id/tests/:test_id', function (req, res, next) {
	// Validation of mandatory fields
	if (req.body.name === undefined || req.body.value === undefined) {
		// If there are any errors, pass them to next in the correct format
		return next(new errors.BadRequestError('name and value must be supplied'));
	}

	// Find the patient by ID
	PatientModel.findOne({ _id: req.params.id })
		.then(patient => {
			console.log('Patient found: ' + patient);
			if (patient) {
				// Get index of the test
				const testIndex = patient.tests.findIndex(
					test => test.id === req.params.test_id
				);

				if (testIndex !== -1) {
					// Update the test object
					patient.tests[testIndex].name = req.body.name;
					patient.tests[testIndex].value = req.body.value;

					// condition for critical test
					if (parseFloat(req.body.value) > 6) {
						patient.condition = 'critical';
					} else {
						patient.condition = 'normal';
					}

					// Save the updated patient document
					return patient.save();
				} else {
					// If the test is not found, send a 404 status
					res.send(404);
				}
			} else {
				// Send 404 status if the patient doesn't exist
				res.send(404);
			}
		})
		.then(updatedPatient => {
			res.send(200, {
				oldPatient: updatedPatient,
				message: 'Test info updated',
			});
			return next();
		})
		.catch(error => {
			console.log('Error: ' + error);
			return next(new Error(JSON.stringify(error.errors)));
		});
});

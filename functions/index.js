const functions = require('firebase-functions');
const admin = require('firebase-admin');
const requestPromise = require('request-promise');
const cors = require('cors');

require('dotenv').config();

admin.initializeApp();

const allowedOrigins = ['http://127.0.0.1:5000', 'http://localhost:5000', 'https://vacation-gpt.web.app'];
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
const corsMiddleware = cors(corsOptions);

exports.writeLetter = functions.https.onRequest((req, res) => {
    // Enable CORS using the middleware
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(400).send('Please send a POST request');
        }

        const { name, reason, date, days, mood } = req.body;

        if (!name || !reason || !date || !mood || !days) {
            return res.status(400).send('Missing required parameters');
        }

        try {
            const remoteApiResponse = await makeApiCall(name, reason, date, days, mood);
            res.status(200).send([remoteApiResponse.choices[0].message.content.replaceAll("\n", "<br/>")]);
        } catch (error) {
            res.status(500).send('Error making API call');
        }
    });
});

async function makeApiCall(name, reason, date, days, mood) {

    const isLocal = process.env.FUNCTIONS_EMULATOR; // Check if running in the local environment
    const apiKey = isLocal ? process.env.API_KEY : functions.config().api.key; // Use the appropriate method based on the environment

    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const options = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        uri: apiUrl,
        /* body: {
          name: name,
          reason: reason,
          date: date
        }, */
        body: {
            "model": "gpt-3.5-turbo",
            "messages": [{
                "role": "user",
                "content": `I am ${name}, and I want to take a leave for ${days} days from ${date} because of ${reason}. Write a leave letter for me addressing my manager. Make the overall mood of the letter ${mood}.`
            }],
            "temperature": 0.7
        },
        json: true
    };

    try {
        const response = await requestPromise(options);
        return response;
    } catch (error) {
        console.error(`Error making API call: ${error}`);
        throw error;
    }
}
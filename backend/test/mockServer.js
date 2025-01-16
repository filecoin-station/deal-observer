import express from 'express';
import { chainHeadTestData } from './test_data/chainHead.js';
import { encode as jsonEncode } from '@ipld/dag-json'

const app = express();
const testServerPort = 8080;

// Middleware to parse JSON request bodies
app.use(express.json());

// Define the 'ping' route
app.get('/', (req, res) => {
  res.json({ ping: 'pong' });
});

// Define the POST route to handle specific methods
app.post('/', (req, res) => {
  const requestData = req.body;
  switch (requestData.method) {
    case 'Filecoin.GetActorEventsRaw':
      console.log('Filecoin.GetActorEventsRaw');
      break;
    case 'Filecoin.ChainHead':
      console.log('Filecoin.ChainHead');
      return res.json({ result: jsonEncode(chainHeadTestData) }); // Replace with your actual chainHeadTestData
    default:
      console.error(`Unknown method ${requestData.method}`);
  }

  res.json({
    status: 'success',
    message: `Hello, ${requestData.name}! Your request was processed.`,
    receivedData: requestData,
  });
});

// Function to start the server and return a Promise
const startServer = () => {
    return new Promise((resolve, reject) => {
      const server = app.listen(testServerPort, () => {
        console.log(`Server is running at http://localhost:${testServerPort}`);
        resolve(server); // Resolve the promise when the server starts
      });
      server.on('error', (err) => reject(err)); // Reject if there is an error
    });
  };
const testServerURL = `http://localhost:${testServerPort}`;
export { startServer, testServerURL };
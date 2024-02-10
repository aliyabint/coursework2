const express = require('express')
const path = require('path');
const http = require ('http');
const app = express()
app.use(express.json())
app.set('port', 3000)
const cors = require('cors');
app.use(cors());
app.use((req, res, next) => {
    // res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');


})

// Logger middleware function
const logger = (req, res, next) => {
    console.log(`[${new Date().toUTCString()}] ${req.method} ${req.url}`);
    next(); // Call the next middleware function in the stack
};

// Register the logger middleware
app.use(logger);


const MongoClient = require('mongodb').MongoClient;

let db;
MongoClient.connect('mongodb+srv://aliya:aliya209@cluster0.6gycrpw.mongodb.net', (err, client) => {
    db = client.db('yourguide')
})

//display a message for root path to show that API is working
app.get('/', (req, res, next) => {
    res.send('select a collection, e.g., /collection/messages')
})

//get collection name
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName)
    return next()
})
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e)
        res.send(results)
    })
})

app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insert(req.body, (e, results) => {
        if (e) return next(e)
        res.send(results.ops)
    })
})


//retunr with object id
const ObjectID = require('mongodb').ObjectID;
app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => {
        if (e) return next(e)
        res.send(result)
    })
})
// Handle PUT request to update a document in the collection
app.put('/collection/:collectionName/:id', (req, res, next) => {
    const id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    req.collection.updateOne(
        { _id: new ObjectID(id) },
        { $set: req.body },
        { safe: true, multi: false },
        (err, result) => {
            if (err) {
                console.error('Error updating document:', err);
                return res.status(500).json({ error: 'Failed to update document' });
            }
            res.json({ msg: result.modifiedCount > 0 ? 'Document updated successfully' : 'No document found to update' });
        }
    );
});

//deleting products
app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne(
        { _id: new ObjectID(req.params.id) }, (e, result) => {
            if (e) return next(e)
            res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' })

        })
})




app.use(cors({
    origin: 'http://localhost:3000/collection/classes',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.post('/orders', (req, res, next) => {
    // Assuming you have access to the order data in the request body
    const orderData = req.body;

    // Save the order data to your database
    db.collection('orders').insertOne(orderData, (err, result) => {
        if (err) {
            console.error('Error saving order:', err);
            return res.status(500).json({ error: 'Failed to save order' });
        }

        console.log('Order saved successfully:', result.ops);
        res.status(201).json(result.ops); // Respond with the saved order data

        
    });
});

// Handle GET request for searching classes
app.get('/collection/classes/search/:searchQ', (req, res, next) => {
    const query = req.params.searchQ; // Retrieve the search query parameter

    let filter = {}; // Define an empty filter object

    if (query) {
        // If a search query is provided, construct a filter to search by title or description
        filter = {
            $or: [
                { title: { $regex: query, $options: 'i' } }, // Case-insensitive search by title // Case-insensitive search by description
            ]
        };
    }

    // Use the filter to find matching classes
    db.collection('classes').find(filter).toArray((err, results) => {
        if (err) {
            console.error('Error performing search:', err);
            return res.status(500).json({ error: 'Failed to perform search' });
        }
        res.send(results); // Send the search results back to the client
    });
});


app.get('/collection/:collectionName', (req, res, next) => {
    const query = req.query.search; // Retrieve the search query parameter
    let filter = {}; // Define an empty filter object

    if (query) {
        // If a search query is provided, construct a filter to search by title or description
        filter = {
            $or: [
                { title: { $regex: query, $options: 'i' } }, // Case-insensitive search by title
                { description: { $regex: query, $options: 'i' } } // Case-insensitive search by description
            ]
        };
    }

    req.collection.findOne(filter, (err, result) => {
        if (err) return next(err);
        res.send(result);
    });
});


// Define the directory where your static images are located
const STATIC_IMAGE_DIR = path.join(__dirname,'static','images');

// Set up middleware to serve static files (images in this case)
app.use('/images', express.static(STATIC_IMAGE_DIR));

// Define a route to handle image requests
app.get('/images/:imageFilename', (req, res) => {
    const imageFilename = req.params.imageFilename;
    res.sendFile(path.join(STATIC_IMAGE_DIR, imageFilename));
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('oops');
});


app.put('/collection/:collectionName/updateInventory/:id', (req, res, next) => {
    req.collection.update(
        { _id: new ObjectID(req.params.id) },
        { $set: req.body },
        { safe: true, multi: false },
        (e, result) => {
            if (e) return next(e)
            res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' })
        })
})


    

const port = process.env.PORT || 3000
app.listen(port)


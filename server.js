const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { TableClient } = require('@azure/data-tables');

const app = express();
const PORT = 3000;


// Blob Storage setupz
const sasToken = "?enter your own blob sas token";
const blobConnectionString = 'enter your own connection string';
const blobServiceClient = BlobServiceClient.fromConnectionString(blobConnectionString);
const containerName = 'photos';
const containerClient = blobServiceClient.getContainerClient(containerName);

// Table Storage setup
const tableConnectionString = 'enter your own connection string';
const tableName = 'photoMetadata';
const tableClient = TableClient.fromConnectionString(tableConnectionString, tableName);

// Multer setup for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files from public folder
app.use(express.static('public'));

app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        // Upload to Blob Storage
        const blockBlobClient = containerClient.getBlockBlobClient(req.file.originalname);
        await blockBlobClient.upload(req.file.buffer, req.file.size);

        // Save metadata in Table Storage
        const dateNow = new Date().toISOString();
        await tableClient.createEntity({
            partitionKey: "photos",
            rowKey: dateNow,
            title: req.body.title,
            url: blockBlobClient.url,
            uploadedAt: dateNow
        });

        res.redirect('/'); // Redirect to homepage after successful upload
    } catch (error) {
        res.status(500).send(`Error uploading photo: ${error.message}`);
    }
});

app.get('/photos', async (req, res) => {
    try {
        const photos = [];
        const entities = tableClient.listEntities();
        
        for await (const entity of entities) {
            photos.push({
                title: entity.title,
                url: `${entity.url}${sasToken}` 
              // url: entity.url
            });
        }
        res.json(photos);
    } catch (error) {
        res.status(500).send(`Error fetching photos: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

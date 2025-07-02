# PDV Import Service

A NestJS application for importing CSV files containing PDV (Point of Sale) data into Firebase Firestore.

## Features

- Upload CSV files with PDV data
- Process large CSV files efficiently
- Store data in Firebase Firestore
- Batch processing for better performance
- File validation and error handling
- Interactive API documentation with Swagger UI

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase project with Firestore database
- Firebase Admin SDK credentials (service account key)

## Project Setup

```bash
npm install
```

## Development

```bash
# Start in development mode with hot-reload
npm run start:dev

# Build the application
npm run build

# Start in production mode
npm run start:prod
```

## API Documentation (Swagger)

After starting the application, access the interactive API documentation at:

```text
http://localhost:3000/api
```

The Swagger UI provides the following features:

- Detailed endpoint documentation
- Request/response schemas
- The ability to test API endpoints directly from the browser
- Example requests and responses

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pdv-import
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Go to Project Settings > Service Accounts
   - Click on "Generate new private key" to download the service account key
   - Rename the downloaded file to `firebase-service-account.json` and place it in the project root

4. **Configure environment variables**

   Create a `.env` file in the root directory with the following content:

   ```env
   PORT=3000
   ```

## API Endpoints

### Upload PDV Data

### Endpoint

`POST /pdv/upload`

### Headers

- `Content-Type`: `multipart/form-data`

### Request Body

- `file`: (required) CSV file containing PDV data

#### Example Request

```bash
curl -X POST http://localhost:3000/pdv/upload \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@sample-pdv-data.csv'
```

#### Example Response

```json
{
  "success": true,
  "message": "CSV processed successfully",
  "processed": 10000
}
```

## CSV Format

The CSV file should have the following columns (adjust in `create-pdv.dto.ts` if needed):

- `id`: Unique identifier for the PDV
- `name`: Name of the PDV location
- `address`: Street address
- `city`: City name
- `state`: State code (2 characters)
- `zipCode`: ZIP/Postal code
- `phone`: Contact phone number (optional)
- `email`: Contact email address

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/pdv-import/issues).

## License

This project is [MIT licensed](LICENSE).

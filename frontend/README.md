# Apex MVP Frontend

## Installation

Run `npm install` once, to fetch node_modules

## Configuration

`./frontend/src/settings/appSettings_[environment].json` contains `apiUrl` field which should be set to the relayer location 

## Running

Run `npm start` to run the app in development mode. Default location is [http://localhost:3000](http://localhost:3000)

## Building

Run `npm run build` to build the app

## Demo Data

- User addresses and private keys can be found after running `./scripts/reset_all.sh`, or in `./relayer/.env`
- Minimum amount to send is `849070`

## Generating Swagger client file

- run cardano-api

- run web-api with 
- `npm start swagger`

- Must have .net 6.0 sdk installed
- `npx nswag run ./frontend/src/swagger/apexBridgeService.nswag`


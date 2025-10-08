# Apex Web documentation

## Prerequisites
node v16.x.x

postgres v14.x

pgAdmin 4 (recommended)

## Installation

If you already have PostgreSQL installed and have set up the password for the 'postgres' user, you can skip steps 1 and 2.

### Step 1

Open a terminal and switch to the postgres system user. Once you are the postgres user, access the PostgreSQL command line interface. Reset the password for the postgres user. Replace "postgres" with your desired password.

```bash
$ sudo -i -u postgres
$ psql
$ ALTER USER postgres PASSWORD 'postgres';
$ \q
```

### Step 2

From pgAdmin4 open context menu for "Servers", and select Register -> Server...

General - Name: set local Server name (e.g Local)

Connection - Host name/address: localhost, Port: 5432, Username: postgres, Password: postgres (or your password from Step1)

Save

### Step 3

From pgAdmin4 open context menu for local server (Local from Step 2), and select Create -> Login/Group Role...

General - Name: apexuser (.env file)

Definition - Password: qwerty12AB (.env file)

Privileges - Check all

Save

### Step 4

From pgAdmin4 open context menu for local server (Local from Step 2), and select Create -> Database...

General - Database: apex (.env file)

Owner - apexuser

Save


### Step 5

Instal npm packages for backend and frontend

```bash
$ cd .\web-api\
$ npm install
$ cd ..\frontend\
$ npm install
```

## Running the web api

```bash
$ cd .\web-api\
# watch mode
$ npm run start:debug

```

## Running the frontend

```bash
$ $ cd .\frontend\
$ npm start

```

# Newest setup

- Start two `cardano-api` instances, one for `Skyline` and one for `Reactor`:
```bash
$ go run main.go run-cardano-api --config config_skyline.json
$ go run main.go run-cardano-api --config config_reactor.json
```
- Start one `web-api` instance. This instance communicates with both `Skyline` and `Reactor` `cardano-api` instances, as well as with both `Oracles`.
Configure it using the following environment variables:
ORACLE_SKYLINE_URL, ORACLE_SKYLINE_API_KEY, ORACLE_REACTOR_URL, ORACLE_REACTOR_API_KEY, CARDANO_API_SKYLINE_URL, CARDANO_API_SKYLINE_API_KEY,
CARDANO_API_REACTOR_URL, CARDANO_API_REACTOR_API_KEY
- Start the `frontend`, which communicates with the `web-api` as usual.
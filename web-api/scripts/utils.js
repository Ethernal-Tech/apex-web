const { exec } = require('child_process');

function runCommand(command, description) {
	return new Promise((resolve, reject) => {
		console.log(`${description}...`);
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error during ${description}:`, error.message);
				reject(error);
			} else if (stderr) {
				console.warn(`Warnings during ${description}:`, stderr);
				resolve(stdout);
			} else {
				console.log(`${description} completed successfully!`);
				resolve(stdout);
			}
		});
	});
};

function setCWDToScriptsDir() {
	let cwd = process.cwd()
	cwd = cwd.substring(0, cwd.lastIndexOf('web-api') + 'web-api'.length)
	process.chdir(`${cwd}/scripts`)
}

async function dropDB(dbConfig, backupDBName) {
	try {
		const dropDbCommand = `PGPASSWORD="${dbConfig.password}" psql --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.user} ${dbConfig.database} -c "DROP DATABASE ${backupDBName} WITH (FORCE);"`;
		await runCommand(dropDbCommand, 'Dropping backup database');
	} catch {}
}

module.exports = {
	runCommand,
	setCWDToScriptsDir,
	dropDB,
}
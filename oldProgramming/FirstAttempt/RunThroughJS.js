const { spawn } = require('child_process');

// Run a Python script
const pythonProcess = spawn('Main.py', ['C:/Users/roan1/PycharmProjects/Learning/Heart/FirstAttempt/Main.py']);

// Print output from the Python script to the console
pythonProcess.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

// Print any errors to the console
pythonProcess.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

// Run a function when the Python script has finished executing
pythonProcess.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

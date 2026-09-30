const { execSync } = require('child_process');
const path = require('path');
const gitExe = path.join(process.env.USERPROFILE, 'git', 'cmd', 'git.exe');

function run(cmd, allowFail = false) {
  console.log('\n$ git ' + cmd);
  try {
    const out = execSync('"' + gitExe + '" ' + cmd, { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 });
    if (out.trim()) console.log(out.trim());
    return out;
  } catch (err) {
    console.error('Error running git ' + cmd + ':', err.stdout || err.message);
    if (!allowFail) throw err;
  }
}

try {
  run('init');
  run('config user.name "aatman0212"');
  run('config user.email "aatman0212@users.noreply.github.com"');

  // Check remote
  try {
    run('remote add origin https://github.com/aatman0212/BizManager-Business_Management_System.git', true);
  } catch (e) {
    run('remote set-url origin https://github.com/aatman0212/BizManager-Business_Management_System.git', true);
  }

  run('branch -M main');
  run('add .');
  console.log('\n--- Staged Files Summary ---');
  run('status --short');
  run('commit -m "Initial commit: Smart Electronics BizManager retail management system"');
  console.log('\nCommit successful!');
} catch (e) {
  console.error('\nProcess stopped:', e.message);
}

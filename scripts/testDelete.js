/* eslint-disable no-console */
const baseUrl = process.env.BASE_URL || 'http://localhost:8080';

async function main() {
  try {
    const unique = Date.now();
    const email = `tempuser_${unique}@example.com`;
    const registerBody = {
      name: 'Temp User',
      email,
      password: 'TempPass123!',
      mobile: '9999999999',
      gender: 'Male',
      dob: '1995-01-01',
      religion: 'Sikh',
      marital_status: 'Single',
    };

    // Register
    const regRes = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerBody),
    });
    const regJson = await regRes.json().catch(() => ({}));
    console.log('REGISTER status:', regRes.status);
    console.log('REGISTER body:', regJson);
    if (!regRes.ok) return;

    // Login
    const loginRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'TempPass123!' }),
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    console.log('LOGIN status:', loginRes.status);
    console.log('LOGIN body keys:', Object.keys(loginJson));
    if (!loginRes.ok || !loginJson.token) return;

    // Delete
    const delRes = await fetch(`${baseUrl}/api/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginJson.token}` },
    });
    const delJson = await delRes.json().catch(() => ({}));
    console.log('DELETE status:', delRes.status);
    console.log('DELETE body:', delJson);
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  }
}

main();



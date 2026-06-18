import axios from 'axios';

async function testFeatures() {
    const username = 'testuser_mood_' + Date.now();
    const password = 'password123';
    const baseUrl = 'http://localhost:5000';

    try {
        // 1. Register
        console.log('Registering user:', username);
        try {
            await axios.post(`${baseUrl}/auth/register`, { username, password });
        } catch (e) {
            // Ignore if already exists (unlikely with timestamp)
        }

        // 2. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, { username, password });
        const token = loginRes.data.token;
        console.log('Login successful.');

        // 3. Send Message (Predict)
        console.log('Sending message: "I feel very anxious about work."');
        const predictRes = await axios.post(
            `${baseUrl}/predict`,
            { inputText: 'I feel very anxious about work.', modelName: 'llama-3.1-8b-instant' },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Prediction response mood:', predictRes.data.mood);
        if (!predictRes.data.mood) {
            console.error('FAILED: Mood not returned in prediction.');
        } else {
            console.log('PASSED: Mood detected.');
        }

        // 4. Fetch History
        console.log('Fetching history...');
        const historyRes = await axios.get(`${baseUrl}/history`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const history = historyRes.data.history;
        console.log('History length:', history.length);

        if (history.length >= 2) {
            console.log('PASSED: History saved and retrieved.');
            console.log('Last message mood:', history[history.length - 1].mood);
        } else {
            console.error('FAILED: History not saved correctly.');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testFeatures();

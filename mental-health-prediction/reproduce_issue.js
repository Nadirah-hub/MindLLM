import axios from 'axios';

async function testRegistration() {
    try {
        const response = await axios.post('http://localhost:5000/auth/register', {
            username: 'testuser_' + Date.now(),
            password: 'password123'
        });
        console.log('Registration success:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Registration failed with status:', error.response.status);
            console.log('Response data:', error.response.data);
        } else {
            console.log('Registration failed (no response):', error.message);
        }
    }
}

testRegistration();

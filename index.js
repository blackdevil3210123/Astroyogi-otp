const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

function base64urlEncode(str) {
    return Buffer.from(str).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function generateAstroyogiToken() {
    const header = { alg: "none", typ: "JWT" };
    const payload = {
        UserType: "TtaAppUser",
        EntityId: "29426901",
        SourceUserType: "TtaAppUser",
        SourceEntityId: "29426901",
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7776000
    };
    return base64urlEncode(JSON.stringify(header)) + '.' + 
           base64urlEncode(JSON.stringify(payload)) + '.';
}

function randomDeviceId() {
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(8);
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function sendAstroyogiVoiceOTP(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        throw new Error('Mobile number must be exactly 10 digits');
    }

    const url = 'https://comm.astroyogi.com/api/OtpComm/SendOtp';
    const headers = {
        'Host': 'comm.astroyogi.com',
        'authorization': `Bearer ${generateAstroyogiToken()}`,
        'versioncode': '579',
        'devicetype': 'Android',
        'content-type': 'application/json; charset=UTF-8',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/4.12.0'
    };

    const body = JSON.stringify({
        countryCode: 'IN',
        mobileNumber: cleanPhone,
        phoneCode: '91',
        phoneDeviceId: randomDeviceId(),
        platform: 'Android',
        requestType: 'call'
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    });

    const data = await response.json();
    return { status: response.status, data };
}

app.get('/', (req, res) => {
    res.json({
        message: 'Astroyogi Voice OTP Service',
        usage: '/send-otp?mobile=9876543210'
    });
});

app.get('/send-otp', async (req, res) => {
    const mobile = req.query.mobile;

    if (!mobile) {
        return res.status(400).json({
            error: 'Missing ?mobile parameter',
            example: '/send-otp?mobile=9876543210'
        });
    }

    try {
        const result = await sendAstroyogiVoiceOTP(mobile);
        res.json({
            success: result.status === 200,
            status: result.status,
            data: result.data
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

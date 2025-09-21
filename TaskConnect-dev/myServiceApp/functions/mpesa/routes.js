const express = require('express');
const router = express.Router();
const { initiateStkPush, handleStkCallback, initiateB2C, handleB2cResult, handleB2cTimeout, testB2CConfig, testB2CCredentials } = require('./escrowHandler');

router.post('/stkpush', initiateStkPush);
router.post('/callback', handleStkCallback);
router.post('/b2c', initiateB2C);
router.post('/b2c_result', handleB2cResult);
router.post('/b2c_timeout', handleB2cTimeout);
router.get('/test_b2c_config', testB2CConfig);
router.get('/test_b2c_credentials', testB2CCredentials);

module.exports = router;
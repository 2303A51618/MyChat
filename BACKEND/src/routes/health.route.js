import express from 'express';

const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

export default router;

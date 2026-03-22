const express = require('express');
const router = express.Router();
const API = require('../models/API');
const { analyzeAPI } = require('../services/classificationService');

// GET /api/apis — list with filters
router.get('/', async (req, res, next) => {
  try {
    const {
      status, isZombie, riskLevel, team, source,
      page = 1, limit = 50, search
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (isZombie !== undefined) query.isZombie = isZombie === 'true';
    if (riskLevel) query.riskLevel = riskLevel;
    if (team) query.team = team;
    if (source) query.source = source;
    if (search) {
      query.$or = [
        { endpoint: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { team: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await API.countDocuments(query);
    const apis = await API.find(query)
      .sort({ riskScore: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: apis, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/apis/zombies — all zombie APIs
router.get('/zombies', async (req, res, next) => {
  try {
    const zombies = await API.find({ isZombie: true }).sort({ riskScore: -1 });
    res.json({ success: true, data: zombies, count: zombies.length });
  } catch (err) { next(err); }
});

// GET /api/apis/:id
router.get('/:id', async (req, res, next) => {
  try {
    const api = await API.findById(req.params.id);
    if (!api) return res.status(404).json({ success: false, error: 'API not found' });
    res.json({ success: true, data: api });
  } catch (err) { next(err); }
});

// POST /api/apis — manually add API
router.post('/', async (req, res, next) => {
  try {
    const analysis = analyzeAPI(req.body);
    const api = await API.create({ ...req.body, ...analysis });
    res.status(201).json({ success: true, data: api });
  } catch (err) { next(err); }
});

// PATCH /api/apis/:id — update API (owner, status, etc.)
router.patch('/:id', async (req, res, next) => {
  try {
    const api = await API.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!api) return res.status(404).json({ success: false, error: 'API not found' });
    res.json({ success: true, data: api });
  } catch (err) { next(err); }
});

// POST /api/apis/:id/quarantine — auto-quarantine a zombie API
router.post('/:id/quarantine', async (req, res, next) => {
  try {
    const api = await API.findByIdAndUpdate(req.params.id, {
      status: 'quarantined',
      isActive: false,
      remediationStatus: 'in_progress'
    }, { new: true });
    if (!api) return res.status(404).json({ success: false, error: 'API not found' });
    res.json({ success: true, message: 'API quarantined successfully', data: api });
  } catch (err) { next(err); }
});

// POST /api/apis/:id/decommission — full decommission
router.post('/:id/decommission', async (req, res, next) => {
  try {
    const api = await API.findByIdAndUpdate(req.params.id, {
      status: 'quarantined',
      isActive: false,
      remediationStatus: 'resolved',
      jiraTicket: req.body.jiraTicket || null
    }, { new: true });
    if (!api) return res.status(404).json({ success: false, error: 'API not found' });
    res.json({ success: true, message: 'API decommissioned', data: api });
  } catch (err) { next(err); }
});

// POST /api/apis/:id/reanalyze
router.post('/:id/reanalyze', async (req, res, next) => {
  try {
    const api = await API.findById(req.params.id);
    if (!api) return res.status(404).json({ success: false, error: 'API not found' });

    const analysis = analyzeAPI(api.toObject());
    Object.assign(api, analysis);
    api.lastScanned = new Date();
    await api.save();

    res.json({ success: true, data: api });
  } catch (err) { next(err); }
});

// DELETE /api/apis/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await API.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'API deleted' });
  } catch (err) { next(err); }
});

module.exports = router;

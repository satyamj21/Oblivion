const express = require("express");
const router = express.Router();
const multer = require("multer");
const Scan = require("../models/Scan");
const { runScan } = require("../services/scannerService");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/scan/swagger — upload and parse Swagger file
router.post("/swagger", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });

    const content = req.file.buffer.toString("utf-8");
    const result = await runScan({
      type: "manual",
      source: "swagger",
      content,
      initiatedBy: "user",
    });

    res.json({ success: true, message: "Swagger scan complete", ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/scan/endpoints — paste a list of endpoints
router.post("/endpoints", async (req, res, next) => {
  try {
    const { endpoints } = req.body;
    if (!endpoints)
      return res
        .status(400)
        .json({ success: false, error: "No endpoints provided" });

    const result = await runScan({
      type: "manual",
      source: "manual",
      content: endpoints,
      initiatedBy: "user",
    });
    res.json({ success: true, message: "Endpoint scan complete", ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/scan/demo — load sample banking API dataset
router.post("/demo", async (req, res, next) => {
  try {
    const result = await runScan({
      type: "manual",
      source: "gateway",
      initiatedBy: "demo",
    });
    res.json({ success: true, message: "Demo data loaded", ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/scan/history — list past scans
router.get("/history", async (req, res, next) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: scans });
  } catch (err) {
    next(err);
  }
});

// GET /api/scan/:id — single scan result
router.get("/:id", async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ scanId: req.params.id });
    if (!scan)
      return res.status(404).json({ success: false, error: "Scan not found" });
    res.json({ success: true, data: scan });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

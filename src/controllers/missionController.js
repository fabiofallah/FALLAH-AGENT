const missionService = require('../services/missionService');

exports.createMission = async (req, res) => {
  try {
    const mission = await missionService.createMission(req.body);
    res.status(201).json({ success: true, mission });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.listMissions = async (req, res) => {
  try {
    const result = await missionService.listMissions({ paginated: true, page: req.query.page, limit: req.query.limit, search: req.query.search });
    res.json({ success: true, missions: result.items, pagination: result.pagination });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getMission = async (req, res) => {
  try {
    const mission = await missionService.loadMission(req.params.id);
    res.json({ success: true, mission });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

exports.updateMissionStatus = async (req, res) => {
  try {
    const { status, progress, errorMessage, logEntry, logs } = req.body;
    const mission = await missionService.updateMissionStatus(req.params.id, {
      status,
      progress,
      errorMessage,
      logEntry,
      logs,
    });
    res.json({ success: true, mission });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.editMission = async (req, res) => {
  try {
    const mission = await missionService.editMission(req.params.id, req.body);
    res.json({ success: true, mission });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteMission = async (req, res) => {
  try {
    await missionService.deleteMission(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

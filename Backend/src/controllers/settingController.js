const { Setting } = require("../models");

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    res.json({ success: true, settings: map });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: "key and value are required" });
    }

    const [setting, created] = await Setting.findOrCreate({
      where: { key },
      defaults: { key, value: String(value) },
    });

    if (!created) {
      await setting.update({ value: String(value) });
    }

    res.json({
      success: true,
      message: `Setting "${key}" updated`,
      setting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

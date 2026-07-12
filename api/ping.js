module.exports = (req, res) => {
  res.status(200).json({ status: 'ok', zero_config_native: true, time: Date.now() });
};

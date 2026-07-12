module.exports = (req, res) => {
  res.status(200).json({ status: 'ok', health: 'good', time: Date.now() });
};

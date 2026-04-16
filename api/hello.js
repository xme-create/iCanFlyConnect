// This exists to mimic the api/ folder structure
module.exports = (req, res) => {
  res.status(200).json({ message: "Hello from iCanFlyConnect API" });
};

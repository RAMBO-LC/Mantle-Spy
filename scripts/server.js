const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    status: "MantleSpy online",
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
  });
});

app.listen(3000, () => {
  console.log(
    "🚀 MantleSpy API running on port 3000"
  );
});
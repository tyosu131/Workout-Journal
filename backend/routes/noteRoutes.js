const express = require("express");
const { getNotes, saveNote } = require("../services/noteService");

const router = express.Router();

router.get("/:date", getNotes);
router.post("/:date", saveNote);

module.exports = router;

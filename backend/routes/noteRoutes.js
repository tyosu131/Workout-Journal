const express = require("express");

const router = express.Router();
const { getNotes, saveNote } = require("../services/noteService");

router.get("/:date", getNotes);
router.post("/:date", saveNote);


module.exports = router;

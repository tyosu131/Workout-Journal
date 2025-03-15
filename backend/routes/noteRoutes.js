// portfolio real\backend\routes\noteRoutes.js

const express = require("express");
const router = express.Router();
const { 
  getNotes, 
  saveNote,
  getAllTags,
  getNotesByTags,
} = require("../services/noteService");


router.get("/all-tags", getAllTags);
router.get("/by-tags", getNotesByTags);

router.get("/:date", getNotes);
router.post("/:date", saveNote);

module.exports = router;

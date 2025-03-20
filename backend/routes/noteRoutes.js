// portfolio real\backend\routes\noteRoutes.js

const express = require("express");
const router = express.Router();
const { 
  getNotes, 
  saveNote,
  getAllTags,
  getNotesByTags,
  createTag,
  deleteTag,
} = require("../services/noteService");

router.post("/tag", createTag);
router.delete("/tag/:tagName", deleteTag);

router.get("/all-tags", getAllTags);
router.get("/by-tags", getNotesByTags);

router.get("/:date", getNotes);
router.post("/:date", saveNote);

module.exports = router;

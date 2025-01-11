const express = require("express");

const router = express.Router();
const { getNotes, saveNote } = require("../services/noteService");

router.get("/:date", getNotes);
router.post("/:date", saveNote);
// データ取得処理
// router.get("/:date", (req, res) => {
//     const { date } = req.params;

//     // モックデータ（リクエストされた日付のデータを返す）
//     const mockData = {
//         date,
//         note: `This is a note for ${date}`,
//         exercises: Array.from({ length: 30 }).map(() => ({
//             exercise: "",
//             sets: Array.from({ length: 5 }).map(() => ({
//                 weight: "",
//                 reps: "",
//                 rest: "",
//             })),
//         })),
//     };

//     console.log(`Fetching notes for date: ${date}`);
//     res.status(200).json({ data: mockData });
// });

// データ保存処理
// router.post("/:date", (req, res) => {
//     const { date } = req.params;
//     const noteData = req.body;

//     console.log(`Saving note for date: ${date}`);
//     console.log("Received data:", noteData);

//     // 本来はDB保存の処理を記述
//     res.status(200).json({ message: "Note saved successfully" });
// });

module.exports = router;

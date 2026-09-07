const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["assignment", "exam"], default: "assignment" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["pending", "in-progress", "done"], default: "pending" },
    sharedWithViewers: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);

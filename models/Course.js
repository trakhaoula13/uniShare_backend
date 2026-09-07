const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    color: { type: String, default: "#6c63ff" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    sharedWithViewers: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);

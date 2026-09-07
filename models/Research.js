const mongoose = require("mongoose");

const researchSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    category: { type: String, enum: ["article", "thesis"], default: "article" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Research", researchSchema);

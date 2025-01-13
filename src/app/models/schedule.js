import mongoose from "mongoose";

const schema = new mongoose.Schema({
    name: String,
    code: { type: String, required: true },
    description: { type: String, required: true },
    capacity: { type: Number, default: 9999999 },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }
})

export default mongoose.models.Schedule || mongoose.model('Schedule', schema)
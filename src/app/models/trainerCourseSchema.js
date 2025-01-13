import mongoose from "mongoose";

const TrainerCourseSchema = new mongoose.Schema({
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "Trainer", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    costPerHour: { type: Number, required: true }, // Costo por hora para este curso específico
});

export default mongoose.models.TrainerCourse || mongoose.model("TrainerCourse", TrainerCourseSchema);
import mongoose from "mongoose";

const Course = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    description: { type: String },
    cost: { type: Number, required: true },
    numberOfClasses: Number,
    capacity: { type: Number, default: 999999 },
    duration: { type: Number, default: 1 }, // Duración en semanas o meses
    durationPerClass: { type: Number, default: 1 }, // Duración por clases en horas
    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trainer" }], // Referencia a entrenadores
})

export default mongoose.models.Course || mongoose.model("Course", Course);
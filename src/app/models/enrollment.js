import mongoose from "mongoose";

const Enrollment = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "expired"], required: true },
    renewalCount: { type: Number, default: 0 }, // Número de veces que se ha renovado
    cost: { type: Number, required: true }, // Calculado según el curso,
    amountPaid: { type: Number },
    remainingAmount: { type: Number },
});

export default mongoose.models.Enrollment || mongoose.model("Enrollment", Enrollment);

import mongoose from "mongoose";

const Student = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    dni: { type: String, sparse: true },
    phone: { type: String },
    birthDate: { type: Date },
    age: { type: Number },
    isMinor: { type: Boolean, default: false }, // Determina si el estudiante es menor de edad
    email: { type: String },
    guardian: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Student", 
        required: function() { return this.isMinor; }, // Es obligatorio solo si es menor de edad
    }
})

export default mongoose.models.Student || mongoose.model('Student', Student)
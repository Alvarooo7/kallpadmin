import mongoose from "mongoose";

const schema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    code: { type: String, unique: true , required: true },
    description: String,
    email: { type: String, sparse: true},
    phone: { type: String, unique: true, required: true }
})

export default mongoose.models.Trainer || mongoose.model('Trainer', schema)
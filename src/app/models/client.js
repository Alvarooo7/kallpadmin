import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: true }
});

export default mongoose.models.Client || mongoose.model("Client", ClientSchema);
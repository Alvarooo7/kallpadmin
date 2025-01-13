import mongoose from "mongoose";
const USER = process.env.USER
const PASS = process.env.PASS
const DBURI = process.env.DBURI

export async function connectDB() {
    const uri = `mongodb+srv://${USER}:${PASS}@${DBURI}`;
    await mongoose.connect(uri)
}
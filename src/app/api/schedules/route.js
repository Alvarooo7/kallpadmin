const { connectDB } = require("@/app/libs/mongodb");
import Schedule from "@/app/models/schedule";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB();
    const schedule = await Schedule.find();
    return NextResponse.json(schedule)
}

export async function POST(request) {
    await connectDB();
    const data = await request.json()
    const schedule = Schedule.create(data);
    return NextResponse.json(schedule)
}
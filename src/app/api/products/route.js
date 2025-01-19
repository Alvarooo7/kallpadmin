const { connectDB } = require("@/app/libs/mongodb");
import Product from "@/app/models/product";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB();
    const product = await Product.find();
    return NextResponse.json(product)
}

export async function POST(request) {
    await connectDB();
    const data = await request.json()
    const product = Product.create(data);
    return NextResponse.json(product)
}
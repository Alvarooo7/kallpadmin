import { NextResponse } from 'next/server';
import { connectDB } from '@/app/libs/mongodb';
import transaction from '@/app/models/transaction';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(timezone);
dayjs.tz.setDefault("America/Lima");

export async function getFilteredTransactions(req) {
    console.log("== GET FILTERED TRANSACTIONS");
    const { searchParams } = req.nextUrl;

    const clientId = searchParams.get("clientId");
    if (!clientId) {
        return NextResponse.json({ error: "clientId es requerido" }, { status: 400 });
    }

    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = parseInt(searchParams.get("offset")) || 0;
    const order = searchParams.get("order") || "desc";
    const searchAction = searchParams.get("action") || "";
    const searchType = searchParams.get("type") || "";
    const searchDescription = searchParams.get("description") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const sortOrder = order === "asc" ? 1 : -1;

    const query = { client_id: clientId };
    if (searchAction) query.action = searchAction;
    if (searchType) query.type = searchType;
    if (searchDescription) query.description = { $regex: searchDescription, $options: "i" };

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = dayjs(startDate).startOf("day").toDate();
        if (endDate) query.date.$lte = dayjs(endDate).endOf("day").toDate();
    }

    await connectDB();

    console.log("== QUERY", JSON.stringify(query));

    const totalItems = await transaction.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const transactions = await transaction.find(query)
        .sort({ createdAt: sortOrder })
        .skip(offset)
        .limit(limit);

    return NextResponse.json({
        data: transactions,
        pagination: {
            totalItems,
            limit,
            offset,
            totalPages,
            currentPage: Math.floor(offset / limit) + 1,
        },
    });
}

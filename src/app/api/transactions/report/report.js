import { NextResponse } from 'next/server';
import { connectDB } from '@/app/libs/mongodb';
import transaction from '@/app/models/transaction';

export async function generateReport(request) {
    console.log("== GENERATE REPORT");
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = parseInt(searchParams.get("offset")) || 0;
    const groupBy = searchParams.get("groupBy") || "daily"; // 'daily', 'weekly', 'monthly', 'yearly'
    const includeDetails = searchParams.get("details") === "true"; // Include transaction details
    const includeBalance = searchParams.get("balance") === "true"; // Include balance report
    const clientId = searchParams.get("clientId");

    if (!clientId) {
        return NextResponse.json(
          { message: 'El campo clientId es obligatorio.' },
          { status: 400 }
        );
    }

    // Establecer zona horaria para Perú (UTC-5)
    const peruTimezoneOffset = -5 * 60 * 60 * 1000;

    let startOfPeriod, endOfPeriod;
    if (!startDate && !endDate) {
        const today = new Date(new Date().getTime() );
        today.setUTCHours(0, 0, 0, 0);
        startOfPeriod = new Date(today);

        const end = new Date(today);
        end.setUTCHours(23, 59, 59, 999);
        endOfPeriod = new Date(end);
    } else {
        startOfPeriod = startDate ? new Date(new Date(startDate).getTime()) : null;
        endOfPeriod = endDate ? new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) : null;
    }

    const dateFilter = {};
    if (startOfPeriod) dateFilter.$gte = startOfPeriod;
    if (endOfPeriod) dateFilter.$lte = endOfPeriod;

    const query = {
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(clientId && { client_id: clientId })
    };

    console.log("== QUERY", JSON.stringify(query));

    await connectDB();

    const periodGrouping = {
        daily: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        weekly: { $dateToString: { format: "%Y-%U", date: "$date" } },
        monthly: { $dateToString: { format: "%Y-%m", date: "$date" } },
        yearly: { $dateToString: { format: "%Y", date: "$date" } },
        monthly_custom: {
            $concat: [
                {
                    $dateToString: {
                        format: "%Y-%m",
                        date: {
                            $cond: [
                                { $lt: [{ $dayOfMonth: "$date" }, 15] },
                                { $dateSubtract: { startDate: "$date", unit: "month", amount: 1 } },
                                "$date"
                            ]
                        }
                    }
                }
            ]
        }
    };     

    const report = await transaction.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    period: periodGrouping[groupBy] || periodGrouping.daily,
                    action: "$action",
                    client_id: "$client_id",
                },
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.period": -1 } },
    ]);    

    console.log("== REPORT", JSON.stringify(report));

    let balanceReport = [];
    if (includeBalance) {
        const balanceMap = {};
        report.forEach(({ _id, totalAmount }) => {
            const period = _id.period;
            const action = _id.action;
            const client = _id.client_id; // Agregar clientId al balance

            if (!balanceMap[client]) {
                balanceMap[client] = {};
            }
            if (!balanceMap[client][period]) {
                balanceMap[client][period] = { income: 0, expense: 0, balance: 0 };
            }

            if (action === "INCOME") {
                balanceMap[client][period].income += totalAmount;
            } else if (action === "EXPENSE") {
                balanceMap[client][period].expense += totalAmount;
            }
        });

        balanceReport = Object.entries(balanceMap).flatMap(([clientId, periods]) =>
            Object.entries(periods).map(([period, { income, expense }]) => ({
                clientId,
                period,
                income,
                expense,
                balance: income - expense,
            }))
        );
    }

    let transactions = [];
    if (includeDetails) {
        transactions = await transaction
            .find(query)
            .skip(offset)
            .limit(limit)
            .sort({ date: -1 });
    }

    const totalTransactions = await transaction.countDocuments(query);

    return NextResponse.json(
        { totalTransactions, report, balanceReport, transactions },
        { status: 200 }
    );
}

